/* Ranking da Masmorra das Árvores (função da Vercel + Vercel Blob).
 *
 * Cada jogador é um arquivo minúsculo no Blob, e a pontuação vai no próprio nome do arquivo:
 *   r1/<id do jogador>/<queda>_<heroi>_<NOME>.txt
 * Assim o ranking inteiro sai de uma única listagem, sem baixar arquivo nenhum,
 * e jogadores diferentes nunca escrevem no mesmo arquivo ao mesmo tempo.
 *
 * GET  /api/ranking?id=<id>  -> { ok, top: [{pos, tag, queda, heroi, total, me}], players, me }
 * POST /api/ranking          -> body { id, tag, queda, heroi } ; guarda o melhor de cada jogo
 *
 * Quadros por jogo (?board=huffman|trie|splay|arena), um arquivo por jogador e nome:
 *   b1/<quadro>/<id>/<NOME>/<a>_<b>_<c>_<d>_<e>.txt
 *   tempo (huffman, trie, splay): a = valor ranqueado em ms (média por letra ou tempo total),
 *                                 b = tempo total em ms, c = letras ou fregueses, d = erros, e = dicas
 *   arena:                        a = acertos, b = tempo total de resposta em ms, c = perguntas, d = e = 0
 * GET  /api/ranking?board=<q>&id=<id>&tag=<NOME> -> { ok, board, top: [...], players, me }
 * POST /api/ranking  body { board, id, tag, ms, n, errs, hints } ou { board:'arena', id, tag, hits, ms, n }
 */
'use strict';

const PREFIX = 'r1/';
const MAX_QUEDA = 2000000;   // tetos de plausibilidade
const MAX_HEROI = 200000;

function cleanTag(t) {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
}
function cleanId(id) { const s = String(id || ''); return /^[a-z0-9]{8,32}$/.test(s) ? s : null; }
function cleanScore(v, max) { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; }

function parse(pathname) {
  const m = /^r1\/([a-z0-9]{8,32})\/(\d+)_(\d+)_([A-Z0-9]{1,5})\.txt$/.exec(pathname);
  if (!m) return null;
  const queda = +m[2], heroi = +m[3];
  return { id: m[1], queda, heroi, total: queda + heroi, tag: m[4].slice(0, 3) };   // nomes antigos tinham até 5
}

async function listAll(store, prefix) {
  const out = []; let cursor;
  for (let page = 0; page < 10; page++) {
    const r = await store.list({ prefix: prefix || PREFIX, limit: 1000, cursor });
    out.push(...r.blobs);
    if (!r.hasMore) break;
    cursor = r.cursor;
  }
  return out;
}

/* melhor registro por jogador, ordenado */
function rank(blobs) {
  const best = new Map();
  for (const b of blobs) {
    const p = parse(b.pathname); if (!p) continue;
    p.at = new Date(b.uploadedAt || 0).getTime();
    const cur = best.get(p.id);
    if (!cur || p.total > cur.total || (p.total === cur.total && p.at > cur.at)) best.set(p.id, p);
  }
  return [...best.values()].sort((a, b) => b.total - a.total || a.at - b.at);
}

async function getRanking(store, meId) {
  const all = rank(await listAll(store));
  const top = all.slice(0, 10).map((p, i) => ({ pos: i + 1, tag: p.tag, queda: p.queda, heroi: p.heroi, total: p.total, me: p.id === meId }));
  let me = null;
  if (meId) { const i = all.findIndex(p => p.id === meId); if (i >= 0) me = { pos: i + 1, tag: all[i].tag, queda: all[i].queda, heroi: all[i].heroi, total: all[i].total }; }
  return { ok: true, top, players: all.length, me };
}

async function submit(store, body) {
  const id = cleanId(body && body.id), tag = cleanTag(body && body.tag);
  if (!id) return { status: 400, data: { ok: false, error: 'id inválido' } };
  if (!tag) return { status: 400, data: { ok: false, error: 'nome vazio' } };
  const prev = (await store.list({ prefix: PREFIX + id + '/', limit: 100 })).blobs;
  let queda = cleanScore(body.queda, MAX_QUEDA), heroi = cleanScore(body.heroi, MAX_HEROI);
  for (const b of prev) { const p = parse(b.pathname); if (p) { queda = Math.max(queda, p.queda); heroi = Math.max(heroi, p.heroi); } }
  const name = `${PREFIX}${id}/${queda}_${heroi}_${tag}.txt`;
  const keep = prev.find(b => b.pathname === name);
  if (!keep) await store.put(name, String(queda + heroi), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'text/plain' });
  const old = prev.filter(b => b.pathname !== name).map(b => b.url);
  if (old.length) await store.del(old);
  return { status: 200, data: await getRanking(store, id) };
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}

/* ---------------- quadros por jogo ---------------- */
const BOARDS = {
  huffman: { kind: 'time', per: true, minN: 14, maxN: 40 },
  trie:    { kind: 'time', per: true, minN: 10, maxN: 120 },
  splay:   { kind: 'time', per: false, minN: 11, maxN: 11 },
  arena:   { kind: 'hits', minN: 15, maxN: 15 }
};
const MAX_MS = 2 * 3600 * 1000;
function cleanInt(v, lo, hi) { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; }
function parseB(pathname) {
  const m = /^b1\/([a-z]+)\/([a-z0-9]{8,32})\/([A-Z0-9]{1,3})\/(\d+)_(\d+)_(\d+)_(\d+)_(\d+)\.txt$/.exec(pathname);
  if (!m || !BOARDS[m[1]]) return null;
  return { board: m[1], id: m[2], tag: m[3], a: +m[4], ms: +m[5], n: +m[6], errs: +m[7], hints: +m[8] };
}
/* negativo: x vem antes de y */
function cmpB(cfg, x, y) {
  if (cfg.kind === 'hits') return y.a - x.a || x.ms - y.ms || x.at - y.at;
  return x.a - y.a || x.ms - y.ms || x.at - y.at;
}
function rankB(cfg, blobs) {
  const best = new Map();
  for (const b of blobs) {
    const p = parseB(b.pathname); if (!p) continue;
    p.at = new Date(b.uploadedAt || 0).getTime();
    const k = p.id + '/' + p.tag, cur = best.get(k);
    if (!cur || cmpB(cfg, p, cur) < 0) best.set(k, p);
  }
  return [...best.values()].sort((x, y) => cmpB(cfg, x, y));
}
function rowB(cfg, p, i, meId, meTag) {
  const r = { pos: i + 1, tag: p.tag, ms: p.ms, n: p.n, errs: p.errs, hints: p.hints, me: p.id === meId && (!meTag || p.tag === meTag) };
  if (cfg.kind === 'hits') r.hits = p.a; else r.v = p.a;
  return r;
}
async function getBoard(store, board, meId, meTag) {
  const cfg = BOARDS[board];
  const all = rankB(cfg, await listAll(store, 'b1/' + board + '/'));
  const top = all.slice(0, 10).map((p, i) => rowB(cfg, p, i, meId, meTag));
  let me = null;
  if (meId) { const i = all.findIndex(p => p.id === meId && (!meTag || p.tag === meTag)); if (i >= 0) me = rowB(cfg, all[i], i, meId, meTag); }
  return { ok: true, board, top, players: all.length, me };
}
async function submitB(store, board, body) {
  const cfg = BOARDS[board];
  const id = cleanId(body && body.id), tag = cleanTag(body && body.tag);
  if (!id) return { status: 400, data: { ok: false, error: 'id inválido' } };
  if (!tag) return { status: 400, data: { ok: false, error: 'nome vazio' } };
  const n = cleanInt(body.n, cfg.minN, cfg.maxN), ms = cleanInt(body.ms, 1000, MAX_MS);
  if (n === null || ms === null) return { status: 400, data: { ok: false, error: 'resultado inválido' } };
  let rec;
  if (cfg.kind === 'hits') {
    const hits = cleanInt(body.hits, 0, n); if (hits === null) return { status: 400, data: { ok: false, error: 'resultado inválido' } };
    rec = { a: hits, ms, n, errs: n - hits, hints: 0 };
  } else {
    const errs = cleanInt(body.errs, 0, 999) || 0, hints = cleanInt(body.hints, 0, 999) || 0;
    rec = { a: cfg.per ? Math.round(ms / n) : ms, ms, n, errs, hints };
  }
  rec.at = Date.now();
  const dir = 'b1/' + board + '/' + id + '/' + tag + '/';
  const prev = (await store.list({ prefix: dir, limit: 100 })).blobs;
  let best = rec;
  for (const b of prev) { const p = parseB(b.pathname); if (p) { p.at = new Date(b.uploadedAt || 0).getTime(); if (cmpB(cfg, p, best) <= 0) best = p; } }
  const name = `${dir}${best.a}_${best.ms}_${best.n}_${best.errs}_${best.hints}.txt`;
  if (!prev.some(b => b.pathname === name)) await store.put(name, '1', { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'text/plain' });
  const old = prev.filter(b => b.pathname !== name).map(b => b.url);
  if (old.length) await store.del(old);
  const data = await getBoard(store, board, id, tag);
  data.improved = best === rec;
  return { status: 200, data };
}

function makeHandler(store) {
  return async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method === 'GET') {
        const url = new URL(req.url, 'http://x'), board = url.searchParams.get('board');
        if (board && board !== 'geral') {
          if (!BOARDS[board]) { res.statusCode = 400; return res.end(JSON.stringify({ ok: false, error: 'quadro desconhecido' })); }
          const d = await getBoard(store, board, cleanId(url.searchParams.get('id')), cleanTag(url.searchParams.get('tag')) || null);
          res.statusCode = 200; return res.end(JSON.stringify(d));
        }
        const data = await getRanking(store, cleanId(url.searchParams.get('id')));
        res.statusCode = 200; return res.end(JSON.stringify(data));
      }
      if (req.method === 'POST') {
        const body = await readBody(req), board = body && body.board;
        if (board && board !== 'geral' && !BOARDS[board]) { res.statusCode = 400; return res.end(JSON.stringify({ ok: false, error: 'quadro desconhecido' })); }
        const r = board && board !== 'geral' ? await submitB(store, board, body) : await submit(store, body);
        res.statusCode = r.status; return res.end(JSON.stringify(r.data));
      }
      res.statusCode = 405; return res.end(JSON.stringify({ ok: false, error: 'método não permitido' }));
    } catch (e) {
      console.error('ranking:', e);
      res.statusCode = 500; return res.end(JSON.stringify({ ok: false, error: 'falha no armazenamento' }));
    }
  };
}

let blobStore = null;
function realStore() {
  if (!blobStore) { const b = require('@vercel/blob'); blobStore = { list: b.list, put: b.put, del: b.del }; }
  return blobStore;
}

module.exports = (req, res) => makeHandler(realStore())(req, res);
module.exports.makeHandler = makeHandler;
module.exports._test = { parse, rank, cleanTag, getRanking, submit, parseB, rankB, getBoard, submitB, BOARDS };
