const T = require('../src/trie.js');
let seed = 3; T.setRandom(() => { let a = seed += 0x6D2B79F5; a = Math.imul(a ^ a >>> 15, a | 1); a ^= a + Math.imul(a ^ a >>> 7, a | 61); return ((a ^ a >>> 14) >>> 0) / 4294967296; });
let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) { f++; if (f < 10) console.log('FALHA', m); } };
let withPrefixCase = 0, classes = { sim: 0, prefixo: 0, nao: 0 };
for (let s = 0; s < 3000; s++) {
  const r = T.round(); ok(r.words.length >= 6 && new Set(r.words).size === r.words.length, 'palavras distintas');
  const root = T.newTrie(); let created = 0, typed = 0;
  for (const w of r.words) {
    let node = root;
    for (let i = 0; i <= w.length; i++) {
      const a = T.action(node, w, i);
      if (a === 'fim') { ok(i === w.length, 'fim só no final'); node.end = true; break; }
      typed++;
      if (a === 'cavar') { ok(!node.kids[w[i]], 'cavar só sem filho'); T.dig(node, w[i]); created++; }   // cria filho w[i]
      node = node.kids[w[i]]; ok(node && node.ch === w[i], 'desce');
    }
  }
  ok(T.words(root).sort().join() === r.words.slice().sort().join(), 'trie guarda exatamente as palavras');
  ok(T.size(root) === created && created < typed, 'economia de salas');
  // caso prefixo: alguma palavra curta inserida depois de uma longa que a contém
  if (r.words.some((w, i) => r.words.slice(0, i).some(v => v.length > w.length && v.startsWith(w)))) withPrefixCase++;
  // busca: referência independente com conjuntos
  const set = new Set(r.words), pre = new Set(); r.words.forEach(w => { for (let i = 1; i <= w.length; i++) pre.add(w.slice(0, i)); });
  const qs = T.queries(root, r.words, r.families);
  ok(qs.length === 6, 'seis perguntas');
  qs.forEach(q => { const ref = set.has(q.q) ? 'sim' : pre.has(q.q) ? 'prefixo' : 'nao'; ok(q.a === ref, 'classificação ' + q.q); classes[q.a]++; });
  const o = T.oracle(root); const ref = r.words.filter(w => w.startsWith(o.prefix)).sort();
  ok(o.answer.slice().sort().join() === ref.join() && ref.length >= 2, 'oráculo ' + o.prefix);
}
console.log('rodadas com palavra-prefixo:', withPrefixCase, '/ 3000 · classes:', JSON.stringify(classes));
console.log(n + ' verificações, ' + f + ' falhas');
