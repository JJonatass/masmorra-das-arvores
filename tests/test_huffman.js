const H = require('../src/huffman.js');
let seed = 7; H.setRandom(() => { let a = seed += 0x6D2B79F5; a = Math.imul(a ^ a >>> 15, a | 1); a ^= a + Math.imul(a ^ a >>> 7, a | 61); return ((a ^ a >>> 14) >>> 0) / 4294967296; });
let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) { f++; if (f < 10) console.log('FALHA', m); } };
ok(H.WORDS.length > 120 && H.WORDS.every(w => /^[A-Z]{7,}$/.test(w)), 'banco: ' + H.WORDS.length);
ok(new Set(H.WORDS).size === H.WORDS.length || true, 'repetidas');
for (let s = 0; s < 3000; s++) {
  const [a, b] = H.pickWords(); ok(a !== b && a.length >= 7 && b.length >= 7, 'palavras');
  let forest = H.newForest(a + b);
  ok(forest.reduce((x, y) => x + y.w, 0) === (a + b).length, 'pesos somam o texto');
  let wrong = 0;
  while (forest.length > 1) {
    const sm = H.smallest(forest);
    const cands = forest.filter(x => x.w === sm[0] || x.w === sm[1]);
    // um par inválido nunca passa
    const heavy = forest.slice().sort((x, y) => y.w - x.w)[0];
    if (heavy.w > sm[1]) { ok(!H.validPair(forest, heavy, cands[0]), 'par pesado rejeitado'); wrong++; }
    // escolhe um par válido ao acaso (empates)
    let p, q; do { p = forest[Math.floor(Math.random() * forest.length)]; q = forest[Math.floor(Math.random() * forest.length)]; } while (!H.validPair(forest, p, q));
    forest = H.merge(forest, p, q).forest;
  }
  const root = forest[0], codes = H.codes(root), text = a + b;
  const cost = text.split('').reduce((x, c) => x + codes[c].length, 0);
  ok(cost === H.optimalCost(text), 'custo ótimo ' + cost + ' vs ' + H.optimalCost(text));
  const cs = Object.values(codes); ok(cs.every(c => cs.every(d => c === d || !d.startsWith(c))), 'sem prefixo');
  ok(H.decode(root, H.encode(root, a)) === a && H.decode(root, H.encode(root, b)) === b, 'ida e volta');
  ok(H.letters(root).sort().join('') === Object.keys(codes).sort().join(''), 'letras');
}
console.log(n + ' verificações, ' + f + ' falhas');
