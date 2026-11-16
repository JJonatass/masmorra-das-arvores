/* Ranking compartilhado: soma o recorde da Queda das Chaves com os recordes do Herói da Cripta. */
var Ranking = (function(){
  'use strict';
  var API = 'https://masmorra-das-arvores.vercel.app/api/ranking';
  try { if (/^https?:$/.test(location.protocol) && /masmorra-das-arvores.*\.vercel\.app$/.test(location.hostname)) API = '/api/ranking'; } catch (e) {}
  var KEY = 'masmorra-jogador';
  var GOLD = ['#F2C14E', '#C9CCD6', '#CD8B5A'];

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  function fmt(n){ return (+n || 0).toLocaleString('pt-BR'); }
  function newId(){ var s = ''; for (var i = 0; i < 20; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]; return s; }
  function cleanTag(t){ return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); }

  /* ---------- jogador local ---------- */
  var mem = null;
  function player(){
    try { var raw = localStorage.getItem(KEY); if (raw) { var d = JSON.parse(raw); if (!mem) mem = d; else { for (var k in mem) delete mem[k]; for (var j in d) mem[j] = d[j]; } } } catch (e) {}
    if (!mem || !mem.id) mem = { id: newId(), tag: '', queda: 0, heroi: {}, pending: false };
    if (!mem.heroi) mem.heroi = {};
    save(); return mem;
  }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} }
  function heroiTotal(p){ p = p || player(); var t = 0; for (var k in p.heroi) t += +p.heroi[k] || 0; return t; }
  function totals(){ var p = player(); return { queda: p.queda || 0, heroi: heroiTotal(p), total: (p.queda || 0) + heroiTotal(p) }; }
  function recordQueda(score){ var p = player(), novo = score > (p.queda || 0); if (novo) { p.queda = Math.floor(score); p.pending = true; save(); } return novo; }
  function recordHeroi(chapter, score){ var p = player(), novo = score > (p.heroi[chapter] || 0); if (novo) { p.heroi[chapter] = Math.floor(score); p.pending = true; save(); } return { novo: novo, best: p.heroi[chapter] || 0 }; }

  /* ---------- servidor ---------- */
  function get(){ return fetch(API + '?id=' + encodeURIComponent(player().id), { cache: 'no-store' }).then(function(r){ if (!r.ok) throw new Error('http ' + r.status); return r.json(); }); }
  function post(){
    var p = player(), t = totals();
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, tag: p.tag, queda: t.queda, heroi: t.heroi }) })
      .then(function(r){ return r.json().then(function(d){ if (!r.ok || !d.ok) throw new Error(d.error || ('http ' + r.status)); p.pending = false; save(); return d; }); });
  }
  function init(){ var p = player(); if (p.pending && p.tag) post().catch(function(){}); }

  /* ---------- janela ---------- */
  var box = null, onClose = null;
  function close(){ if (!box) return; box.remove(); box = null; var cb = onClose; onClose = null; if (cb) cb(); }
  window.addEventListener('keydown', function(e){
    if (!box) return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  }, true);
  function open(inner, cb){
    if (box) { box.remove(); box = null; }
    onClose = cb || null;
    box = document.createElement('div');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'rk-title');
    box.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(8,7,12,.85);display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow:auto';
    box.innerHTML = '<div style="margin:auto;max-width:720px;width:100%;background:#23222F;border:2px solid #F2C14E;border-radius:16px;padding:18px 20px;box-shadow:0 20px 60px rgba(0,0,0,.6);color:#ECE3CF;font-family:\'Alegreya Sans\',\'Trebuchet MS\',sans-serif" id="rk-panel">' + inner + '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function(e){ var b = e.target.closest('[data-rk]'); if (b && b.dataset.rk === 'close') close(); if (b && b.dataset.rk === 'show') { var cb = onClose; onClose = null; show(null, cb); } });
    var f = box.querySelector('input,[data-rk]'); if (f) setTimeout(function(){ try { f.focus({ preventScroll:true }); } catch (e) {} }, 30);
  }
  var BTN = 'border:none;border-radius:10px;padding:10px 20px;font-weight:800;font-size:16px;cursor:pointer;font-family:inherit';
  function head(kicker, title){ return '<p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#F2C14E">' + esc(kicker) + '</p><h2 id="rk-title" style="font-family:\'IM Fell English SC\',Georgia,serif;font-weight:400;font-size:32px;line-height:1.1;margin:4px 0 12px">' + esc(title) + '</h2>'; }
  function btns(list){ return '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;margin-top:16px">' + list.join('') + '</div>'; }
  function primary(label, attr){ return '<button type="button" ' + attr + ' style="' + BTN + ';background:#F2A93B;color:#1d1408">' + esc(label) + '</button>'; }
  function second(label, attr){ return '<button type="button" ' + attr + ' style="' + BTN + ';background:#2E2C3D;color:#ECE3CF;border:1px solid #45425A">' + esc(label) + '</button>'; }
  function mine(){ var t = totals(); return '<p style="margin:12px 0 0;color:#A9A1B8;font-size:15px">Seus recordes neste aparelho: Queda <b style="color:#ECE3CF">' + fmt(t.queda) + '</b> + Herói <b style="color:#ECE3CF">' + fmt(t.heroi) + '</b> = <b style="color:#F2A93B">' + fmt(t.total) + '</b>' + (player().tag ? ' · nome <b style="color:#ECE3CF">' + esc(player().tag) + '</b>' : '') + '</p>'; }

  function table(d){
    if (!d.top.length) return '<p style="color:#A9A1B8">Ninguém no ranking ainda. Seja o primeiro!</p>';
    var rows = d.top.map(function(r, i){
      var medal = i < 3, c = medal ? GOLD[i] : '#45425A', bg = medal ? 'rgba(242,193,78,' + (0.16 - i * 0.04) + ')' : '#2E2C3D';
      return '<tr style="background:' + bg + ';outline:' + (r.me ? '2px solid #F2A93B' : 'none') + ';outline-offset:-2px">' +
        '<td style="padding:' + (medal ? '12px' : '8px') + ' 10px;width:56px"><span style="display:inline-grid;place-items:center;width:' + (medal ? 38 : 30) + 'px;height:' + (medal ? 38 : 30) + 'px;border-radius:50%;background:' + (medal ? c : 'transparent') + ';color:' + (medal ? '#1d1408' : '#A9A1B8') + ';border:' + (medal ? 'none' : '1px solid #45425A') + ';font-weight:800;font-size:' + (medal ? 18 : 15) + 'px">' + r.pos + 'º</span></td>' +
        '<td style="padding:8px 10px;font-weight:800;font-size:' + (medal ? 24 : 18) + 'px;letter-spacing:.08em;font-family:\'IM Fell English SC\',Georgia,serif;color:' + (medal ? c : '#ECE3CF') + '">' + esc(r.tag) + (r.me ? ' <span style="font-family:inherit;font-size:12px;letter-spacing:0;color:#F2A93B;font-weight:700;vertical-align:middle">você</span>' : '') + '</td>' +
        '<td style="padding:8px 10px;text-align:right;font-variant-numeric:tabular-nums;color:#D9D0BE">' + fmt(r.queda) + '</td>' +
        '<td style="padding:8px 10px;text-align:right;font-variant-numeric:tabular-nums;color:#D9D0BE">' + fmt(r.heroi) + '</td>' +
        '<td style="padding:8px 10px;text-align:right;font-variant-numeric:tabular-nums;font-weight:800;font-size:' + (medal ? 20 : 17) + 'px;color:' + (medal ? c : '#ECE3CF') + '">' + fmt(r.total) + '</td></tr>';
    }).join('');
    return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:separate;border-spacing:0 6px;font-size:16px"><thead><tr style="color:#A9A1B8;font-size:12px;letter-spacing:.08em;text-transform:uppercase"><th style="text-align:left;padding:0 10px">Pos.</th><th style="text-align:left;padding:0 10px">Nome</th><th style="text-align:right;padding:0 10px">Queda</th><th style="text-align:right;padding:0 10px">Herói</th><th style="text-align:right;padding:0 10px">Total</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function show(note, cb){
    open(head('Ranking geral', 'Os 10 maiores da masmorra') + '<p style="color:#A9A1B8">Carregando…</p>', cb);
    get().then(function(d){
      if (!box) return;
      var meLine = d.me && d.me.pos > 10 ? '<p style="margin:10px 0 0;font-size:15px">Você está em <b style="color:#F2A93B">' + d.me.pos + 'º</b> de ' + d.players + ' jogadores, com ' + fmt(d.me.total) + ' pontos.</p>' : '';
      box.querySelector('#rk-panel').innerHTML = head('Ranking geral · ' + d.players + (d.players === 1 ? ' jogador' : ' jogadores'), 'Os 10 maiores da masmorra') +
        (note ? '<p style="margin:0 0 10px;font-size:17px;color:#B7F0CC">' + esc(note) + '</p>' : '') +
        '<p style="margin:0 0 6px;color:#A9A1B8;font-size:15px">Total = recorde na Queda das Chaves + soma dos recordes de cada capítulo do Herói da Cripta.</p>' +
        table(d) + meLine + mine() + btns([primary('Fechar', 'data-rk="close"')]);
      var c = box.querySelector('[data-rk="close"]'); if (c) c.focus({ preventScroll:true });
    }).catch(function(){
      if (!box) return;
      box.querySelector('#rk-panel').innerHTML = head('Ranking geral', 'Sem conexão com o ranking') +
        '<p>O ranking fica na internet. Sem conexão, os seus pontos continuam guardados neste aparelho e são enviados na próxima vez que houver internet.</p>' + mine() + btns([primary('Fechar', 'data-rk="close"')]);
    });
  }
  function askName(onDone){
    var p = player(), t = totals();
    open(head('Você entrou no top 10!', 'Deixe seu nome na masmorra') +
      '<p style="margin:0 0 12px;font-size:17px">Queda <b>' + fmt(t.queda) + '</b> + Herói <b>' + fmt(t.heroi) + '</b> = <b style="color:#F2A93B">' + fmt(t.total) + '</b> pontos. Escolha um nome de até <b>5 caracteres</b> (letras e números).</p>' +
      '<form id="rk-form" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><input id="rk-tag" maxlength="5" autocomplete="off" spellcheck="false" aria-label="Nome com até 5 caracteres" value="' + esc(p.tag) + '" style="width:9.5ch;font-size:34px;font-weight:800;letter-spacing:.25em;text-transform:uppercase;text-align:center;background:#121119;color:#F2C14E;border:2px solid #F2C14E;border-radius:10px;padding:6px 8px;font-family:\'IM Fell English SC\',Georgia,serif">' +
      '<span id="rk-count" style="color:#A9A1B8;font-size:14px"></span><p id="rk-err" style="flex-basis:100%;margin:0;color:#FFB3A6;font-size:14px;min-height:1.2em"></p>' +
      btns([second('Agora não', 'data-rk="close"'), '<button type="submit" style="' + BTN + ';background:#F2A93B;color:#1d1408">Salvar no ranking</button>']) + '</form>', onDone);
    var inp = box.querySelector('#rk-tag'), cnt = box.querySelector('#rk-count'), err = box.querySelector('#rk-err');
    function upd(){ var v = cleanTag(inp.value); if (v !== inp.value) inp.value = v; cnt.textContent = v.length + '/5'; err.textContent = ''; }
    inp.addEventListener('input', upd); upd(); setTimeout(function(){ try { inp.focus(); inp.select(); } catch (e) {} }, 40);
    box.querySelector('#rk-form').addEventListener('submit', function(e){
      e.preventDefault();
      var v = cleanTag(inp.value); if (!v) { err.textContent = 'Digite pelo menos 1 letra ou número.'; inp.focus(); return; }
      p.tag = v; p.pending = true; save();
      var sb = box.querySelector('button[type=submit]'); sb.disabled = true; sb.textContent = 'Salvando…';
      post().then(function(d){ var pos = d.me ? d.me.pos : null; onClose = null; show(pos ? 'Salvo! Você está em ' + pos + 'º lugar.' : 'Salvo!', onDone); })
        .catch(function(){ sb.disabled = false; sb.textContent = 'Salvar no ranking'; err.textContent = 'Não consegui falar com o ranking. Seus pontos ficaram guardados e serão enviados quando houver internet.'; });
    });
  }
  /* depois de cada partida: entra no top 10? então pede o nome (ou atualiza, se já tem nome) */
  function after(onDone){
    var t = totals(); if (!t.total) { if (onDone) onDone(); return; }
    get().then(function(d){
      var tenth = d.top.length < 10 ? -1 : d.top[9].total;
      var qualifies = t.total > tenth || (d.me && d.me.pos <= 10);
      var p = player();
      if (!qualifies) {
        if (p.tag && p.pending) post().catch(function(){});
        open(head('Ranking geral', 'Quase no top 10') + '<p style="font-size:17px">Sua soma: Queda <b>' + fmt(t.queda) + '</b> + Herói <b>' + fmt(t.heroi) + '</b> = <b style="color:#F2A93B">' + fmt(t.total) + '</b>. O 10º lugar tem <b>' + fmt(tenth) + '</b>: faltam <b style="color:#F2C14E">' + fmt(tenth - t.total + 1) + '</b> pontos.</p><p style="color:#A9A1B8">Melhore o recorde em qualquer um dos dois jogos: a soma conta.</p>' + btns([second('Ver ranking', 'data-rk="show"'), primary('Continuar', 'data-rk="close"')]), onDone);
        return;
      }
      if (p.tag) { post().then(function(d2){ show('Ranking atualizado: você está em ' + (d2.me ? d2.me.pos + 'º' : '') + ' lugar, como ' + p.tag + '.', onDone); }).catch(function(){ if (onDone) onDone(); }); return; }
      askName(onDone);
    }).catch(function(){ if (onDone) onDone(); });
  }

  init();
  return { player: player, totals: totals, recordQueda: recordQueda, recordHeroi: recordHeroi, after: after, show: show, askName: askName, isOpen: function(){ return !!box; }, _api: function(){ return API; } };
})();
