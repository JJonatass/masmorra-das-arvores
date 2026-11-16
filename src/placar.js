/* Placar: rankings online por jogo (Vercel), com reserva neste aparelho quando não há conexão.
   Quadros: huffman e trie (média de tempo por letra), splay (tempo total), arena (acertos; desempate pelo tempo)
   e geral (Queda + Herói, só leitura aqui; quem grava é o Ranking).
   O nome do jogador (3 caracteres) é o mesmo em todos os jogos. */
var Placar = (function(){
  'use strict';
  var API = 'https://masmorra-das-arvores.vercel.app/api/ranking';
  try { if (/^https?:$/.test(location.protocol) && /masmorra-das-arvores.*\.vercel\.app$/.test(location.hostname)) API = '/api/ranking'; } catch (e) {}
  var PKEY = 'masmorra-jogador';
  var BOARDS = {
    geral:   { title: 'Ranking geral', sub: 'Queda das Chaves + Herói da Cripta', kind: 'geral' },
    arena:   { title: 'Arena individual', sub: '15 perguntas · acertos, e no empate o menor tempo', kind: 'hits' },
    huffman: { title: 'Forja de Huffman', sub: 'média de tempo por letra', kind: 'time', per: 'letra', plural: 'letras' },
    trie:    { title: 'Biblioteca dos Ecos', sub: 'média de tempo por letra', kind: 'time', per: 'letra', plural: 'letras' },
    splay:   { title: 'Mercado da Torre', sub: 'tempo total do dia', kind: 'time', unit: 'fregueses' }
  };
  var GROUPS = { pontos: ['geral', 'arena'], tempo: ['huffman', 'trie', 'splay'] };

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  function fmtT(ms){ if (ms == null || isNaN(ms)) return '–'; var d = Math.floor(ms / 100), m = Math.floor(d / 600), s = Math.floor(d / 10) % 60; return m + ':' + (s < 10 ? '0' : '') + s + ',' + (d % 10); }
  function fmtPer(ms){ if (ms == null || isNaN(ms)) return '–'; return (ms / 1000).toFixed(2).replace('.', ',') + ' s'; }
  function fmtN(n){ return (+n || 0).toLocaleString('pt-BR'); }
  function cleanTag(t){ return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3); }

  /* ---------- jogador (o mesmo do ranking geral) ---------- */
  function player(){
    var p = null; try { p = JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch (e) {}
    if (!p || !p.id) { var id = ''; for (var i = 0; i < 20; i++) id += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]; p = { id: id, tag: '', queda: 0, heroi: {}, pending: false }; save(p); }
    if (p.tag && p.tag !== cleanTag(p.tag)) { p.tag = cleanTag(p.tag); p.pending = true; save(p); }
    return p;
  }
  function save(p){ try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) {} }
  function setTag(t){ var p = player(); if (p.tag !== t) { p.tag = t; if (p.queda || Object.keys(p.heroi || {}).length) p.pending = true; save(p); } }

  /* ---------- servidor ---------- */
  function req(url, opt){
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var to = setTimeout(function(){ if (ctl) ctl.abort(); }, 8000);
    opt = opt || {}; if (ctl) opt.signal = ctl.signal; opt.cache = 'no-store';
    return fetch(url, opt).then(function(r){ clearTimeout(to); if (!r.ok) throw new Error('http ' + r.status); return r.json(); }, function(e){ clearTimeout(to); throw e; });
  }
  function get(board, tag){
    var p = player(), q = '?id=' + encodeURIComponent(p.id);
    if (board !== 'geral') q += '&board=' + board + (tag ? '&tag=' + encodeURIComponent(tag) : '');
    return req(API + q);
  }
  function post(board, rec){
    var p = player(), body = { board: board, id: p.id, tag: p.tag }, k;
    for (k in rec) body[k] = rec[k];
    return req(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  /* ---------- reserva local (sem conexão) ---------- */
  function lkey(b){ return 'masmorra-placar-' + b; }
  function lload(b){ try { var a = JSON.parse(localStorage.getItem(lkey(b)) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function lsave(b, a){ try { localStorage.setItem(lkey(b), JSON.stringify(a)); } catch (e) {} }
  function rowOf(b, rec){ var c = BOARDS[b], r = { ms: rec.ms, n: rec.n, errs: rec.errs || 0, hints: rec.hints || 0, at: rec.at || Date.now() };
    if (c.kind === 'hits') { r.hits = rec.hits; r.errs = rec.n - rec.hits; r.hints = 0; } else r.v = c.per ? Math.round(rec.ms / rec.n) : rec.ms;
    return r; }
  function cmp(b, x, y){ if (BOARDS[b].kind === 'hits') return y.hits - x.hits || x.ms - y.ms || (x.at || 0) - (y.at || 0); return x.v - y.v || x.ms - y.ms || (x.at || 0) - (y.at || 0); }
  function local(b, tag){
    var a = lload(b).sort(function(x, y){ return cmp(b, x, y); });
    var top = a.slice(0, 10).map(function(r, i){ var o = {}, k; for (k in r) o[k] = r[k]; o.pos = i + 1; o.me = !!tag && r.tag === tag; return o; });
    return { ok: true, board: b, top: top, players: a.length, me: null, local: true };
  }
  function ladd(b, tag, rec){
    var a = lload(b), r = rowOf(b, rec); r.tag = tag;
    var old = a.filter(function(x){ return x.tag === tag; })[0];
    if (old && cmp(b, old, r) <= 0) return false;
    a = a.filter(function(x){ return x.tag !== tag; }); a.push(r); a.sort(function(x, y){ return cmp(b, x, y); }); lsave(b, a.slice(0, 30));
    return true;
  }
  /* posição que um resultado teria no top 10 (1..10), ou 0 */
  function placeIn(b, top, rec){
    var r = rowOf(b, rec); r.at = Date.now() + 1;
    var pos = top.filter(function(x){ return cmp(b, x, r) <= 0; }).length + 1;
    return pos <= 10 ? pos : 0;
  }

  /* ---------- tabela ---------- */
  var MED = ['#F2C14E', '#C9D3E3', '#D69A5C'];
  function valCell(b, r){
    var c = BOARDS[b], sub = '';
    if (c.kind === 'geral') return '<b>' + fmtN(r.total) + '</b>';
    if (c.kind === 'hits') return '<b>' + r.hits + '/' + r.n + '</b><small>' + fmtT(r.ms) + '</small>';
    if (c.per) sub = fmtT(r.ms) + ' ÷ ' + r.n + ' ' + c.plural; else sub = r.n + ' ' + c.unit;
    return '<b>' + (c.per ? fmtPer(r.v) : fmtT(r.v)) + '</b><small>' + sub + '</small>';
  }
  function detCell(b, r){
    var c = BOARDS[b], n = function(x, one, many){ return (x || 0) + ' ' + (x === 1 ? one : many); };
    if (c.kind === 'geral') return 'Queda ' + fmtN(r.queda) + ' · Herói ' + fmtN(r.heroi);
    if (c.kind === 'hits') return n(r.errs, 'erro', 'erros');
    return n(r.errs, 'erro', 'erros') + ' · ' + n(r.hints, 'dica', 'dicas');
  }
  function valHead(b){ var c = BOARDS[b]; return c.kind === 'geral' ? 'Total' : c.kind === 'hits' ? 'Acertos' : c.per ? 'Por ' + c.per : 'Tempo'; }
  function table(b, d){
    if (!d.top.length) return '<p class="pl-empty">Ninguém no ranking ainda. Seja o primeiro!</p>';
    return '<table class="pl-t"><thead><tr><th>#</th><th>Nome</th><th>Detalhes</th><th class="r">' + valHead(b) + '</th></tr></thead><tbody>' +
      d.top.map(function(r, i){
        return '<tr class="' + (i < 3 ? 'm' + (i + 1) : '') + (r.me ? ' me' : '') + '"><td class="pos">' + (i < 3 ? '<i style="background:' + MED[i] + '">' + r.pos + 'º</i>' : r.pos + 'º') + '</td>' +
          '<td class="tag"' + (i < 3 ? ' style="color:' + MED[i] + '"' : '') + '>' + esc(r.tag) + (r.me ? '<span class="you">você</span>' : '') + '</td>' +
          '<td class="det">' + detCell(b, r) + '</td><td class="r val">' + valCell(b, r) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function meLine(b, d){
    if (!d.me || d.me.pos <= 10) return '';
    return '<p class="pl-me">' + esc(d.me.tag) + ' está em <b>' + d.me.pos + 'º</b> de ' + d.players + ', com ' + valCell(b, d.me).replace(/<small>.*<\/small>/, '').replace(/<\/?b>/g, '') + '.</p>';
  }

  /* ---------- janela ---------- */
  var CSS = '#pl{position:fixed;inset:0;z-index:9500;background:rgba(8,7,12,.85);display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow:auto}' +
    '#pl .box{margin:auto;max-width:720px;width:100%;background:#23222F;border:2px solid #F2C14E;border-radius:16px;padding:18px 20px;box-shadow:0 20px 60px rgba(0,0,0,.6);color:#ECE3CF;font-family:\'Alegreya Sans\',\'Trebuchet MS\',sans-serif;font-size:17px;line-height:1.45}' +
    '#pl .kick{margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#F2C14E}' +
    '#pl h2{font-family:\'IM Fell English SC\',Georgia,serif;font-weight:400;font-size:30px;line-height:1.1;margin:4px 0 4px}' +
    '#pl .sub{margin:0 0 10px;color:#A9A1B8;font-size:15px}' +
    '#pl .tabs{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 12px}' +
    '#pl .tabs button{background:#2E2C3D;color:#ECE3CF;border:1px solid #45425A;border-radius:999px;padding:6px 14px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit}' +
    '#pl .tabs button[aria-selected="true"]{background:#F2C14E;color:#1d1408;border-color:#F2C14E}' +
    '#pl .pl-t{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}' +
    '#pl th{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#A9A1B8;text-align:left;padding:4px 10px;font-weight:700}' +
    '#pl td{padding:8px 10px;border-top:1px solid #45425A;vertical-align:middle}' +
    '#pl .r{text-align:right}' +
    '#pl td.pos{font-weight:800;width:3ch;white-space:nowrap}' +
    '#pl td.pos i{font-style:normal;display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;color:#1d1408;font-size:14px}' +
    '#pl td.tag{font-family:\'IM Fell English SC\',Georgia,serif;font-size:20px;letter-spacing:.1em;white-space:nowrap}' +
    '#pl tr.m1 td.tag,#pl tr.m2 td.tag,#pl tr.m3 td.tag{font-size:26px}' +
    '#pl tr.m1 td{background:rgba(242,193,78,.09)} #pl tr.m2 td{background:rgba(201,211,227,.06)} #pl tr.m3 td{background:rgba(214,154,92,.06)}' +
    '#pl tr.me td{background:rgba(242,169,59,.18)}' +
    '#pl .you{font-family:\'Alegreya Sans\',sans-serif;font-size:12px;letter-spacing:0;color:#F2A93B;font-weight:700;margin-left:6px}' +
    '#pl td.det{color:#A9A1B8;font-size:14px}' +
    '#pl td.val b{font-size:19px;white-space:nowrap} #pl td.val small{display:block;font-size:13px;color:#A9A1B8;white-space:nowrap}' +
    '#pl .pl-empty{color:#A9A1B8} #pl .pl-me{margin:10px 0 0;font-size:15px} #pl .pl-me b{color:#F2A93B}' +
    '#pl .pl-msg{margin:0 0 10px;font-size:17px;color:#B7F0CC} #pl .pl-warn{margin:0 0 10px;font-size:15px;color:#F2A93B}' +
    '#pl form{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:6px 0 6px}' +
    '#pl input{width:5.2ch;font-size:36px;font-weight:800;letter-spacing:.25em;text-transform:uppercase;text-align:center;background:#121119;color:#F2C14E;border:2px solid #F2C14E;border-radius:10px;padding:4px 6px 4px 14px;font-family:\'IM Fell English SC\',Georgia,serif}' +
    '#pl .btn{border-radius:10px;padding:10px 18px;font-weight:800;font-size:16px;cursor:pointer;font-family:inherit;background:#2E2C3D;color:#ECE3CF;border:1px solid #45425A}' +
    '#pl .btn.primary{background:#F2A93B;color:#1d1408;border-color:#F2A93B}' +
    '#pl kbd{font-family:inherit;font-size:12px;font-weight:700;border:1px solid currentColor;border-radius:5px;padding:0 5px;opacity:.85}' +
    '#pl .err{color:#E5604A;margin:0 0 8px;font-size:15px;min-height:1em}' +
    '#pl .foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap}' +
    '#pl .note{margin:0;color:#A9A1B8;font-size:14px;flex:1 1 280px}' +
    '@media (max-width:600px){#pl td{padding:7px 5px}#pl td.det{font-size:13px}#pl td.tag{font-size:18px}#pl h2{font-size:26px}}';
  var styled = false, box = null, onClose = null;
  function style(){ if (styled) return; styled = true; var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
  function isOpen(){ return !!box; }
  function close(){ if (!box) return; box.remove(); box = null; var cb = onClose; onClose = null; if (cb) cb(); }
  function open(cb){
    style(); if (box) box.remove();
    onClose = cb || null;
    box = document.createElement('div'); box.id = 'pl'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'pl-title');
    box.innerHTML = '<div class="box"></div>'; document.body.appendChild(box);
    box.addEventListener('click', function(e){ if (e.target === box) close(); });
    box.addEventListener('keydown', function(e){ if (e.key === 'Escape') { e.preventDefault(); close(); } e.stopPropagation(); });
    return box.querySelector('.box');
  }
  function foot(b, d, label){
    var c = BOARDS[b], note = c.kind === 'geral' ? 'Total = recorde na Queda das Chaves + soma dos recordes de cada capítulo do Herói da Cripta.'
      : c.kind === 'hits' ? '1 ponto por acerto nas 15 perguntas. Empate: vence o menor tempo total de resposta.'
      : (c.per ? 'Média = tempo total ÷ ' + c.plural + ' da rodada. ' : '') + 'Tempo = cronômetro + penalidades (erro +10 s, dica +5 s ou +15 s).';
    if (d && d.local) note += ' Sem conexão: este é o ranking deste aparelho.';
    else if (d && c.kind !== 'geral') note += ' Uma linha por nome, com o melhor resultado.';
    return '<div class="foot"><p class="note">' + esc(note) + '</p><button class="btn" type="button" data-pl="close">' + esc(label || 'Fechar') + ' <kbd>Esc</kbd></button></div>';
  }
  function wire(el){
    var c = el.querySelector('[data-pl="close"]'); if (c) { c.addEventListener('click', close); setTimeout(function(){ try { (el.querySelector('input') || c).focus({ preventScroll: true }); } catch (e) {} }, 30); }
  }
  function tabsHTML(group, b){
    if (!group) return '';
    return '<div class="tabs" role="tablist">' + GROUPS[group].map(function(k){ return '<button type="button" role="tab" data-tab="' + k + '" aria-selected="' + (k === b) + '">' + esc(BOARDS[k].title) + '</button>'; }).join('') + '</div>';
  }
  /* mostra um quadro; group ('pontos' ou 'tempo') mostra abas para os outros quadros do grupo */
  function show(b, o){
    o = o || {}; var el = box && o.keep ? box.querySelector('.box') : open(o.onClose);
    var title = o.group === 'pontos' ? 'Ranking por pontos' : o.group === 'tempo' ? 'Ranking por tempo' : 'Os 10 melhores';
    function paint(d){
      if (!box) return;
      el.innerHTML = '<p class="kick">' + esc(BOARDS[b].title) + (d && !d.local ? ' · ' + d.players + (d.players === 1 ? ' jogador' : ' jogadores') : '') + '</p>' +
        '<h2 id="pl-title">' + esc(title) + '</h2>' + tabsHTML(o.group, b) + '<p class="sub">' + esc(BOARDS[b].sub) + '</p>' +
        (o.msg ? '<p class="pl-msg">' + esc(o.msg) + '</p>' : '') + (o.warn ? '<p class="pl-warn">' + esc(o.warn) + '</p>' : '') +
        (d ? table(b, d) + meLine(b, d) : '<p class="pl-empty">Carregando…</p>') + foot(b, d);
      [].forEach.call(el.querySelectorAll('[data-tab]'), function(t){ t.addEventListener('click', function(){ show(t.dataset.tab, { group: o.group, keep: true }); }); });
      wire(el);
    }
    paint(null);
    var tag = player().tag || null;
    var src = o.data ? Promise.resolve(o.data) : get(b, b === 'geral' ? null : tag);
    src.then(paint, function(){
      if (b === 'geral') { if (!box) return; el.innerHTML = '<p class="kick">Ranking geral</p><h2 id="pl-title">' + esc(title) + '</h2>' + tabsHTML(o.group, b) + '<p class="pl-warn">Sem conexão com o ranking. Os seus pontos ficam guardados neste aparelho e são enviados quando houver internet.</p>' + foot(b, null); [].forEach.call(el.querySelectorAll('[data-tab]'), function(t){ t.addEventListener('click', function(){ show(t.dataset.tab, { group: o.group, keep: true }); }); }); wire(el); return; }
      paint(local(b, tag));
    });
  }
  function showGroup(group, b){ show(b || GROUPS[group][0], { group: group }); }

  /* ---------- fim de rodada ----------
     rec: tempo { ms, n, errs, hints } · arena { hits, ms, n }
     Se entrar no top 10, pede o nome (sugere o último usado) e grava. Se não entrar e o jogador já tem nome, grava em silêncio. */
  function after(b, rec, onDone){
    var p = player(), online = true;
    get(b, p.tag || null).catch(function(){ online = false; return local(b, p.tag); }).then(function(d){
      var place = placeIn(b, d.top, rec);
      if (!place) {
        if (online && p.tag) post(b, rec).catch(function(){});
        else if (!online && p.tag) ladd(b, p.tag, rec);
        if (onDone) onDone(null); return;
      }
      ask(b, rec, place, online, d, onDone);
    });
  }
  function ask(b, rec, place, online, d, onDone){
    var el = open(), p = player(), c = BOARDS[b];
    var val = c.kind === 'hits' ? rec.hits + ' de ' + rec.n + ' acertos em ' + fmtT(rec.ms) : c.per ? fmtPer(Math.round(rec.ms / rec.n)) + ' por ' + c.per : fmtT(rec.ms);
    var mine = p.tag && d.top.filter(function(r){ return r.tag === p.tag; })[0];
    el.innerHTML = '<p class="kick">' + esc(c.title) + '</p><h2 id="pl-title">Você entrou no top 10!</h2>' +
      '<p style="margin:0 0 6px">Seu resultado, <b style="color:#F2C14E">' + esc(val) + '</b>, fica em <b style="color:#F2C14E">' + place + 'º lugar</b>. Escreva seu nome com até 3 caracteres:</p>' +
      (mine ? '<p class="note" style="margin:0 0 6px">' + esc(p.tag) + ' já está no ranking. Se você é outra pessoa, troque o nome.</p>' : '') +
      '<form id="pl-form"><input id="pl-tag" maxlength="3" autocomplete="off" spellcheck="false" aria-label="Nome com até 3 caracteres" value="' + esc(p.tag || '') + '"><button class="btn primary" type="submit">Gravar <kbd>Enter</kbd></button></form><p class="err" id="pl-err"></p>' +
      (online ? '' : '<p class="pl-warn">Sem conexão: o resultado fica no ranking deste aparelho.</p>') + foot(b, online ? null : d, 'Pular');
    onClose = function(){ if (onDone) onDone(null); };
    var inp = el.querySelector('#pl-tag');
    inp.addEventListener('input', function(){ var v = cleanTag(inp.value); if (v !== inp.value) inp.value = v; });
    el.querySelector('#pl-form').addEventListener('submit', function(e){
      e.preventDefault(); var v = cleanTag(inp.value);
      if (!v) { el.querySelector('#pl-err').textContent = 'Escreva pelo menos 1 caractere.'; inp.focus(); return; }
      setTag(v); var done = onDone; onClose = null;
      var fin = function(data, msg, warn){ show(b, { data: data, msg: msg, warn: warn, keep: true, onClose: function(){ if (done) done(data); } }); onClose = function(){ if (done) done(data); }; };
      if (!online) { ladd(b, v, rec); fin(local(b, v), 'Gravado neste aparelho.'); return; }
      el.querySelector('#pl-err').textContent = 'Gravando…';
      post(b, rec).then(function(r){
        fin(r, r.improved === false ? v + ' já tinha um resultado melhor, que foi mantido.' : 'Gravado! ' + v + ' está em ' + (r.me ? r.me.pos + 'º' : '') + ' lugar.');
      }, function(){ ladd(b, v, rec); fin(local(b, v), null, 'Não foi possível falar com o servidor: o resultado ficou guardado neste aparelho.'); });
    });
    wire(el);
  }

  return { show: show, showGroup: showGroup, after: after, isOpen: isOpen, close: close, player: player, cleanTag: cleanTag, fmtT: fmtT, fmtPer: fmtPer, BOARDS: BOARDS, _local: local, _placeIn: placeIn };
})();
if (typeof module !== 'undefined') module.exports = Placar;
