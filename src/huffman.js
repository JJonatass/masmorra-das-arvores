/* Motor da Forja de Huffman: banco de palavras, forja com escolhas válidas (empates incluídos), códigos e decodificação. */
var Huff = (function(){
  'use strict';
  /* palavras com 7 letras ou mais, maiúsculas e sem acento */
  var WORDS = ('ALGORITMO ESTRUTURA MASMORRA PROGRAMA BIBLIOTECA COMPUTADOR VARIAVEL FUNCAO RECURSAO ' +
    'PONTEIRO MEMORIA COMPILADOR TECLADO MONITOR INTERNET PROTOCOLO SERVIDOR DOCUMENTO ARQUIVO DIRETORIO ' +
    'PROCESSO SISTEMA REGISTRO CONSULTA INDICADOR ARVORE BINARIA ENCADEADA ORDENACAO BUSCADOR ' +
    'COMPRESSAO CODIFICAR DECODIFICAR MENSAGEM SEGREDO PERGAMINHO DRAGAO CAVALEIRO ESPADA ESCUDO FEITICO ' +
    'CASTELO FORTALEZA TESOURO ARMADURA GUARDIAO MONSTRO CAVERNA LABIRINTO RELIQUIA AMULETO ' +
    'ALQUIMIA BIGORNA FORJADOR FERREIRO MARTELO FORNALHA CHAMINE TOCHEIRO CORREDOR ESCADARIA  ' +
    'ESTUDANTE PROFESSOR FACULDADE CADERNO APOSTILA EXERCICIO SEMESTRE DISCIPLINA LABORATORIO ' +
    'PROJETOR QUADRADO TRIANGULO RETANGULO CIRCULO ESFERICO NUMERICO DECIMAL BINARIOS HEXADECIMAL ' +
    'CONTADOR ACUMULADOR VETORIAL MATRIZES GRAFICOS VERTICES ARESTAS ' +
    'CAMINHOS DIJKSTRA KRUSKAL HUFFMAN FREQUENCIA PREFIXO SUFIXO ALFABETO SIMBOLOS CARACTERE ' +
    'PALAVRAS FRASEADO TEXTUAL OTIMIZAR GULOSO DINAMICO BACKTRACK HEURISTICA PARALELO DISTRIBUIDO ' +
    'NAVEGADOR APLICATIVO CELULARES TABLETES NOTEBOOK IMPRESSORA ROTEADOR SATELITE ANTENAS ' +
    'RECIFENSE PERNAMBUCO OLINDENSE CAPIBARIBE MARACATU MANGUEZAL JANGADEIRO COQUEIRAL ' +
    'CAJUEIRO MANGUEIRA TAPIOCA CARNAVAL FORROZEIRO SANFONEIRO COMPUTACAO INFORMATICA PROGRAMADOR DESENVOLVER TECNOLOGIA CONHECIMENTO APRENDIZADO EQUILIBRIO ROTACOES PROFUNDIDADE').split(' ')
    .filter(function(w){ return /^[A-Z]{7,}$/.test(w); });

  var rnd = Math.random;
  function setRandom(f){ rnd = f; }
  function pickWords(){
    var a = WORDS[Math.floor(rnd() * WORDS.length)], b;
    do { b = WORDS[Math.floor(rnd() * WORDS.length)]; } while (b === a);
    return [a, b];
  }
  function freqs(text){
    var m = {}; text.split('').forEach(function(c){ m[c] = (m[c] || 0) + 1; });
    return Object.keys(m).sort().map(function(c){ return { ch: c, w: m[c] }; });
  }

  var uid = 0;
  function leaf(ch, w){ return { id: ++uid, ch: ch, w: w, left: null, right: null }; }
  function newForest(text){ return freqs(text).map(function(f){ return leaf(f.ch, f.w); }); }
  /* o par é válido se tiver os dois menores pesos da floresta (empates aceitos) */
  function smallest(forest){ var ws = forest.map(function(n){ return n.w; }).sort(function(a, b){ return a - b; }); return [ws[0], ws[1]]; }
  function validPair(forest, a, b){
    if (!a || !b || a === b) return false;
    var s = smallest(forest), p = [a.w, b.w].sort(function(x, y){ return x - y; });
    return p[0] === s[0] && p[1] === s[1];
  }
  /* o mais leve vai para a esquerda (bit 0); empate: o primeiro escolhido vai para a esquerda */
  function merge(forest, a, b){
    var l = a, r = b; if (b.w < a.w) { l = b; r = a; }
    var n = { id: ++uid, ch: null, w: a.w + b.w, left: l, right: r };
    var out = forest.filter(function(x){ return x !== a && x !== b; }); out.push(n);
    return { forest: out, node: n };
  }
  function sortedForest(forest){ return forest.slice().sort(function(a, b){ return a.w - b.w || a.id - b.id; }); }
  function label(n){ return n.ch ? n.ch : letters(n).join(''); }
  function letters(n){ if (!n) return []; if (n.ch) return [n.ch]; return letters(n.left).concat(letters(n.right)); }

  function codes(root){
    var m = {};
    (function w(n, p){ if (!n) return; if (n.ch) { m[n.ch] = p || '0'; return; } w(n.left, p + '0'); w(n.right, p + '1'); })(root, '');
    return m;
  }
  function encode(root, word){ var c = codes(root); return word.split('').map(function(ch){ return c[ch]; }).join(''); }
  /* lê a partir de pos até chegar a uma folha */
  function decodeNext(root, bits, pos){
    var n = root, path = [n], i = pos;
    if (n.ch) return { ch: n.ch, len: 1, path: path };
    while (!n.ch && i < bits.length) { n = bits[i] === '0' ? n.left : n.right; path.push(n); i++; }
    return { ch: n.ch, len: i - pos, path: path };
  }
  function decode(root, bits){ var out = '', p = 0; while (p < bits.length) { var r = decodeNext(root, bits, p); out += r.ch; p += r.len; } return out; }
  function pathTo(root, ch){ var c = codes(root)[ch], n = root, path = [n]; for (var i = 0; i < c.length; i++) { n = c[i] === '0' ? n.left : n.right; path.push(n); } return path; }
  function fixedBits(distinct){ return Math.max(1, Math.ceil(Math.log2(distinct))); }

  /* referência independente: custo ótimo por fila de prioridade */
  function optimalCost(text){
    var ws = freqs(text).map(function(f){ return f.w; }), cost = 0;
    if (ws.length === 1) return ws[0];
    while (ws.length > 1) { ws.sort(function(a, b){ return a - b; }); var s = ws[0] + ws[1]; cost += s; ws.splice(0, 2, s); }
    return cost;
  }
  return { WORDS: WORDS, setRandom: setRandom, pickWords: pickWords, freqs: freqs, newForest: newForest, smallest: smallest, validPair: validPair,
    merge: merge, sortedForest: sortedForest, label: label, letters: letters, codes: codes, encode: encode, decodeNext: decodeNext, decode: decode,
    pathTo: pathTo, fixedBits: fixedBits, optimalCost: optimalCost };
})();
if (typeof module !== 'undefined') module.exports = Huff;
