/* Motor do jogo: árvores com ponteiro para o pai, geradores de desafios e diagnóstico da jogada certa. */
var Engine = (function () {
  'use strict';
  var rnd = Math.random;
  function setRandom(f) { rnd = f; }
  function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function distinctKeys(n, lo, hi) { var s = {}, out = []; while (out.length < n) { var k = ri(lo, hi); if (!s[k]) { s[k] = 1; out.push(k); } } return out; }

  function mk(k) { return { key: k, left: null, right: null, parent: null, color: 'R' }; }
  function clone(t) {
    function c(n, p) { if (!n) return null; var m = { key: n.key, color: n.color, parent: p, left: null, right: null }; m.left = c(n.left, m); m.right = c(n.right, m); return m; }
    return { root: c(t.root, null) };
  }
  function find(t, k) { var n = t.root; while (n && n.key !== k) n = k < n.key ? n.left : n.right; return n; }
  function has(t, k) { return !!find(t, k); }
  function bstInsert(t, k) {
    var x = mk(k);
    if (!t.root) { t.root = x; return x; }
    var p = t.root;
    for (;;) {
      if (k < p.key) { if (!p.left) { p.left = x; break; } p = p.left; }
      else { if (!p.right) { p.right = x; break; } p = p.right; }
    }
    x.parent = p; return x;
  }
  /* caminho de comparações até a vaga livre: [{node, dir:'L'|'R'}] */
  function insertPath(t, k) {
    var out = [], n = t.root;
    while (n) { var d = k < n.key ? 'L' : 'R'; out.push({ node: n, dir: d }); n = d === 'L' ? n.left : n.right; }
    return out;
  }
  function rotL(t, x) {
    var y = x.right; x.right = y.left; if (y.left) y.left.parent = x;
    y.parent = x.parent;
    if (!x.parent) t.root = y; else if (x === x.parent.left) x.parent.left = y; else x.parent.right = y;
    y.left = x; x.parent = y; return y;
  }
  function rotR(t, x) {
    var y = x.left; x.left = y.right; if (y.right) y.right.parent = x;
    y.parent = x.parent;
    if (!x.parent) t.root = y; else if (x === x.parent.right) x.parent.right = y; else x.parent.left = y;
    y.right = x; x.parent = y; return y;
  }
  function height(n) { return n ? 1 + Math.max(height(n.left), height(n.right)) : 0; }
  function bf(n) { return height(n.left) - height(n.right); }
  function depth(n) { var d = 0; while (n.parent) { n = n.parent; d++; } return d; }
  function nodes(t) { var out = []; (function w(n) { if (!n) return; w(n.left); out.push(n); w(n.right); })(t.root); return out; }
  function keys(t) { return nodes(t).map(function (n) { return n.key; }); }
  function size(t) { return nodes(t).length; }

  /* ---------- AVL ---------- */
  function lowestUnbalanced(x) { var n = x.parent; while (n) { var b = bf(n); if (b > 1 || b < -1) return n; n = n.parent; } return null; }
  function avlCase(z, k) { var b = bf(z); if (b > 1) return k < z.left.key ? 'LL' : 'LR'; return k > z.right.key ? 'RR' : 'RL'; }
  function avlApply(t, z, cs) {
    if (cs === 'LL') return rotR(t, z);
    if (cs === 'RR') return rotL(t, z);
    if (cs === 'LR') { rotL(t, z.left); return rotR(t, z); }
    rotR(t, z.right); return rotL(t, z);
  }
  function avlInsert(t, k) { var x = bstInsert(t, k); var z = lowestUnbalanced(x); if (z) avlApply(t, z, avlCase(z, k)); return x; }

  /* ---------- Rubro-negra ---------- */
  function rbRoles(t, x) {
    var p = x.parent, g = p ? p.parent : null, u = null, uSide = null;
    if (g) { if (g.left === p) { u = g.right; uSide = 'R'; } else { u = g.left; uSide = 'L'; } }
    return { x: x, p: p, g: g, u: u, uSide: uSide };
  }
  /* 'root' pintar raiz | 'ok' nada a fazer | 'recolor' | 'single' | 'double' */
  function rbDiagnose(t, x) {
    if (x === t.root) return x.color === 'R' ? 'root' : 'ok';
    var p = x.parent; if (p.color === 'B') return 'ok';
    var r = rbRoles(t, x);
    if (r.u && r.u.color === 'R') return 'recolor';
    return ((r.g.left === r.p) === (r.p.left === x)) ? 'single' : 'double';
  }
  /* aplica a correção; devolve o novo X ou null quando terminou */
  function rbApply(t, x, a) {
    var r = rbRoles(t, x), p = r.p, g = r.g;
    if (a === 'root') { x.color = 'B'; return null; }
    if (a === 'ok') return null;
    if (a === 'recolor') { p.color = 'B'; r.u.color = 'B'; g.color = 'R'; return g; }
    if (a === 'single') { if (g.left === p) rotR(t, g); else rotL(t, g); p.color = 'B'; g.color = 'R'; return null; }
    if (g.left === p) { rotL(t, p); rotR(t, g); } else { rotR(t, p); rotL(t, g); }
    x.color = 'B'; g.color = 'R'; return null;
  }
  function rbInsert(t, k) { var x = bstInsert(t, k); x.color = 'R'; var cur = x; while (cur) { cur = rbApply(t, cur, rbDiagnose(t, cur)); } return x; }
  function rbValid(t) {
    if (t.root && t.root.color !== 'B') return false;
    var ok = true;
    (function bh(n) {
      if (!n) return 1;
      if (n.color === 'R' && ((n.left && n.left.color === 'R') || (n.right && n.right.color === 'R'))) ok = false;
      var a = bh(n.left), b = bh(n.right); if (a !== b) ok = false;
      return a + (n.color === 'B' ? 1 : 0);
    })(t.root);
    return ok;
  }
  /* simula a sequência de passos de uma inserção */
  function rbSequence(t, k) { var c = clone(t); var x = bstInsert(c, k); x.color = 'R'; var seq = []; var cur = x; while (cur) { var d = rbDiagnose(c, cur); seq.push(d); cur = rbApply(c, cur, d); } return seq; }

  /* ---------- Splay ---------- */
  function splayDiagnose(x) {
    var p = x.parent; if (!p) return null;
    if (!p.parent) return 'zig';
    var g = p.parent; return ((g.left === p) === (p.left === x)) ? 'zigzig' : 'zigzag';
  }
  function splayApply(t, x, s) {
    var p = x.parent, g = p ? p.parent : null;
    if (s === 'zig') { if (x === p.left) rotR(t, p); else rotL(t, p); return; }
    if (s === 'zigzig') { if (p === g.left) { rotR(t, g); rotR(t, p); } else { rotL(t, g); rotL(t, p); } return; }
    if (x === p.left) { rotR(t, p); rotL(t, g); } else { rotL(t, p); rotR(t, g); }
  }
  function splaySequence(t, k) { var c = clone(t), x = find(c, k), seq = []; while (x.parent) { var s = splayDiagnose(x); seq.push(s); splayApply(c, x, s); } return seq; }

  function isBST(t) {
    var ok = true;
    (function w(n, lo, hi, p) {
      if (!n) return;
      if (n.parent !== p) ok = false;
      if ((lo !== null && n.key <= lo) || (hi !== null && n.key >= hi)) ok = false;
      w(n.left, lo, n.key, n); w(n.right, n.key, hi, n);
    })(t.root, null, null, null);
    return ok;
  }
  function isAVL(t) { var ok = true; nodes(t).forEach(function (n) { var b = bf(n); if (b > 1 || b < -1) ok = false; }); return ok && isBST(t); }

  /* ---------- Geradores ---------- */
  function genBST(level) {
    var n = Math.min(4 + level * 2, 12);
    for (var tries = 0; tries < 200; tries++) {
      var t = { root: null }; distinctKeys(n, 5, 95).forEach(function (k) { bstInsert(t, k); });
      if (height(t.root) > 5) continue;
      var k; do { k = ri(2, 98); } while (has(t, k));
      var path = insertPath(t, k);
      if (path.length < Math.min(2 + level, 4)) continue;
      var last = path[path.length - 1];
      return { type: 'bst', tree: t, key: k, answer: { parent: last.node.key, side: last.dir } };
    }
    return genBST(0);
  }

  function genAVL(wanted, level) {
    for (var tries = 0; tries < 400; tries++) {
      var n = ri(4, 6 + Math.min(level, 4));
      var t = { root: null }; distinctKeys(n, 5, 95).forEach(function (k) { avlInsert(t, k); });
      var cands = [];
      for (var k = 2; k <= 98; k++) {
        if (has(t, k)) continue;
        var c = clone(t), x = bstInsert(c, k), z = lowestUnbalanced(x);
        if (z && (!wanted || avlCase(z, k) === wanted)) cands.push(k);
      }
      if (!cands.length) continue;
      var key = pick(cands), tt = clone(t);
      bstInsert(tt, key);
      var zz = lowestUnbalanced(find(tt, key));
      return { type: 'avl', before: t, tree: tt, key: key, answer: { z: zz.key, cs: avlCase(zz, key) } };
    }
    return null;
  }

  /* wanted: 'ok' | 'recolor' | 'single' | 'double' | 'long' (recolorir e depois girar) */
  function genRB(wanted, level) {
    for (var tries = 0; tries < 600; tries++) {
      var n = ri(5 + Math.min(level, 3), 10 + Math.min(level, 4));
      var t = { root: null }; distinctKeys(n, 3, 97).forEach(function (k) { rbInsert(t, k); });
      if (height(t.root) > 5) continue;
      var cands = [];
      for (var k = 2; k <= 98; k++) {
        if (has(t, k)) continue;
        var s = rbSequence(t, k), ok;
        if (wanted === 'long') ok = s.length >= 2 && s[0] === 'recolor' && (s[s.length - 1] === 'single' || s[s.length - 1] === 'double' || s[s.length - 1] === 'root');
        else if (wanted === 'recolor') ok = s[0] === 'recolor';
        else ok = s[0] === wanted && s.length === 1;
        if (ok) cands.push({ k: k, s: s });
      }
      if (!cands.length) continue;
      var c = pick(cands), tt = clone(t), x = bstInsert(tt, c.k); x.color = 'R';
      return { type: 'rb', before: t, tree: tt, key: c.k, seq: c.s };
    }
    return null;
  }

  function genSplay(wanted, level) {
    for (var tries = 0; tries < 400; tries++) {
      var n = ri(8, 11 + Math.min(level, 3));
      var t = { root: null }; distinctKeys(n, 3, 97).forEach(function (k) { bstInsert(t, k); });
      if (height(t.root) > 6 || height(t.root) < 4) continue;
      var cands = nodes(t).filter(function (x) {
        var d = depth(x); if (d < 2) return false;
        var s = splaySequence(t, x.key);
        if (s.length > 3) return false;
        return !wanted || s.indexOf(wanted) >= 0;
      });
      if (!cands.length) continue;
      var x = pick(cands);
      return { type: 'splay', tree: t, key: x.key, seq: splaySequence(t, x.key) };
    }
    return null;
  }

  function genFloor(id) {
    var list = [];
    if (id === 'bst') { for (var i = 0; i < 5; i++) list.push(genBST(i)); }
    if (id === 'avl') { shuffle(['LL', 'RR', 'LR', 'RL']).forEach(function (c, i) { list.push(genAVL(c, i)); }); list.push(genAVL(null, 4)); }
    if (id === 'rb') { ['recolor', 'single', 'double'].concat(shuffle(['ok', 'long'])).forEach(function (w, i) { list.push(genRB(w, i)); }); }
    if (id === 'splay') { ['zig', 'zigzig', 'zigzag', null].forEach(function (w, i) { list.push(genSplay(w, i)); }); }
    if (id === 'boss') {
      list = [genBST(4), genBST(5), genAVL(pick(['LR', 'RL']), 4), genAVL(null, 4), genRB('long', 3), genRB(pick(['single', 'double']), 3), genSplay(null, 3), genSplay('zigzag', 3)];
      list = shuffle(list);
    }
    return list.filter(Boolean);
  }

  return {
    setRandom: setRandom, clone: clone, find: find, bstInsert: bstInsert, insertPath: insertPath, rotL: rotL, rotR: rotR,
    height: height, bf: bf, depth: depth, nodes: nodes, keys: keys, size: size,
    lowestUnbalanced: lowestUnbalanced, avlCase: avlCase, avlApply: avlApply, avlInsert: avlInsert,
    rbRoles: rbRoles, rbDiagnose: rbDiagnose, rbApply: rbApply, rbInsert: rbInsert, rbValid: rbValid, rbSequence: rbSequence,
    splayDiagnose: splayDiagnose, splayApply: splayApply, splaySequence: splaySequence,
    isBST: isBST, isAVL: isAVL,
    genBST: genBST, genAVL: genAVL, genRB: genRB, genSplay: genSplay, genFloor: genFloor
  };
})();
if (typeof module !== 'undefined') module.exports = Engine;
