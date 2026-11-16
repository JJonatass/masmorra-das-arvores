// Servidor local com a função real de /api/ranking e um Blob falso em memória (para testes de ponta a ponta).
const http = require('http'), api = require('../api/ranking.js');
const m = new Map(); let t = 0;
const store = {
  async list({ prefix, limit = 1000, cursor }){ const all = [...m.values()].filter(b => b.pathname.startsWith(prefix)); const s = cursor ? +cursor : 0; return { blobs: all.slice(s, s + limit), hasMore: s + limit < all.length, cursor: String(s + limit) }; },
  async put(name){ m.set(name, { pathname: name, url: 'mem://' + name, uploadedAt: new Date(1e12 + (t++) * 1000).toISOString() }); },
  async del(urls){ for (const u of [].concat(urls)) for (const [k, v] of m) if (v.url === u) m.delete(k); }
};
const h = api.makeHandler(store);
http.createServer((req, res) => h(req, res)).listen(+process.argv[2] || 8899, '127.0.0.1', () => console.log('ok'));
