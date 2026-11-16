/* Motor do Mercado da Torre: torre (árvore splay), fregueses com pedidos repetidos e o custo comparado com uma torre parada. */
var Mercado = (function(E){
  'use strict';
  var ITEMS = ['Pão', 'Leite', 'Queijo', 'Mel', 'Maçã', 'Uva', 'Arroz', 'Feijão', 'Farinha', 'Café', 'Chá', 'Sal', 'Açúcar', 'Ovos', 'Manteiga',
    'Tapioca', 'Cuscuz', 'Caju', 'Manga', 'Coco', 'Goiaba', 'Acerola', 'Bolo', 'Rapadura', 'Cocada', 'Pimenta', 'Cebola', 'Alho', 'Batata', 'Milho',
    'Poção', 'Pergaminho', 'Vela', 'Corda', 'Lanterna', 'Mapa', 'Bússola', 'Escudo', 'Elmo', 'Botas'];
  var rnd = Math.random;
  function setRandom(f){ rnd = f; }
  function ri(a, b){ return a + Math.floor(rnd() * (b - a + 1)); }
  function shuffle(a){ a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function tower(n){
    for (var t = 0; t < 300; t++) {
      var keys = [], tree = { root: null };
      while (keys.length < n) { var k = ri(3, 97); if (keys.indexOf(k) < 0) keys.push(k); }
      keys.forEach(function(k){ E.bstInsert(tree, k); });
      var h = E.height(tree.root);
      if (h >= 5 && h <= 7) return tree;
    }
    return tree;
  }
  /* custo de um pedido = salas visitadas = profundidade + 1 */
  function costOf(tree, k){ return E.depth(E.find(tree, k)) + 1; }
  function splayTo(tree, k){ var x = E.find(tree, k), steps = []; while (x.parent) { var s = E.splayDiagnose(x); steps.push(s); E.splayApply(tree, x, s); } return steps; }
  function simulate(tree, seq){
    var t = E.clone(tree), splay = 0, fixed = 0;
    seq.forEach(function(k){ fixed += costOf(tree, k); splay += costOf(t, k); splayTo(t, k); });
    return { splay: splay, fixed: fixed };
  }
  /* um dia de mercado: poucos itens populares e fundos, pedidos repetidos */
  function day(dayNum){
    var n = 14, len = 11;   // todo dia igual, para os tempos do ranking serem comparáveis
    for (var t = 0; t < 200; t++) {
      var tree = tower(n), all = E.keys(tree);
      var deep = all.filter(function(k){ return E.depth(E.find(tree, k)) >= 3; });
      if (deep.length < 3) continue;
      var pop = shuffle(deep).slice(0, 3), seq = [];
      for (var i = 0; i < len; i++) seq.push(rnd() < 0.72 ? pop[Math.floor(rnd() * 3)] : all[Math.floor(rnd() * all.length)]);
      if (seq[0] === seq[1]) continue;
      var sim = simulate(tree, seq);
      if (sim.fixed - sim.splay >= 4) {
        var names = {}, it = shuffle(ITEMS); all.forEach(function(k, i){ names[k] = it[i % it.length]; });
        return { tree: tree, seq: seq, popular: pop, names: names, expect: sim };
      }
    }
    return null;
  }
  return { ITEMS: ITEMS, setRandom: setRandom, tower: tower, costOf: costOf, splayTo: splayTo, simulate: simulate, day: day };
})(Engine);
if (typeof module !== 'undefined') module.exports = Mercado;
