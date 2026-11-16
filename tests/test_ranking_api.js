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
  const me = r.body.me; ok(me.queda === 1300 && me.heroi === 900 && me.tag === 'ZECA' && me.total === 2200, 'mantém o melhor e soma');
  ok([...st.m.keys()].filter(k => k.includes(ids[13])).length === 1, 'um arquivo por jogador');
  ok(r.body.top[0].me === true, 'marca o próprio jogador');
  // validações
  r = await call(h, 'POST', '/api/ranking', { id: 'x', tag: 'AAA', queda: 1 }); ok(r.status === 400, 'id inválido');
  r = await call(h, 'POST', '/api/ranking', { id: ids[1], tag: '***', queda: 1 }); ok(r.status === 400, 'nome vazio');
  r = await call(h, 'POST', '/api/ranking', { id: ids[2], tag: 'Ação', queda: 9e12, heroi: -5 }); ok(r.body.me.tag === 'ACAO' && r.body.me.queda === 2000000 && r.body.me.heroi === 20, 'limpa nome e limita pontos');
  r = await call(h, 'POST', '/api/ranking', JSON.stringify({ id: ids[3], tag: 'TXT', queda: 1 })); ok(r.status === 200, 'corpo em texto');
  r = await call(h, 'DELETE', '/api/ranking'); ok(r.status === 405, 'método');
  r = await call(h, 'OPTIONS', '/api/ranking'); ok(r.status === 204, 'preflight');
  ok(api._test.cleanTag('joão-1234') === 'JOAO1', 'nome com acento e 5 letras');
  console.log(n + ' verificações, ' + f + ' falhas'); process.exit(f ? 1 : 0);
})();
