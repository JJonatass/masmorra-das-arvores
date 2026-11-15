const E = require('../src/engine.js');
let seed = 1;
function mulberry() { let a = seed += 0x6D2B79F5; a = Math.imul(a ^ a >>> 15, a | 1); a ^= a + Math.imul(a ^ a >>> 7, a | 61); return ((a ^ a >>> 14) >>> 0) / 4294967296; }
E.setRandom(mulberry);
let checks = 0, fails = 0;
function ok(c, m) { checks++; if (!c) { fails++; if (fails < 20) console.log('FALHA:', m); } }

// 1. AVL e RN completas sob inserções aleatórias
for (let s = 0; s < 400; s++) {
  const a = { root: null }, r = { root: null }, used = new Set();
  for (let i = 0; i < 60; i++) {
    let k; do { k = Math.floor(mulberry() * 1000); } while (used.has(k)); used.add(k);
    E.avlInsert(a, k); E.rbInsert(r, k);
    ok(E.isAVL(a), 'avl inválida'); ok(E.isBST(r) && E.rbValid(r), 'rn inválida');
  }
  ok(E.keys(a).join() === [...used].sort((x, y) => x - y).join(), 'chaves avl');
}

// 2. Desafios gerados: a resposta do motor resolve o problema
const tally = {};
for (let s = 0; s < 300; s++) {
  for (const id of ['bst', 'avl', 'rb', 'splay', 'boss']) {
    const list = E.genFloor(id);
    ok(list.length === (id === 'boss' ? 8 : (id === 'splay' ? 4 : 5)), 'tamanho do andar ' + id + ' ' + list.length);
    for (const ch of list) {
      tally[ch.type] = (tally[ch.type] || 0) + 1;
      if (ch.type === 'bst') {
        // referência independente: pai é o predecessor (sem filho direito) ou o sucessor (sem filho esquerdo)
        const ks = E.keys(ch.tree); ok(!ks.includes(ch.key), 'chave repetida');
        const pred = ks.filter(k => k < ch.key).pop(), succ = ks.find(k => k > ch.key);
        const pn = pred !== undefined ? E.find(ch.tree, pred) : null, sn = succ !== undefined ? E.find(ch.tree, succ) : null;
        let ref = null;
        if (pn && !pn.right) ref = { parent: pred, side: 'R' };
        if (sn && !sn.left) { ok(!ref, 'duas vagas'); ref = { parent: succ, side: 'L' }; }
        ok(ref && ref.parent === ch.answer.parent && ref.side === ch.answer.side, 'vaga bst errada');
      }
      if (ch.type === 'avl') {
        ok(E.isAVL(ch.before), 'avl antes inválida');
        const z = E.find(ch.tree, ch.answer.z); ok(Math.abs(E.bf(z)) === 2, 'z não desequilibrado');
        // nenhum nó mais baixo no caminho está desequilibrado
        let n = E.find(ch.tree, ch.key).parent; while (n !== z) { ok(Math.abs(E.bf(n)) < 2, 'existe nó mais baixo'); n = n.parent; }
        let good = 0;
        for (const cs of ['LL', 'RR', 'LR', 'RL']) {
          const c = E.clone(ch.tree), zz = E.find(c, ch.answer.z);
          const child = cs[0] === 'L' ? zz.left : zz.right; if (!child) continue;
          const inner = cs[1] === 'L' ? child.left : child.right; if (cs[0] !== cs[1] && !inner) continue;
          E.avlApply(c, zz, cs);
          if (E.isAVL(c)) { good++; ok(cs === ch.answer.cs, 'outro caso também equilibra: ' + cs + ' vs ' + ch.answer.cs); }
          ok(E.isBST(c), 'rotação quebrou bst');
        }
        ok(good === 1, 'casos que equilibram: ' + good);
      }
      if (ch.type === 'rb') {
        ok(E.rbValid(ch.before), 'rn antes inválida');
        const c = E.clone(ch.tree); let x = E.find(c, ch.key), i = 0;
        while (x) { const d = E.rbDiagnose(c, x); ok(d === ch.seq[i], 'sequência rn diverge'); i++; x = E.rbApply(c, x, d); }
        ok(i === ch.seq.length && E.rbValid(c) && E.isBST(c), 'rn final inválida');
      }
      if (ch.type === 'splay') {
        const c = E.clone(ch.tree); let x = E.find(c, ch.key); const d0 = E.depth(x), seq = [];
        while (x.parent) { const s = E.splayDiagnose(x); seq.push(s); E.splayApply(c, x, s); }
        ok(c.root.key === ch.key && E.isBST(c), 'splay não chegou à raiz');
        ok(seq.length === Math.ceil(d0 / 2) && seq.join() === ch.seq.join(), 'passos splay');
        ok(E.size(c) === E.size(ch.tree), 'splay perdeu nós');
      }
    }
  }
}
// cobertura dos casos
const cover = {};
for (let s = 0; s < 200; s++) {
  E.genFloor('avl').forEach(c => cover['avl:' + c.answer.cs] = 1);
  E.genFloor('rb').forEach(c => c.seq.forEach(d => cover['rb:' + d] = 1));
  E.genFloor('splay').forEach(c => c.seq.forEach(d => cover['sp:' + d] = 1));
}
console.log('casos cobertos:', Object.keys(cover).sort().join(' '));
console.log('desafios por tipo:', JSON.stringify(tally));
console.log(`${checks} verificações, ${fails} falhas`);
process.exit(fails ? 1 : 0);
