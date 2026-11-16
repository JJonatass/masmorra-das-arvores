/* Tempo: cronômetro com penalidades para a Forja de Huffman, a Biblioteca dos Ecos e o Mercado da Torre.
   O cronômetro para enquanto houver janela aberta (Hints ou ranking) ou a aba estiver escondida.
   O ranking (online, com reserva local) fica no Placar. */
var Tempo = (function(){
  function fmt(ms){ if (ms == null || isNaN(ms)) return '–'; var d = Math.floor(ms / 100), m = Math.floor(d / 600), s = Math.floor(d / 10) % 60; return m + ':' + (s < 10 ? '0' : '') + s + ',' + (d % 10); }
  function fmtPer(ms){ if (ms == null || isNaN(ms)) return '–'; return (ms / 1000).toFixed(2).replace('.', ',') + ' s'; }

  /* cfg: board ('huffman' | 'trie' | 'splay'), count(extra) -> letras ou fregueses, per (true = ranqueia pela média por letra),
          penalties: { err, h1, h2 } */
  function create(cfg){
    var BEST = 'masmorra-' + cfg.board + '-melhor';
    var P = cfg.penalties || { err: 10000, h1: 5000, h2: 15000 };
    var st = { ms: 0, pen: 0, last: null, live: false, total: null, v: null, n: null, newBest: false };

    function best(){ try { return +localStorage.getItem(BEST) || null; } catch (e) { return null; } }
    function fmtV(v){ return cfg.per ? fmtPer(v) : fmt(v); }
    function rankOpen(){ return typeof Placar !== 'undefined' && Placar.isOpen(); }
    function running(){ return st.live && !rankOpen() && !(window.Hints && Hints.isOpen()) && !document.hidden; }
    function tick(){
      var now = performance.now();
      if (st.last != null) { if (running()) st.ms += Math.min(now - st.last, 1000); st.last = now; }
      hud();
    }
    function shown(){ return st.live || st.total == null ? st.ms + st.pen : st.total; }
    function hud(){
      var e;
      if ((e = document.getElementById('time'))) e.textContent = fmt(shown());
      if ((e = document.getElementById('pen'))) e.textContent = '+' + Math.round(st.pen / 1000) + ' s';
      if ((e = document.getElementById('best'))) e.textContent = fmtV(best());
    }
    setInterval(tick, 100);
    document.addEventListener('visibilitychange', tick);

    function start(){ st.ms = 0; st.pen = 0; st.total = null; st.newBest = false; st.live = true; st.last = performance.now(); hud(); }
    function penalty(kind){ tick(); var v = typeof kind === 'number' ? kind : P[kind]; st.pen += v; hud(); return v / 1000; }
    /* encerra a rodada; extra: { errs, hints, ... } e o que count() precisar */
    function finish(extra){
      extra = extra || {};
      tick(); st.live = false; st.total = Math.round(st.ms + st.pen);
      st.n = Math.max(1, cfg.count(extra));
      st.v = cfg.per ? Math.round(st.total / st.n) : st.total;
      var b = best(); st.newBest = !b || st.v < b;
      if (st.newBest) { try { localStorage.setItem(BEST, String(st.v)); } catch (e) {} }
      hud();
      var total = st.total, rec = { ms: Math.max(1000, total), n: st.n, errs: extra.errs || 0, hints: extra.hints || 0 };
      if (typeof Placar !== 'undefined') {
        var go = function(){ if (st.live || st.total !== total) return; if (window.Hints && Hints.isOpen()) return setTimeout(go, 250); Placar.after(cfg.board, rec, function(){ var f = cfg.focusAfter && document.getElementById(cfg.focusAfter); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }); };
        setTimeout(go, 600);
      }
      return { total: st.total, ms: Math.round(st.ms), pen: st.pen, v: st.v, n: st.n, newBest: st.newBest };
    }
    function show(){ Placar.show(cfg.board, { group: 'tempo' }); }

    return {
      start: start, penalty: penalty, finish: finish, show: show, isOpen: rankOpen, fmt: fmt, fmtV: fmtV, fmtPer: fmtPer, best: best, hud: hud,
      get ms(){ return st.ms; }, get pen(){ return st.pen; }, get total(){ return st.total; }, get live(){ return st.live; }, get newBest(){ return st.newBest; }, P: P
    };
  }
  return { create: create, fmt: fmt, fmtPer: fmtPer };
})();
if (typeof module !== 'undefined') module.exports = Tempo;
