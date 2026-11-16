/* Motor da Biblioteca dos Ecos: trie, sorteio de famílias de palavras com prefixos em comum, busca e autocompletar. */
var TrieG = (function(){
  'use strict';
  var FAMILIES = [
    ['CASA', 'CASAL', 'CASACO', 'CASTELO', 'CASO', 'CASCA', 'CASAMENTO'],
    ['CARRO', 'CARTA', 'CARTAO', 'CARGA', 'CARNE', 'CARTEIRA', 'CAR'],
    ['PROGRAMA', 'PROGRAMAR', 'PROGRESSO', 'PROJETO', 'PROVA', 'PROVAR', 'PRO'],
    ['ARVORE', 'ARVORES', 'AREIA', 'ARTE', 'ARTISTA', 'ARCO', 'AR'],
    ['MAR', 'MARTE', 'MARCA', 'MARCADOR', 'MARCO', 'MARE', 'MARTELO'],
    ['DADO', 'DADOS', 'DAMA', 'DANCA', 'DATA', 'DAR'],
    ['LIVRO', 'LIVRARIA', 'LIVRE', 'LIMA', 'LIMAO', 'LIMITE', 'LIXO'],
    ['SOL', 'SOLDADO', 'SOLO', 'SOLTEIRO', 'SOPA', 'SONO', 'SOM'],
    ['PORTA', 'PORTAO', 'PORTAL', 'PORCO', 'PORTO', 'POR', 'POSTE'],
    ['BOLA', 'BOLO', 'BOLSA', 'BOLINHO', 'BOTA', 'BOTAO', 'BOI'],
    ['TERRA', 'TERRACO', 'TERMO', 'TESTE', 'TESOURO', 'TER', 'TEMA'],
    ['CHAVE', 'CHAVEIRO', 'CHAVES', 'CHUVA', 'CHA', 'CHAO', 'CHEFE'],
    ['PILHA', 'PILHAS', 'PILOTO', 'PINO', 'PINTOR', 'PIA', 'PIPA'],
    ['FILA', 'FILAS', 'FILME', 'FILHO', 'FIM', 'FIO', 'FIGO']
  ];
  var rnd = Math.random;
  function setRandom(f){ rnd = f; }
  function shuffle(a){ a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var uid = 0;
  function mk(ch, parent){ return { id: ++uid, ch: ch, kids: {}, end: false, parent: parent }; }
  function newTrie(){ return mk('', null); }
  function child(n, c){ return n.kids[c] || null; }
  function dig(n, c){ if (!n.kids[c]) n.kids[c] = mk(c, n); return n.kids[c]; }
  function insert(root, w){ var n = root; for (var i = 0; i < w.length; i++) { if (!n.kids[w[i]]) n.kids[w[i]] = mk(w[i], n); n = n.kids[w[i]]; } n.end = true; return n; }
  function walk(root, s){ var n = root; for (var i = 0; i < s.length && n; i++) n = n.kids[s[i]] || null; return n; }
  function prefixOf(n){ var s = ''; while (n && n.parent) { s = n.ch + s; n = n.parent; } return s; }
  function nodes(root){ var out = []; (function w(n){ out.push(n); Object.keys(n.kids).sort().forEach(function(k){ w(n.kids[k]); }); })(root); return out; }
  function words(n){ var out = []; (function w(m){ if (m.end) out.push(prefixOf(m)); Object.keys(m.kids).sort().forEach(function(k){ w(m.kids[k]); }); })(n); return out; }
  function size(root){ return nodes(root).length - 1; }
  /* 'sim' palavra guardada; 'prefixo' caminho existe mas sem marca de fim; 'nao' caminho quebra */
  function classify(root, q){ var n = walk(root, q); if (!n) return 'nao'; return n.end ? 'sim' : 'prefixo'; }
  /* ação certa para a letra i da palavra w estando no nó n */
  function action(n, w, i){ if (i >= w.length) return 'fim'; return n.kids[w[i]] ? 'seguir' : 'cavar'; }

  /* rodada: 2 famílias, 7 palavras; garante um caso de "palavra que é prefixo de outra já guardada" */
  function hasPair(list){ return list.some(function(a){ return list.some(function(b){ return b !== a && b.length > a.length && b.indexOf(a) === 0; }); }); }
  function round(){
    var fam, pool;
    for (var t = 0; t < 40; t++) { fam = shuffle(FAMILIES).slice(0, 2); pool = shuffle(fam[0]).slice(0, 4).concat(shuffle(fam[1]).slice(0, 3)); if (hasPair(pool)) break; }
    var order = shuffle(pool), seen = {};
    order = order.filter(function(w){ if (seen[w]) return false; seen[w] = 1; return true; });
    // procura um par (curta prefixo de longa); põe a longa antes da curta
    for (var a = 0; a < order.length; a++) for (var b = 0; b < order.length; b++) {
      if (a !== b && order[b].length > order[a].length && order[b].indexOf(order[a]) === 0) {
        var shortW = order[a], longW = order[b];
        order = order.filter(function(w){ return w !== shortW && w !== longW; });
        order.splice(Math.floor(rnd() * 2), 0, longW); order.push(shortW);
        return { families: fam, words: order };
      }
    }
    return { families: fam, words: order };
  }
  /* perguntas da etapa de busca: palavras, prefixos e ausentes */
  function queries(root, inserted, fam){
    var sim = shuffle(inserted).slice(0, 2), pre = [], nao = [];
    nodes(root).forEach(function(n){ if (n.parent && !n.end && n.parent.parent && Object.keys(n.kids).length) { var p = prefixOf(n); if (p.length >= 2) pre.push(p); } });
    pre = shuffle(pre).slice(0, 2);
    var others = shuffle([].concat(fam[0], fam[1]).filter(function(w){ return inserted.indexOf(w) < 0 && classify(root, w) === 'nao'; }));
    nao = others.slice(0, 1);
    inserted.forEach(function(w){ var v = w + 'S'; if (nao.length < 2 && classify(root, v) === 'nao' && inserted.indexOf(v) < 0) nao.push(v); });
    if (nao.length < 2) nao.push('ZEBRA');
    return shuffle(sim.concat(pre, nao.slice(0, 2))).map(function(q){ return { q: q, a: classify(root, q) }; });
  }
  /* prefixo do oráculo: nó com 2+ palavras abaixo, preferindo 3+ */
  function oracle(root){
    var cands = nodes(root).filter(function(n){ return n.parent && words(n).length >= 2; });
    var big = cands.filter(function(n){ return words(n).length >= 3 && prefixOf(n).length >= 2; });
    var n = (big.length ? big : cands)[Math.floor(rnd() * (big.length || cands.length))];
    return { prefix: prefixOf(n), answer: words(n) };
  }
  return { FAMILIES: FAMILIES, setRandom: setRandom, newTrie: newTrie, child: child, dig: dig, insert: insert, walk: walk, prefixOf: prefixOf, nodes: nodes, words: words,
    size: size, classify: classify, action: action, round: round, queries: queries, oracle: oracle };
})();
if (typeof module !== 'undefined') module.exports = TrieG;
