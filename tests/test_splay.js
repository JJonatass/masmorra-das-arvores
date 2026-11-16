global.Engine = require('../src/engine.js');
const M = require('../src/splay.js'), E = global.Engine;
let seed = 11; const r = () => { let a = seed += 0x6D2B79F5; a = Math.imul(a ^ a >>> 15, a | 1); a ^= a + Math.imul(a ^ a >>> 7, a | 61); return ((a ^ a >>> 14) >>> 0) / 4294967296; };
M.setRandom(r);
let n = 0, f = 0, fails = 0, saved = 0; const ok = (c, m) => { n++; if (!c) { f++; if (f < 10) console.log('FALHA', m); } };
for (let s = 0; s < 1500; s++) {
  const d = M.day(s % 4); if (!d) { fails++; continue; }
  ok(E.isBST(d.tree), 'torre é BST');
  ok(d.seq.length === 11 && E.size(d.tree) === 14, 'tamanho do dia (fixo)');
  // simulação independente: percorre o jogo passo a passo como o jogador faria
  const t = E.clone(d.tree); let mine = 0, fixed = 0;
  for (const k of d.seq) {
    fixed += E.depth(E.find(d.tree, k)) + 1;
    let node = t.root, visits = 1;
    while (node.key !== k) { node = k < node.key ? node.left : node.right; visits++; }
    mine += visits;
    const x = E.find(t, k); while (x.parent) E.splayApply(t, x, E.splayDiagnose(x));
    ok(t.root.key === k && E.isBST(t), 'subiu à raiz');
  }
  ok(mine === d.expect.splay && fixed === d.expect.fixed, 'custos batem');
  ok(fixed - mine >= 4, 'splay economiza'); saved += fixed - mine;
  ok(Object.keys(d.names).length === E.size(d.tree), 'nomes dos itens');
}
console.log('dias sem sorteio:', fails, '· economia média:', (saved / 1500).toFixed(1));
console.log(n + ' verificações, ' + f + ' falhas');
