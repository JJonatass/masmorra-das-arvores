/* Dicas em camadas e explicações de erro, sempre com os dados da árvore na tela.
   [1] aponta os fatos que importam nesta jogada; [2] conclui o raciocínio. */
var Hints = (function(E){
  'use strict';
  function lado(d){ return d === 'L' ? 'esquerda' : 'direita'; }
  function seta(d){ return d === 'L' ? '←' : '→'; }
  function cmp(a, b){ return a < b ? '<' : '>'; }
  function fb(b){ return (b > 0 ? '+' : b < 0 ? '−' : '') + Math.abs(b); }
  function filho(n){ return n.parent && n.parent.left === n ? 'esquerdo' : 'direito'; }
  function keysOf(n){ var o = []; (function w(m){ if (!m) return; w(m.left); o.push(m.key); w(m.right); })(n); return o; }
  function listK(a){ if (!a.length) return 'nenhuma chave ainda'; return a.length > 6 ? a.slice(0, 6).join(', ') + '…' : a.join(', '); }
  function deepPath(n){ var o = []; while (n) { o.push(n.key); var hl = E.height(n.left), hr = E.height(n.right); n = hl >= hr ? n.left : n.right; } return o; }
  function niveis(h){ return h === 1 ? '1 nível' : h + ' níveis'; }
  function pathTxt(p){ return p.length ? p.join(' → ') : 'vazio'; }

  /* ---------------- BST: um passo de descida ---------------- */
  function step(t, k, nKey){
    var n = E.find(t, nKey), d = k < nKey ? 'L' : 'R', child = d === 'L' ? n.left : n.right;
    var L = keysOf(n.left), R = keysOf(n.right);
    return [
      'Na sala ' + nKey + ': do lado esquerdo só existem chaves menores que ' + nKey + ' (' + listK(L) + '); do lado direito, só maiores (' + listK(R) + '). A chave ' + k + ' pertence a qual grupo?',
      k + ' ' + cmp(k, nKey) + ' ' + nKey + ', então ' + k + ' desce pela ' + lado(d) + ' (' + seta(d) + '). ' +
        (child ? 'A próxima comparação será com ' + child.key + '.' : 'Desse lado a vaga está vazia: ' + k + ' entra como filho ' + (d === 'L' ? 'esquerdo' : 'direito') + ' de ' + nKey + '.')
    ];
  }
  function explainStep(t, k, nKey, chosen){
    var n = E.find(t, nKey), d = k < nKey ? 'L' : 'R', full = E.insertPath(t, k), at = 0;
    while (at < full.length && full[at].node !== n) at++;
    var rest = full.slice(at), last = full[full.length - 1], marks = {};
    full.slice(0, at).forEach(function(s){ marks[s.node.key] = 'path'; }); marks[nKey] = 'cur';
    rest.slice(1).forEach(function(s){ marks[s.node.key] = 'ok'; });
    return {
      title: chosen ? k + ' devia ir para a ' + lado(d) + ' em ' + nKey : 'Tempo esgotado na sala ' + nKey,
      lines: [
        chosen ? 'Você escolheu ' + lado(chosen) + ' (' + seta(chosen) + '), mas ' + k + ' ' + cmp(k, nKey) + ' ' + nKey + '.' : k + ' ' + cmp(k, nKey) + ' ' + nKey + ': o caminho era pela ' + lado(d) + ' (' + seta(d) + ').',
        'Regra da árvore binária de busca: tudo à esquerda de ' + nKey + ' é menor (' + listK(keysOf(n.left)) + ') e tudo à direita é maior (' + listK(keysOf(n.right)) + ').',
        'Caminho certo daqui em diante: ' + rest.map(function(s){ return k + ' ' + cmp(k, s.node.key) + ' ' + s.node.key + ' → ' + lado(s.dir); }).join(' · ') + '. A chave fica à ' + lado(last.dir) + ' de ' + last.node.key + ' (tracejado).'
      ],
      svgs: [{ label: 'Caminho certo', svg: svgTree(t, { marks: marks, ghost: { parent: last.node.key, side: last.dir, label: k } }) }]
    };
  }

  /* ---------------- AVL ---------------- */
  function avlParts(t, zKey, k){
    var z = E.find(t, zKey), b = E.bf(z), heavy = b > 0 ? 'L' : 'R', c = heavy === 'L' ? z.left : z.right;
    var inner = k < c.key ? 'L' : 'R', g = inner === 'L' ? c.left : c.right, cs = heavy + inner;
    var desc = {
      LL: 'rotação à direita em ' + zKey + ': ' + c.key + ' sobe para o lugar de ' + zKey + ', e ' + zKey + ' vira filho direito de ' + c.key + '.',
      RR: 'rotação à esquerda em ' + zKey + ': ' + c.key + ' sobe para o lugar de ' + zKey + ', e ' + zKey + ' vira filho esquerdo de ' + c.key + '.',
      LR: 'rotação à esquerda em ' + c.key + ' e depois à direita em ' + zKey + ': ' + (g ? g.key : '?') + ' sobe para o lugar de ' + zKey + ', com ' + c.key + ' à esquerda e ' + zKey + ' à direita.',
      RL: 'rotação à direita em ' + c.key + ' e depois à esquerda em ' + zKey + ': ' + (g ? g.key : '?') + ' sobe para o lugar de ' + zKey + ', com ' + zKey + ' à esquerda e ' + c.key + ' à direita.'
    }[cs];
    return { z:z, b:b, heavy:heavy, c:c, inner:inner, g:g, cs:cs, desc:desc, hl:E.height(z.left), hr:E.height(z.right), pl:deepPath(z.left), pr:deepPath(z.right) };
  }
  function avl(t, zKey, k, done){
    var a = avlParts(t, zKey, k);
    if (!done) return [
      'Meça os dois lados da sala ' + zKey + '. Pela esquerda, o caminho mais fundo é ' + pathTxt(a.pl) + ' (' + niveis(a.hl) + '); pela direita, ' + pathTxt(a.pr) + ' (' + niveis(a.hr) + '). O lado mais fundo é o que pesa: ele dá a 1ª seta.',
      'fb(' + zKey + ') = ' + a.hl + ' − ' + a.hr + ' = ' + fb(a.b) + ': pesa à ' + lado(a.heavy) + ' (1ª seta ' + seta(a.heavy) + '). O filho desse lado é ' + a.c.key + '; ' + k + ' ' + cmp(k, a.c.key) + ' ' + a.c.key + ', então a chave entrou à ' + lado(a.inner) + ' dele (2ª seta ' + seta(a.inner) + '). Caso ' + a.cs + ': ' + a.desc
    ];
    return [
      'A 1ª seta está certa: ' + zKey + ' pesa à ' + lado(a.heavy) + '. Agora olhe só o filho pesado, ' + a.c.key + ': a chave nova ' + k + ' está do lado esquerdo ou do lado direito dele?',
      k + ' ' + cmp(k, a.c.key) + ' ' + a.c.key + ': entrou à ' + lado(a.inner) + ' de ' + a.c.key + ' (2ª seta ' + seta(a.inner) + '). Caso ' + a.cs + ': ' + a.desc
    ];
  }
  function explainAVL(t, zKey, k, seq){
    var a = avlParts(t, zKey, k), lines = [];
    lines.push('Altura à esquerda de ' + zKey + ': ' + a.hl + ' (' + pathTxt(a.pl) + '). À direita: ' + a.hr + ' (' + pathTxt(a.pr) + '). fb = ' + fb(a.b) + ', então pesa à ' + lado(a.heavy) + ' e a 1ª letra é ' + a.heavy + '.');
    lines.push(k + ' ' + cmp(k, a.c.key) + ' ' + a.c.key + ' (o filho pesado), então a chave entrou à ' + lado(a.inner) + ' dele e a 2ª letra é ' + a.inner + '.');
    lines.push('Caso ' + a.cs + ': ' + a.desc);
    if (seq && seq.length) {
      var w = seq[0] !== a.heavy ? 'a 1ª seta (' + seta(seq[0]) + ') apontou o lado mais raso' : 'a 1ª seta estava certa, mas a 2ª (' + seta(seq[1]) + ') apontou o lado errado do filho ' + a.c.key;
      lines.unshift('Você apertou ' + seq.map(seta).join(' ') + ': ' + w + '.');
    } else lines.unshift('O tempo acabou antes das duas setas.');
    var before = {}; before[zKey] = 'bad'; before[k] = 'fresh';
    var t2 = E.clone(t), z2 = E.find(t2, zKey), top = E.avlApply(t2, z2, a.cs), after = {}; after[top.key] = 'ok'; after[k] = 'fresh';
    return { title: 'Era o caso ' + a.cs + ' na sala ' + zKey, lines: lines,
      svgs: [{ label: 'Antes', svg: svgTree(t, { marks: before, bf: [zKey] }) }, { label: 'Depois do caso ' + a.cs, svg: svgTree(t2, { marks: after, bf: [top.key] }) }] };
  }
  function avlFind(t, k){
    var n = E.find(t, k).parent, rows = [], found = null;
    while (n) { var hl = E.height(n.left), hr = E.height(n.right), b = hl - hr; rows.push({ k: n.key, hl: hl, hr: hr, b: b }); if (Math.abs(b) > 1) { found = n.key; break; } n = n.parent; }
    var r0 = rows[0], fmt = function(r){ return r.k + ': ' + r.hl + ' − ' + r.hr + ' = fb ' + fb(r.b); };
    return [
      'Suba a partir de ' + k + ' calculando altura(esquerda) − altura(direita). Primeira sala: ' + fmt(r0) + (Math.abs(r0.b) > 1 ? ', já desequilibrada.' : ', ainda equilibrada. Continue subindo por ' + rows.slice(1).map(function(r){ return r.k; }).join(', ') + '.'),
      'Subindo: ' + rows.map(fmt).join(' · ') + '. A primeira com |fb| ≥ 2 é ' + found + '.'
    ];
  }

  /* ---------------- Rubro-negra ---------------- */
  var RBN = { ok:'Nada a fazer (Selar)', recolor:'Recolorir', single:'Rotação simples (Giro simples)', double:'Rotação dupla (Giro duplo)', root:'Pintar a raiz de preto' };
  function cor(n){ return n.color === 'R' ? 'vermelha' : 'preta'; }
  function rbFacts(t, x){
    var r = E.rbRoles(t, x);
    if (x === t.root) return 'X = ' + x.key + ' é a raiz e está ' + cor(x) + '.';
    var s = 'X = ' + x.key + ' (' + cor(x) + ') está à ' + (filho(x) === 'esquerdo' ? 'esquerda' : 'direita') + ' de P = ' + r.p.key + ' (' + cor(r.p) + ').';
    if (r.p.color === 'R' && r.g) s += ' P está à ' + (filho(r.p) === 'esquerdo' ? 'esquerda' : 'direita') + ' do avô A = ' + r.g.key + '. O tio T, do outro lado de A, é ' + (r.u ? r.u.key + ' (' + cor(r.u) + ')' : 'NIL: uma vaga vazia, que conta como preta') + '.';
    return s;
  }
  function rbWhy(t, x){
    var r = E.rbRoles(t, x), d = E.rbDiagnose(t, x), p = r.p, g = r.g, u = r.u;
    if (d === 'root') return 'Raiz vermelha: pinte ' + x.key + ' de preto. Isso soma uma preta em todos os caminhos ao mesmo tempo, então nada se desequilibra.';
    if (d === 'ok') return 'O pai ' + p.key + ' é preto, então não existe vermelho com filho vermelho, e a nova vermelha não muda a contagem de pretas. Nada a fazer.';
    if (d === 'recolor') {
      var gp = g.parent, after = !gp ? g.key + ' é a raiz: no passo seguinte ela volta a ser preta.' : gp.color === 'R' ? 'O pai de ' + g.key + ' (' + gp.key + ') também é vermelho: o conflito sobe e continua em ' + g.key + '.' : 'O pai de ' + g.key + ' (' + gp.key + ') é preto: a árvore fica válida.';
      return 'Pai e tio vermelhos: recolorir. ' + p.key + ' e ' + u.key + ' ficam pretos e ' + g.key + ' fica vermelho. Cada caminho continua com o mesmo número de pretas. ' + after;
    }
    var dirG = g.left === p ? 'à direita' : 'à esquerda';
    if (d === 'single') return 'Tio preto e X, P, A em linha reta (' + x.key + ' é filho ' + filho(x) + ' e ' + p.key + ' é filho ' + filho(p) + '): rotação simples ' + dirG + ' no avô ' + g.key + '. ' + p.key + ' sobe e fica preto; ' + g.key + ' desce e fica vermelho.';
    var dirP = p.left === x ? 'à direita' : 'à esquerda';
    return 'Tio preto e X, P, A em zigue-zague (' + x.key + ' é filho ' + filho(x) + ' e ' + p.key + ' é filho ' + filho(p) + '): rotação dupla. Primeiro ' + dirP + ' em ' + p.key + ' (alinha o trio), depois ' + dirG + ' em ' + g.key + '. ' + x.key + ' vira o topo do trio e fica preto, com ' + p.key + ' e ' + g.key + ' vermelhos embaixo dele.';
  }
  function rb(t, x){
    return [rbFacts(t, x) + ' Com esses fatos: há vermelho-vermelho? Se houver, qual é a cor do tio?', rbWhy(t, x)];
  }
  function rbWhyNot(t, x, a){
    var r = E.rbRoles(t, x), d = E.rbDiagnose(t, x);
    if (a === 'root') return x === t.root ? '' : 'Pintar a raiz não serve: ' + x.key + ' não é a raiz.';
    if (a === 'ok') return d === 'root' ? 'A raiz está vermelha: isso quebra a regra da raiz preta.' : '"Nada a fazer" só vale com pai preto, e ' + r.p.key + ' é vermelho.';
    if (d === 'ok') return 'Não há conflito: o pai ' + r.p.key + ' é preto.';
    if (d === 'root') return x.key + ' já é a raiz: basta pintá-la de preto.';
    if (a === 'recolor') return 'Recolorir só funciona com tio vermelho, e o tio aqui é ' + (r.u ? r.u.key + ' (preto)' : 'NIL (conta como preto)') + '.';
    if (d === 'recolor') return 'Com tio vermelho (' + r.u.key + ') não se gira: recolorir resolve sem mudar a forma da árvore.';
    if (a === 'single') return 'Rotação simples só resolve linha reta, e aqui ' + x.key + ', ' + r.p.key + ' e ' + r.g.key + ' fazem zigue-zague.';
    return 'Rotação dupla é para zigue-zague, e aqui ' + x.key + ', ' + r.p.key + ' e ' + r.g.key + ' estão em linha reta.';
  }
  function rbBadges(t, x){ var r = E.rbRoles(t, x), b = {}; b[x.key] = 'X'; if (r.p) b[r.p.key] = 'P'; if (r.g) b[r.g.key] = 'A'; if (r.u) b[r.u.key] = 'T'; return { b:b, nil: !r.u && r.g ? { g:r.g.key, side:r.uSide } : null }; }
  function explainRB(t, x, chosen){
    var d = E.rbDiagnose(t, x), bb = rbBadges(t, x), m = {}; m[x.key] = 'cur';
    var t2 = E.clone(t), x2 = E.find(t2, x.key), nx = E.rbApply(t2, x2, d), m2 = {}; m2[x.key] = 'fresh';
    var lines = [rbWhyNot(t, x, chosen), rbFacts(t, x), rbWhy(t, x)].filter(Boolean);
    if (nx) lines.push('Depois de recolorir, X passa a ser ' + nx.key + ' e a decisão recomeça a partir dele.');
    return { title: 'Era: ' + RBN[d], lines: lines,
      svgs: [{ label:'Antes', svg: svgTree(t, { rb:true, marks:m, badges:bb.b, nil:bb.nil }) }, { label:'Depois de ' + RBN[d].replace(/ \(.*\)/, '').toLowerCase(), svg: svgTree(t2, { rb:true, marks:m2 }) }] };
  }

  /* ---------------- Splay ---------------- */
  var SPN = { zig:'Zig', zigzig:'Zig-zig', zigzag:'Zig-zag' };
  function splayWhy(x){
    var p = x.parent, g = p.parent, d = E.splayDiagnose(x);
    if (d === 'zig') return 'P = ' + p.key + ' é a raiz: Zig. Uma rotação ' + (x === p.left ? 'à direita' : 'à esquerda') + ' em ' + p.key + ' e ' + x.key + ' vira a raiz.';
    if (d === 'zigzig') return 'P = ' + p.key + ' é filho ' + filho(p) + ' de A = ' + g.key + ', o mesmo lado de X (filho ' + filho(x) + '): Zig-zig. Gira primeiro o avô ' + g.key + ', depois o pai ' + p.key + '; ' + x.key + ' sobe dois níveis e os dois ficam pendurados do mesmo lado.';
    return 'P = ' + p.key + ' é filho ' + filho(p) + ' de A = ' + g.key + ', lado oposto ao de X (filho ' + filho(x) + '): Zig-zag. Gira primeiro o pai ' + p.key + ', depois o avô ' + g.key + '; ' + x.key + ' sobe dois níveis e fica entre os dois, um de cada lado.';
  }
  function splay(x){
    var p = x.parent;
    return ['X = ' + x.key + ' é filho ' + filho(x) + ' de P = ' + p.key + '. Agora olhe P: ele é a raiz? Se não for, ele é filho esquerdo ou direito do avô?', splayWhy(x)];
  }
  function explainSplay(t, x, chosen){
    var p = x.parent, g = p.parent, d = E.splayDiagnose(x), why = '';
    if (chosen === 'zig' && d !== 'zig') why = 'Zig só serve quando o pai é a raiz, e ' + p.key + ' tem pai (' + g.key + ').';
    else if (chosen !== 'zig' && d === 'zig') why = 'Não há avô: ' + p.key + ' já é a raiz, então basta uma rotação.';
    else if (chosen === 'zigzig') why = 'Zig-zig exige X e P do mesmo lado, mas X é filho ' + filho(x) + ' e P é filho ' + filho(p) + '.';
    else if (chosen === 'zigzag') why = 'Zig-zag é para lados opostos, mas X e P são ambos filhos ' + filho(x) + 's.';
    var b = {}; b[x.key] = 'X'; b[p.key] = 'P'; if (g) b[g.key] = 'A';
    var m = {}; m[x.key] = 'cur'; var t2 = E.clone(t), x2 = E.find(t2, x.key); E.splayApply(t2, x2, d);
    return { title: 'Era ' + SPN[d], lines: [why, splayWhy(x)].filter(Boolean),
      svgs: [{ label:'Antes', svg: svgTree(t, { marks:m, badges:b }) }, { label:'Depois do ' + SPN[d], svg: svgTree(t2, { marks:m }) }] };
  }

  /* ---------------- perguntas da Arena ---------------- */
  function insert(t, k){
    var path = E.insertPath(t, k), st = function(s){ return k + ' ' + cmp(k, s.node.key) + ' ' + s.node.key + ' → ' + lado(s.dir); };
    var last = path[path.length - 1];
    return [
      'Comece na raiz: ' + path.slice(0, 2).map(st).join(' · ') + (path.length > 2 ? ' · continue a partir de ' + path[2].node.key + '.' : '.'),
      'Caminho completo: ' + path.map(st).join(' · ') + '. Desse lado de ' + last.node.key + ' não há ninguém: a chave entra à ' + lado(last.dir) + ' de ' + last.node.key + '.'
    ];
  }
  function search(t, k){
    var n = E.find(t, k), path = []; while (n) { path.unshift(n.key); n = n.parent; }
    return [
      'Comece em ' + path[0] + ': ' + k + ' ' + cmp(k, path[0]) + ' ' + path[0] + ', desce pela ' + (k < path[0] ? 'esquerda' : 'direita') + (path[1] !== undefined ? ' até ' + path[1] : '') + '. Continue comparando e conte cada sala, incluindo a raiz e o próprio ' + k + '.',
      'Caminho: ' + path.join(' → ') + '. São ' + path.length + ' salas visitadas.'
    ];
  }
  function orders(n){
    var pre = [], ino = [], pos = [];
    (function w(m){ if (!m) return; pre.push(m.key); w(m.left); ino.push(m.key); w(m.right); pos.push(m.key); })(n);
    return { pre:pre, ino:ino, pos:pos };
  }
  function trav(t, which){
    var r = t.root.key, L = orders(t.root.left), R = orders(t.root.right), all = orders(t.root);
    var h1 = 'Nesta árvore a raiz é ' + r + ' e a menor chave é ' + all.ino[0] + '. A pré-ordem começa por ' + r + '; o percurso em ordem começa por ' + all.ino[0] + ' e sai crescente; a pós-ordem começa por ' + all.pos[0] + ' e termina em ' + r + '.';
    var h2;
    if (/pré/.test(which)) h2 = 'Pré-ordem = raiz, subárvore esquerda inteira, subárvore direita inteira: ' + r + ' | ' + (L.pre.join(' ') || '—') + ' | ' + (R.pre.join(' ') || '—') + '.';
    else if (/pós/.test(which)) h2 = 'Pós-ordem = subárvore esquerda, subárvore direita e só no fim a raiz: ' + (L.pos.join(' ') || '—') + ' | ' + (R.pos.join(' ') || '—') + ' | ' + r + '.';
    else h2 = 'Em ordem = subárvore esquerda, raiz, subárvore direita, o que dá a lista crescente: ' + (L.ino.join(' ') || '—') + ' | ' + r + ' | ' + (R.ino.join(' ') || '—') + '.';
    return [h1, h2];
  }

  /* ---------------- desenho em SVG (para as janelas) ---------------- */
  function svgTree(t, o){
    o = o || {};
    var DX = 54, DY = 66, NW = 42, NH = 32, PAD = 24, pos = {}, i = 0, maxD = 0, marks = o.marks || {}, badges = o.badges || {}, bfs = o.bf || [];
    (function w(n, d){ if (!n) return; w(n.left, d + 1); i++; pos[n.key] = { x: PAD + i * DX, y: PAD + NH / 2 + d * DY }; if (d > maxD) maxD = d; w(n.right, d + 1); })(t.root, 0);
    var extra = (o.ghost || o.nil) ? DY * 0.8 : 0, W = PAD * 2 + (i + 1) * DX, H = PAD * 2 + NH + maxD * DY + extra + (bfs.length ? 12 : 0);
    var s = '';
    E.nodes(t).forEach(function(n){ if (n.parent) { var a = pos[n.parent.key], b = pos[n.key], hot = marks[n.key] && marks[n.parent.key] && marks[n.key] !== 'fresh';
      s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + (hot ? '#8a6a35' : '#5B5674') + '" stroke-width="' + (hot ? 4 : 3) + '"/>'; } });
    function ghostAt(pk, side, label, isNil){
      var p = pos[pk]; if (!p) return '';
      var x = p.x + (side === 'L' ? -DX / 2 : DX / 2), y = p.y + DY * 0.75, w = isNil ? 30 : 40, h = isNil ? 20 : 30;
      return '<line x1="' + p.x + '" y1="' + (p.y + NH / 2) + '" x2="' + x + '" y2="' + (y - h / 2) + '" stroke="#F2A93B" stroke-width="2" stroke-dasharray="4 4"/>' +
        '<rect x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h + '" rx="5" fill="' + (isNil ? '#0C0B12' : 'rgba(242,169,59,.15)') + '" stroke="' + (isNil ? '#8C87A6' : '#F2A93B') + '" stroke-width="2"' + (isNil ? '' : ' stroke-dasharray="5 4"') + '/>' +
        '<text x="' + x + '" y="' + (y + 0.5) + '" fill="' + (isNil ? '#A9A1B8' : '#F2A93B') + '" font-size="' + (isNil ? 10 : 15) + '" font-weight="800" text-anchor="middle" dominant-baseline="central">' + label + '</text>' + (isNil ? badgeS(x + w / 2, y - h / 2, 'T') : '');
    }
    if (o.ghost) s += ghostAt(o.ghost.parent, o.ghost.side, o.ghost.label, false);
    if (o.nil) s += ghostAt(o.nil.g, o.nil.side, 'NIL', true);
    E.nodes(t).forEach(function(n){
      var p = pos[n.key], fill = '#23222F', stroke = '#45425A', sw = 2, dash = '', m = marks[n.key];
      if (o.rb) { if (n.color === 'R') { fill = '#B4363A'; stroke = '#F08A86'; } else { fill = '#0C0B12'; stroke = '#8C87A6'; } }
      if (m === 'path') { if (!o.rb) fill = '#3A3122'; stroke = '#C9953F'; sw = 3; }
      if (m === 'cur') { stroke = '#F2A93B'; sw = 4; }
      if (m === 'bad') { stroke = '#E5604A'; sw = 4; dash = ' stroke-dasharray="6 3"'; }
      if (m === 'ok' || m === 'fresh') { stroke = '#7CC39A'; sw = 4; }
      s += '<rect x="' + (p.x - NW / 2) + '" y="' + (p.y - NH / 2) + '" width="' + NW + '" height="' + NH + '" rx="6" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + dash + '/>';
      s += '<text x="' + p.x + '" y="' + (p.y + 1) + '" fill="#ECE3CF" font-size="15" font-weight="700" text-anchor="middle" dominant-baseline="central">' + n.key + '</text>';
      if (badges[n.key]) s += badgeS(p.x + NW / 2 - 2, p.y - NH / 2 + 1, badges[n.key]);
      if (bfs.indexOf(n.key) >= 0) { var b = E.bf(n); s += '<text x="' + p.x + '" y="' + (p.y + NH / 2 + 12) + '" fill="' + (Math.abs(b) > 1 ? '#FFB3A6' : '#B7F0CC') + '" font-size="12" font-weight="700" text-anchor="middle">fb ' + fb(b) + '</text>'; }
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" style="max-width:100%;height:auto;display:block;margin:0 auto;font-family:\'Alegreya Sans\',sans-serif" role="img" aria-label="Árvore da explicação">' + s + '</svg>';
  }
  function badgeS(x, y, t){ return '<circle cx="' + x + '" cy="' + y + '" r="9" fill="#F2A93B" stroke="#121119" stroke-width="2"/><text x="' + x + '" y="' + (y + 0.5) + '" fill="#1d1408" font-size="11" font-weight="800" text-anchor="middle" dominant-baseline="central">' + t + '</text>'; }

  /* ---------------- janela de explicação ---------------- */
  var box = null, onClose = null;
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  /* texto com **negrito** e `tecla` */
  function fmt(t){
    return esc(t).replace(/\*\*(.+?)\*\*/g, '<b style="color:#F2A93B">$1</b>')
      .replace(/`([^`]+)`/g, '<kbd style="font-family:inherit;font-size:13px;font-weight:700;border:1px solid currentColor;border-radius:5px;padding:0 6px;opacity:.9">$1</kbd>');
  }
  function modal(o){
    close(true);
    onClose = o.onClose || null;
    box = document.createElement('div');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'hx-title');
    box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(8,7,12,.82);display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow:auto';
    var tone = o.tone === 'good' ? '#7CC39A' : o.tone === 'info' ? '#F2A93B' : '#E5604A';
    var svgs = (o.svgs || []).map(function(v){ return '<figure style="margin:0;flex:1 1 260px;min-width:0;background:#121119;border:1px solid #45425A;border-radius:12px;padding:8px"><figcaption style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#A9A1B8;font-weight:700;margin:0 0 4px">' + fmt(v.label) + '</figcaption>' + v.svg + '</figure>'; }).join('');
    var steps = (o.steps || []).map(function(st, i){
      return '<li style="display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start"><span style="width:28px;height:28px;border-radius:50%;background:' + tone + ';color:#1d1408;font-weight:800;display:grid;place-items:center;font-size:15px">' + (i + 1) + '</span><span>' + fmt(st) + '</span></li>';
    }).join('');
    box.innerHTML = '<div style="margin:auto;max-width:880px;width:100%;background:#23222F;border:2px solid ' + tone + ';border-radius:16px;padding:18px 20px;box-shadow:0 20px 60px rgba(0,0,0,.6);color:#ECE3CF;font-family:\'Alegreya Sans\',\'Trebuchet MS\',sans-serif">' +
      '<p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:' + tone + '">' + esc(o.kicker || 'Por que errou') + '</p>' +
      '<h2 id="hx-title" style="font-family:\'IM Fell English SC\',Georgia,serif;font-weight:400;font-size:30px;line-height:1.1;margin:4px 0 10px">' + esc(o.title) + '</h2>' +
      (o.intro ? '<p style="margin:0 0 12px;font-size:17px;color:#D9D0BE">' + fmt(o.intro) + '</p>' : '') +
      (steps ? '<ol style="list-style:none;margin:0 0 14px;padding:0;display:flex;flex-direction:column;gap:10px;font-size:17px;line-height:1.45">' + steps + '</ol>' : '') +
      ((o.lines || []).length ? '<ul style="margin:0 0 12px;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:17px;line-height:1.45">' + o.lines.map(function(l){ return '<li>' + fmt(l) + '</li>'; }).join('') + '</ul>' : '') +
      (svgs ? '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px">' + svgs + '</div>' : '') +
      (o.note ? '<p style="margin:0 0 14px;font-size:15px;color:#A9A1B8">' + fmt(o.note) + '</p>' : '') +
      '<div style="display:flex;justify-content:flex-end"><button type="button" id="hx-ok" style="background:#F2A93B;color:#1d1408;border:none;border-radius:10px;padding:11px 22px;font-weight:800;font-size:17px;cursor:pointer;font-family:inherit">' + esc(o.button || 'Entendi, continuar') + ' <span style="font-size:12px;border:1px solid currentColor;border-radius:4px;padding:0 5px;opacity:.75">Enter</span></button></div></div>';
    document.body.appendChild(box);
    [].forEach.call(box.querySelectorAll('figure svg'), function(v){ v.style.maxWidth = '100%'; v.style.height = 'auto'; v.style.display = 'block'; v.style.margin = '0 auto'; });
    box.querySelector('#hx-ok').addEventListener('click', function(){ close(); });
    var b = box.querySelector('#hx-ok'); setTimeout(function(){ try { b.focus({ preventScroll:true }); } catch (e) {} }, 30);
  }
  function close(silent){
    if (!box) return;
    var cb = onClose; box.remove(); box = null; onClose = null;
    if (!silent && cb) cb();
  }
  window.addEventListener('keydown', function(e){
    if (!box) return;
    e.stopImmediatePropagation();
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') { e.preventDefault(); close(); }
    else if (e.key !== 'Tab') e.preventDefault();
  }, true);
  function isOpen(){ return !!box; }

  /* ---------------- instruções antes de cada atividade ---------------- */
  function exBST(){
    var t = { root:null }; [30, 15, 50, 40, 60].forEach(function(k){ E.bstInsert(t, k); });
    return { label:'Exemplo: 47 > 30 → direita · 47 < 50 → esquerda · 47 > 40 → direita: entra à direita de 40',
      svg: svgTree(t, { marks:{ 30:'path', 50:'path', 40:'path' }, ghost:{ parent:40, side:'R', label:47 } }) };
  }
  function exAVL(){
    var t = { root:null }; [40, 20, 30].forEach(function(k){ E.bstInsert(t, k); });
    var t2 = E.clone(t); E.avlApply(t2, E.find(t2, 40), 'LR');
    return [{ label:'Antes: 30 entrou e 40 ficou com fb +2', svg: svgTree(t, { marks:{ 40:'bad', 30:'fresh' }, bf:[40] }) },
            { label:'40 pesa à esquerda (←); 30 entrou à direita de 20 (→): caso LR. Depois:', svg: svgTree(t2, { marks:{ 30:'ok' }, bf:[30] }) }];
  }
  function exRB(){
    var a = { root:null }; [50, 30, 70].forEach(function(k){ E.rbInsert(a, k); }); var xa = E.bstInsert(a, 20); xa.color = 'R';
    var b = { root:null }; [50, 30].forEach(function(k){ E.rbInsert(b, k); }); var xb = E.bstInsert(b, 20); xb.color = 'R';
    return [{ label:'Tio vermelho (70): Recolorir', svg: svgTree(a, { rb:true, marks:{ 20:'cur' }, badges:{ 20:'X', 30:'P', 50:'A', 70:'T' } }) },
            { label:'Tio NIL e linha reta (20, 30, 50 à esquerda): Giro simples', svg: svgTree(b, { rb:true, marks:{ 20:'cur' }, badges:{ 20:'X', 30:'P', 50:'A' }, nil:{ g:50, side:'R' } }) }];
  }
  function exSplay(){
    var t = { root:null }; [50, 30, 70, 20, 40].forEach(function(k){ E.bstInsert(t, k); });
    var t2 = E.clone(t), x = E.find(t2, 20); E.splayApply(t2, x, 'zigzig');
    return [{ label:'X = 20 e P = 30 são filhos esquerdos: Zig-zig', svg: svgTree(t, { marks:{ 20:'cur' }, badges:{ 20:'X', 30:'P', 50:'A' } }) },
            { label:'Depois: 20 subiu dois níveis e virou a raiz', svg: svgTree(t2, { marks:{ 20:'cur' } }) }];
  }
  function intro(kind, o){
    o = o || {};
    var I = {
      queda: { kicker:'Como jogar', title:'A Queda das Chaves', intro:'Você guia cada chave que cai até a vaga certa da árvore binária de busca.', button:'Começar', svgs:[exBST()], steps:[
        'Uma **chave** (a bola dourada com um número) cai do portal e para em cima de uma sala.',
        'Compare os dois números. Chave **menor** que a sala: aperte `←` (ou `A`). Chave **maior**: aperte `→` (ou `D`). No celular, use os botões ◀ e ▶.',
        'Decida **antes que o anel em volta da chave se apague**. Se acertar, a chave desce para a próxima sala e você decide de novo.',
        'Quando não houver sala do lado escolhido, a chave **encaixa** ali (contorno verde) e você ganha pontos. Acertos seguidos aumentam o multiplicador.',
        'A partir da **onda 3** a árvore vira AVL e você também vai girar salas. As regras novas aparecem quando chegar lá.',
        'Travou? `H` abre uma **dica** (custa pontos e dá mais tempo). Errou? O jogo pausa e explica. Você tem 3 vidas, e uma onda sem erros devolve uma. `P` pausa.'] },
      'queda-avl': { kicker:'Nova regra · onda ' + (o.wave || 3), title:'A Balança desperta: árvore AVL', intro:'Agora toda sala precisa ficar equilibrada: a diferença de altura entre o lado esquerdo e o direito (fb) só pode ser −1, 0 ou +1.', button:'Continuar a onda', svgs: exAVL(), steps:[
        'As chaves continuam caindo como antes: `←` para menor, `→` para maior.',
        'Se uma chave desequilibrar a árvore, a tela **treme** e a sala desequilibrada fica **vermelha**, com um relógio em volta.',
        '**1ª seta:** o lado da sala vermelha que está **mais fundo**, isto é, que desce mais níveis.',
        '**2ª seta:** olhe o filho desse lado e veja de que lado dele a **chave nova** (contorno verde) entrou.',
        '`←` `←` = LL · `→` `→` = RR · `←` `→` = LR · `→` `←` = RL. A rotação acontece sozinha e a árvore volta ao equilíbrio.'] },
      'heroi-rb': { kicker:'Capítulo 1 · Como jogar', title:'A Cripta Rubro-Negra', intro:'Você insere chaves numa árvore rubro-negra e quebra as maldições vermelho-vermelho. Cada acerto fere o Lich Rubro.', button:'Entrar na cripta', svgs: exRB(), steps:[
        '**Leve a chave até a vaga.** O herói começa na raiz segurando a chave. Use `←` se ela for menor que a sala onde você está e `→` se for maior. Passo errado é armadilha e tira vida.',
        '**A chave entra vermelha** e vira **X**. Aparecem as marcas **P** (pai), **T** (tio, o outro filho do avô) e **A** (avô). Uma vaga vazia aparece como **NIL** e conta como preta.',
        '**Escolha o feitiço** com as teclas `1` a `5`, respondendo nesta ordem. X é a raiz e está vermelha? Então **Pintar a raiz**. O pai P é preto? Então **Selar** (nada a fazer).',
        'Pai vermelho e **tio vermelho**: **Recolorir**. P e T ficam pretos e A fica vermelho. O conflito pode subir: A vira o novo X e você decide de novo.',
        'Pai vermelho e **tio preto ou NIL**: é hora de girar. X, P e A em **linha reta**: **Giro simples**. Em **zigue-zague**: **Giro duplo**.',
        'Feitiços gastam **mana**. `E` medita (+5 de mana) e `Q` bebe uma poção (+35 de vida), mas ambos gastam um turno. O chefe ataca a cada ' + (o.every || 5) + ' turnos e contra-ataca a cada erro.',
        '`H` abre uma dica (custa 1 de mana). Ao errar, uma janela explica a jogada certa. Zere a vida do chefe para vencer.'] },
      'heroi-splay': { kicker:'Capítulo 2 · Como jogar', title:'A Escada Giratória', intro:'Você encontra as salas que o chefe pede e as sobe até a raiz da árvore splay. Cada acerto fere o Guardião Espiral.', button:'Subir a escada', svgs: exSplay(), steps:[
        '**O chefe pede uma chave.** O herói começa na raiz. Desça até a sala com esse número: `←` se a chave pedida for menor que a sala atual, `→` se for maior. Passo errado é armadilha.',
        'A sala pedida tem um **baú** brilhando embaixo. Ao chegar nela, ela vira **X**, com **P** (pai) e **A** (avô) marcados.',
        '**Suba X até a raiz** com feitiços. Se o pai é a raiz: **Zig** (`1`). Se X e o pai são filhos do **mesmo lado**: **Zig-zig** (`2`). Se são de **lados opostos**: **Zig-zag** (`3`).',
        'Repita até X virar a raiz. Cada feitiço sobe X um ou dois níveis.',
        'Repare: uma chave pedida de novo já está **perto da raiz**. Essa é a vantagem da árvore splay.',
        'Feitiços gastam mana (`E` medita, `Q` poção). O chefe ataca a cada ' + (o.every || 5) + ' turnos e contra-ataca nos erros. `H` dá uma dica. Zere a vida do chefe para vencer.'] },
      'heroi-final': { kicker:'Capítulo 3 · Como jogar', title:'O Trono das Raízes', intro:'O chefe final mistura as duas masmorras. Tudo o que você aprendeu nos capítulos 1 e 2 vale aqui.', button:'Enfrentar o rei', steps:[
        'O Rei das Raízes **alterna as masmorras**: um desafio na rubro-negra, outro na splay, e assim por diante. Uma faixa avisa cada troca.',
        '**Na rubro-negra:** leve a chave até a vaga e corrija com Selar, Recolorir, Giro simples, Giro duplo ou Pintar a raiz (`1` a `5`).',
        '**Na splay:** encontre a sala pedida e suba-a com Zig, Zig-zig ou Zig-zag (`1` a `3`).',
        'O rei tem mais vida e ataca a cada ' + (o.every || 4) + ' turnos. Use `E` (meditar), `Q` (poção) e `H` (dica) com cuidado.',
        'O **Grimório**, à direita, sempre mostra as regras da masmorra do momento.'] },
      'arena-teams': { kicker:'Arena · modo equipes', title:'Como funciona a partida', intro:'Leia estes passos para a turma antes de começar.', button:'Ir para as equipes', steps:[
        'Cada equipe precisa de quatro cartões: **A ▲**, **B ◆**, **C ●** e **D ■**. Podem ser folhas de papel com a letra ou a forma.',
        'No telão aparecem a **pergunta**, a **árvore** e quatro opções coloridas. O cronômetro corre no topo.',
        'As equipes **discutem** e, antes de o tempo acabar, **levantam o cartão** com a resposta. Vale o primeiro cartão levantado.',
        'O professor clica **Revelar agora**, ou espera o tempo acabar. A opção certa fica destacada, com a explicação.',
        'Marque as equipes que **acertaram** e clique **Confirmar pontos** (1.000 por acerto). Depois **Ver placar** e **Próxima pergunta**.',
        'Se a turma travar, `H` mostra uma **dica** no telão: a 1ª camada diz o que olhar, a 2ª mostra o raciocínio. **Explicar em tela cheia** amplia a explicação.'] },
      'arena-live': { kicker:'Arena · sala ao vivo', title:'Como funciona a partida', intro:'Os alunos jogam pelo celular e o telão conduz a partida.', button:'Abrir a sala', steps:[
        'Peça aos alunos que **abram este mesmo artefato** no celular e digitem um **apelido**. Os nomes aparecem no telão.',
        'Clique **Começar**. Cada pergunta aparece no telão e nos celulares, com o cronômetro.',
        'Os alunos **tocam numa das quatro opções**. Acertar rápido vale mais: até 1.000 pontos, com bônus de 100 a partir de 3 acertos seguidos.',
        'Quando todos respondem, ou o tempo acaba, a resposta é **revelada**. O telão mostra quantos escolheram cada opção; cada celular mostra o resultado e, para quem errou, uma janela com a explicação.',
        'Use **Ver placar** e **Próxima pergunta**. No fim aparece o pódio.',
        '`H` ou **Mostrar dica** libera uma dica para todos, sem desconto. A dica que o aluno abre sozinho no celular tira 25% dos pontos daquela pergunta.'] },
      'arena-student': { kicker:'Arena · como jogar', title:'Você entrou na arena', button:'Entendi', steps:[
        'Aguarde o professor começar. Cada pergunta aparece aqui e no telão.',
        'Olhe a **árvore** e toque na opção certa antes de o tempo acabar. Você só pode responder uma vez.',
        'Acertar **rápido** vale mais pontos, até 1.000 por pergunta.',
        'Travou? O botão **Dica** ajuda, mas cada camada tira 25% dos pontos daquela pergunta.',
        'Na revelação você vê se acertou, sua pontuação e sua posição. Se errar, uma janela explica a resposta certa.'] },
      'perg-bst': { kicker:'Andar 1 · Como jogar', title:'O Corredor da Busca', intro:'Em cada desafio aparece uma árvore binária de busca e uma chave nova.', button:'Começar o andar', svgs:[exBST()], steps:[
        'Leia a **chave nova** no título do desafio.',
        'Partindo da **raiz**, compare: chave menor que a sala → desce pela **esquerda**; maior → pela **direita**. Continue até não haver sala.',
        'Clique na **vaga tracejada** onde a chave deve entrar.',
        'Se errar, você perde uma vida (♥) e o jogo aponta onde o caminho desviou. Tente de novo.',
        'São 5 desafios e 3 vidas. Nenhum erro dá 3 estrelas, um erro dá 2 e mais erros dão 1.'] },
      'perg-avl': { kicker:'Andar 2 · Como jogar', title:'A Balança do Equilíbrio', intro:'A chave nova (contorno verde) já entrou na árvore AVL e desequilibrou alguma sala.', button:'Começar o andar', svgs: exAVL(), steps:[
        'Suba da chave nova em direção à raiz e calcule o **fb** de cada sala: altura da esquerda menos altura da direita.',
        'Clique na sala desequilibrada **mais baixa**, a primeira com fb +2 ou −2.',
        'Escolha a **rotação**. 1ª letra: o lado mais fundo da sala (L esquerda, R direita). 2ª letra: o lado do filho onde a chave entrou.',
        'LL e RR são rotações simples; LR e RL são duplas. Depois da rotação, todos os fb voltam para −1, 0 ou +1.',
        'São 5 desafios e 3 vidas. Cada erro mostra uma pista.'] },
      'perg-rb': { kicker:'Andar 3 · Como jogar', title:'A Cripta Rubro-Negra', intro:'A chave nova entrou vermelha (X). Decida, passo a passo, como deixar a árvore válida.', button:'Começar o andar', svgs: exRB(), steps:[
        'Observe as marcas: **X** (chave em conflito), **P** (pai), **T** (tio) e **A** (avô). NIL é uma vaga vazia e conta como preta.',
        'X é a raiz e está vermelha? Então **Pintar a raiz**. O pai é preto? Então **Nada a fazer**.',
        'Pai e **tio vermelhos**: **Recolorir**. O conflito pode subir para o avô, que vira o novo X; decida de novo.',
        'Pai vermelho e **tio preto ou NIL**: X, P e A em linha reta → **Rotação simples**; em zigue-zague → **Rotação dupla**.',
        'Escolha com o mouse ou com as teclas `1` a `5`. São 5 desafios e 3 vidas.'] },
      'perg-splay': { kicker:'Andar 4 · Como jogar', title:'A Escada Giratória', intro:'A sala acessada (X) precisa subir até a raiz.', button:'Começar o andar', svgs: exSplay(), steps:[
        'Observe **X** (sala acessada), **P** (pai) e **A** (avô).',
        'O pai é a raiz? Escolha **Zig**.',
        'X e o pai são filhos do **mesmo lado**? Escolha **Zig-zig**. De **lados opostos**? Escolha **Zig-zag**.',
        'Repita até X chegar à raiz. Escolha com o mouse ou com as teclas `1` a `3`.',
        'São 4 desafios e 3 vidas.'] },
      'perg-boss': { kicker:'Andar 5 · Como jogar', title:'O Guardião das Raízes', intro:'O chefão mistura os quatro andares.', button:'Enfrentar o guardião', steps:[
        'São **8 desafios** seguidos, sorteados entre BST, AVL, rubro-negra e splay, com as mesmas **3 vidas**.',
        'O rótulo no topo de cada desafio diz **qual árvore** é. Use a regra daquele andar.',
        'O quadro **Regra do andar**, à direita, muda junto com o desafio.',
        'Vencer o guardião conclui a era das árvores de busca.'] }
    };
    var c = I[kind]; c.tone = 'info'; return c;
  }

  return { step:step, explainStep:explainStep, avl:avl, explainAVL:explainAVL, avlFind:avlFind, rb:rb, explainRB:explainRB, splay:splay, explainSplay:explainSplay,
    insert:insert, search:search, trav:trav, svgTree:svgTree, modal:modal, close:close, isOpen:isOpen, RBN:RBN, intro:intro };
})(Engine);
