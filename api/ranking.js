/* Ranking da Masmorra das Árvores (função da Vercel + Vercel Blob).
 *
 * Cada jogador é um arquivo minúsculo no Blob, e a pontuação vai no próprio nome do arquivo:
 *   r1/<id do jogador>/<queda>_<heroi>_<NOME>.txt
 * Assim o ranking inteiro sai de uma única listagem, sem baixar arquivo nenhum,
 * e jogadores diferentes nunca escrevem no mesmo arquivo ao mesmo tempo.
 *
 * GET  /api/ranking?id=<id>  -> { ok, top: [{pos, tag, queda, heroi, total, me}], players, me }
 * POST /api/ranking          -> body { id, tag, queda, heroi } ; guarda o melhor de cada jogo
 */
'use strict';

const PREFIX = 'r1/';
const MAX_QUEDA = 2000000;   // tetos de plausibilidade
const MAX_HEROI = 200000;

function cleanTag(t) {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
}
function cleanId(id) { const s = String(id || ''); return /^[a-z0-9]{8,32}$/.test(s) ? s : null; }
function cleanScore(v, max) { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; }

function parse(pathname) {
  const m = /^r1\/([a-z0-9]{8,32})\/(\d+)_(\d+)_([A-Z0-9]{1,5})\.txt$/.exec(pathname);
  if (!m) return null;
  const queda = +m[2], heroi = +m[3];
  return { id: m[1], queda, heroi, total: queda + heroi, tag: m[4] };
}

async function listAll(store) {
  const out = []; let cursor;
  for (let page = 0; page < 10; page++) {
    const r = await store.list({ prefix: PREFIX, limit: 1000, cursor });
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

function makeHandler(store) {
  return async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (req.method === 'GET') {
        const url = new URL(req.url, 'http://x');
        const data = await getRanking(store, cleanId(url.searchParams.get('id')));
        res.statusCode = 200; return res.end(JSON.stringify(data));
      }
      if (req.method === 'POST') {
        const r = await submit(store, await readBody(req));
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
module.exports._test = { parse, rank, cleanTag, getRanking, submit };
