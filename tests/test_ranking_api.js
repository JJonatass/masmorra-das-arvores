// Testa a função /api/ranking com um Blob falso em memória.
const api = require('../api/ranking.js');
function memStore(){ const m = new Map(); let t = 0;
  return { m,
    async list({ prefix, limit = 1000, cursor }){ const all = [...m.values()].filter(b => b.pathname.startsWith(prefix)).sort((a,b)=>a.pathname<b.pathname?-1:1); const s = cursor ? +cursor : 0; const page = all.slice(s, s + limit); return { blobs: page, hasMore: s + limit < all.length, cursor: String(s + limit) }; },
    async put(name, body){ m.set(name, { pathname: name, url: 'https://blob/' + name, uploadedAt: new Date(1e12 + (t++) * 1000).toISOString() }); return { url: 'https://blob/' + name }; },
    async del(urls){ for (const u of [].concat(urls)) for (const [k, v] of m) if (v.url === u) m.delete(k); } }; }
function call(h, method, url, body){ return new Promise(res => { const r = { headers:{}, statusCode:0, setHeader(k,v){ this.headers[k]=v; }, end(s){ res({ status: this.statusCode, body: s ? JSON.parse(s) : null, headers: this.headers }); } }; h({ method, url, body }, r); }); }
let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('FALHA', m); } };
(async () => {
  const st = memStore(), h = api.makeHandler(st);
  let r = await call(h, 'GET', '/api/ranking'); ok(r.status === 200 && r.body.top.length === 0, 'vazio');
  ok(r.headers['Access-Control-Allow-Origin'] === '*', 'CORS');
  const ids = []; for (let i = 0; i < 14; i++) ids.push('jogador' + String(i).padStart(4, '0'));
  for (let i = 0; i < 14; i++) { r = await call(h, 'POST', '/api/ranking', { id: ids[i], tag: 'p' + i, queda: i * 100, heroi: i * 10 }); ok(r.status === 200, 'post ' + i); }
  r = await call(h, 'GET', '/api/ranking?id=' + ids[0]);
  ok(r.body.top.length === 10 && r.body.players === 14, 'top 10 de 14');
  ok(r.body.top[0].tag === 'P13' && r.body.top[0].total === 1430 && r.body.top[0].queda === 1300 && r.body.top[0].heroi === 130, 'primeiro');
  ok(r.body.top.every((x, i, a) => i === 0 || a[i - 1].total >= x.total), 'ordenado');
  ok(r.body.me.pos === 14 && r.body.top.every(x => !x.me), 'posição do jogador fora do top');
  // melhor de cada jogo se mantém
  r = await call(h, 'POST', '/api/ranking', { id: ids[13], tag: 'zeca!', queda: 5, heroi: 900 });
  const me = r.body.me; ok(me.queda === 1300 && me.heroi === 900 && me.tag === 'ZEC' && me.total === 2200, 'mantém o melhor e soma');
  ok([...st.m.keys()].filter(k => k.includes(ids[13])).length === 1, 'um arquivo por jogador');
  ok(r.body.top[0].me === true, 'marca o próprio jogador');
  // validações
  r = await call(h, 'POST', '/api/ranking', { id: 'x', tag: 'AAA', queda: 1 }); ok(r.status === 400, 'id inválido');
  r = await call(h, 'POST', '/api/ranking', { id: ids[1], tag: '***', queda: 1 }); ok(r.status === 400, 'nome vazio');
  r = await call(h, 'POST', '/api/ranking', { id: ids[2], tag: 'Ação', queda: 9e12, heroi: -5 }); ok(r.body.me.tag === 'ACA' && r.body.me.queda === 2000000 && r.body.me.heroi === 20, 'limpa nome e limita pontos');
  r = await call(h, 'POST', '/api/ranking', JSON.stringify({ id: ids[3], tag: 'TXT', queda: 1 })); ok(r.status === 200, 'corpo em texto');
  r = await call(h, 'DELETE', '/api/ranking'); ok(r.status === 405, 'método');
  r = await call(h, 'OPTIONS', '/api/ranking'); ok(r.status === 204, 'preflight');
  ok(api._test.cleanTag('joão-1234') === 'JOA', 'nome com acento e 3 letras');

  // ---------- quadros por jogo ----------
  const B = '/api/ranking?board=';
  r = await call(h, 'GET', B + 'huffman'); ok(r.status === 200 && r.body.board === 'huffman' && r.body.top.length === 0, 'quadro vazio');
  r = await call(h, 'GET', B + 'xadrez'); ok(r.status === 400, 'quadro desconhecido');
  r = await call(h, 'GET', '/api/ranking'); ok(r.body.top.length === 10 && !r.body.board, 'geral não mistura com quadros');
  // tempo por letra: menor média vence, mesmo com tempo total maior
  r = await call(h, 'POST', '/api/ranking', { board: 'huffman', id: ids[0], tag: 'ana', ms: 20000, n: 16, errs: 1, hints: 0 });
  ok(r.status === 200 && r.body.me.v === 1250 && r.body.me.tag === 'ANA' && r.body.improved, 'grava média por letra');
  r = await call(h, 'POST', '/api/ranking', { board: 'huffman', id: ids[1], tag: 'bia', ms: 24000, n: 20 });
  ok(r.body.top[0].tag === 'BIA' && r.body.top[0].v === 1200 && r.body.top[1].tag === 'ANA', 'ordena pela média');
  r = await call(h, 'POST', '/api/ranking', { board: 'huffman', id: ids[0], tag: 'ana', ms: 30000, n: 16 });
  ok(r.body.me.v === 1250 && r.body.improved === false, 'mantém o melhor do mesmo nome');
  r = await call(h, 'POST', '/api/ranking', { board: 'huffman', id: ids[0], tag: 'edu', ms: 19000, n: 20 });
  ok(r.body.top[0].tag === 'EDU' && r.body.top.length === 3, 'mesmo aparelho, outro nome = outra linha');
  r = await call(h, 'GET', B + 'huffman&id=' + ids[0] + '&tag=ANA'); ok(r.body.me && r.body.me.tag === 'ANA' && r.body.me.pos === 3, 'posição de um nome');
  r = await call(h, 'POST', '/api/ranking', { board: 'huffman', id: ids[2], tag: 'x', ms: 500, n: 16 }); ok(r.status === 400, 'tempo implausível');
  r = await call(h, 'POST', '/api/ranking', { board: 'huffman', id: ids[2], tag: 'x', ms: 5000, n: 3 }); ok(r.status === 400, 'letras implausíveis');
  // mercado: tempo total
  r = await call(h, 'POST', '/api/ranking', { board: 'splay', id: ids[3], tag: 'kai', ms: 61000, n: 11, errs: 2, hints: 1 }); ok(r.body.me.v === 61000 && r.body.me.errs === 2, 'mercado em tempo total');
  r = await call(h, 'POST', '/api/ranking', { board: 'splay', id: ids[3], tag: 'kai', ms: 61000, n: 12 }); ok(r.status === 400, 'mercado tem 11 fregueses');
  // arena: acertos, desempate pelo tempo
  r = await call(h, 'POST', '/api/ranking', { board: 'arena', id: ids[4], tag: 'lia', hits: 12, ms: 150000, n: 15 });
  r = await call(h, 'POST', '/api/ranking', { board: 'arena', id: ids[5], tag: 'mel', hits: 12, ms: 120000, n: 15 });
  r = await call(h, 'POST', '/api/ranking', { board: 'arena', id: ids[6], tag: 'gui', hits: 13, ms: 300000, n: 15 });
  ok(r.body.top.map(x => x.tag).join() === 'GUI,MEL,LIA' && r.body.top[0].hits === 13, 'acertos e desempate por tempo');
  r = await call(h, 'POST', '/api/ranking', { board: 'arena', id: ids[5], tag: 'mel', hits: 12, ms: 110000, n: 15 }); ok(r.body.me.ms === 110000 && r.body.improved, 'melhora o desempate');
  r = await call(h, 'POST', '/api/ranking', { board: 'arena', id: ids[5], tag: 'mel', hits: 11, ms: 50000, n: 15 }); ok(r.body.me.hits === 12 && r.body.me.ms === 110000, 'menos acertos não troca');
  r = await call(h, 'POST', '/api/ranking', { board: 'arena', id: ids[6], tag: 'gui', hits: 16, ms: 50000, n: 15 }); ok(r.status === 400, 'acertos acima do total');
  let many = 0; for (let i = 0; i < 12; i++) { r = await call(h, 'POST', '/api/ranking', { board: 'trie', id: ids[i], tag: 'p' + i, ms: 30000 + i * 1000, n: 40 }); many += r.status === 200; }
  ok(many === 12 && r.body.top.length === 10 && r.body.players === 12 && r.body.me.pos === 12, 'top 10 e posição fora dele');
  ok([...st.m.keys()].filter(k => k.startsWith('b1/arena/' + ids[5])).length === 1, 'um arquivo por jogador e nome');
  console.log(n + ' verificações, ' + f + ' falhas'); process.exit(f ? 1 : 0);
})();
