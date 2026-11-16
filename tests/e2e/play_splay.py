from playwright.sync_api import sync_playwright
import subprocess, json, urllib.request
srv=subprocess.Popen(['node','/home/claude/masmorra-das-arvores/tests/serve_ranking.js','8899'],stdout=subprocess.PIPE); srv.stdout.readline()
API='http://127.0.0.1:8899/api/ranking'
def api_get(q): return json.load(urllib.request.urlopen(API+q))
def route(r):
    u=r.request.url.replace('https://masmorra-das-arvores.vercel.app/api/ranking',API)
    resp=r.fetch(url=u); r.fulfill(response=resp)
F='file:///home/claude/masmorra-das-arvores/jogos/mercado-da-torre.html'
errs=[]; fails=[]
def check(c,m):
    if not c: fails.append(m); print('FALHA',m)
MODAL="()=>{const d=document.querySelector('[aria-labelledby=hx-title]');return d?d.querySelector('#hx-title').textContent:null}"
def close(pg):
    t=pg.evaluate(MODAL)
    if t: pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    return t
ST="""()=>{const G=window.__mercado.G,E=window.__mercado.E; const o={phase:G.phase,ri:G.ri};
 const k=G.seq[G.ri]; if(G.phase==='seek'){const n=E.find(G.tree,G.at); o.need=k<n.key?'L':'R';}
 if(G.phase==='splay'){o.s=E.splayDiagnose(E.find(G.tree,k));} o.bst=E.isBST(G.tree); return o;}"""
def play(pg, mistakes, shots=False):
    made={'m':0,'s':0}
    while True:
        if close(pg): continue
        s=pg.evaluate(ST); check(s['bst'],'torre continua BST')
        if s['phase']=='seek':
            if mistakes and not made['m']:
                made['m']=1; pg.keyboard.press('ArrowRight' if s['need']=='L' else 'ArrowLeft'); pg.wait_for_timeout(150); t=pg.evaluate(MODAL); print('erro busca:', t); check(t,'janela busca')
                if shots: pg.screenshot(path='shots/mt_erro_busca.png')
                continue
            if shots and s['ri']==1: pg.screenshot(path='shots/mt_busca.png')
            pg.keyboard.press('ArrowLeft' if s['need']=='L' else 'ArrowRight')
        elif s['phase']=='splay':
            if mistakes and not made['s']:
                made['s']=1; w=[x for x in ['zig','zigzig','zigzag'] if x!=s['s']][0]; pg.keyboard.press(str(['zig','zigzig','zigzag'].index(w)+1)); pg.wait_for_timeout(150); t=pg.evaluate(MODAL); print('erro splay:', t); check(t and 'Era' in t,'janela splay')
                if shots: pg.screenshot(path='shots/mt_erro_splay.png')
                continue
            if shots and s['ri']==2: pg.keyboard.press('h'); print('DICA:', pg.inner_text('#feedback')); pg.screenshot(path='shots/mt_splay.png')
            pg.keyboard.press(str(['zig','zigzig','zigzag'].index(s['s'])+1))
        elif s['phase']=='done': pg.keyboard.press('Enter')
        else: break
        pg.wait_for_timeout(20)
    G=pg.evaluate("()=>{const G=window.__mercado.G;return {day:G.day,mine:G.mine,fixed:G.fixed,errs:G.errs,total:window.__mercado.TM.total,pen:window.__mercado.TM.pen,n:G.seq.length}}")
    print('dia:', G); check(G['mine']<G['fixed'],'splay economizou')

def handle_rank(pg, name):
    pg.wait_for_timeout(750); close(pg)
    pg.wait_for_timeout(350)
    if pg.evaluate("()=>!!document.getElementById('pl-tag')"):
        pg.fill('#pl-tag', name); pg.keyboard.press('Enter'); pg.wait_for_timeout(120)
        check(pg.evaluate("()=>!!document.querySelector('#pl tr.me') || /melhor, que foi mantido/.test(document.getElementById('pl').textContent)"),'gravou '+name)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(60)
    check(not pg.evaluate("()=>!!document.getElementById('pl')"),'ranking fechado')
def rank_checks(pg, hook, shot):
    rk=api_get('?board=splay')['top']; print('ranking:', [(r['tag'], r['ms'], r.get('n'), r.get('v')) for r in rk])
    check(len(rk)==min(10,len(set(r['tag'] for r in rk))) and len(rk)>=8,'top 10 com um por nome')
    check(all(rk[i].get('v',rk[i]['ms'])<=rk[i+1].get('v',rk[i+1]['ms']) for i in range(len(rk)-1)),'ordenado por tempo')
    pg.click('#rankBtn'); pg.wait_for_timeout(200); pg.screenshot(path=shot); pg.keyboard.press('Escape'); pg.wait_for_timeout(80)
    t0=pg.evaluate(f"()=>window.{hook}.TM.ms"); pg.click('#helpBtn'); pg.wait_for_timeout(1000); t1=pg.evaluate(f"()=>window.{hook}.TM.ms")
    check(t1-t0<250,'cronômetro parado com janela'); close(pg); pg.wait_for_timeout(600); check(pg.evaluate(f"()=>window.{hook}.TM.ms")-t1>350,'cronômetro volta')
NAMES=['ANA','BIA','CAIO','DUDA','EDU','FABI','GUI','HUGO','IVO','JU','KAI','LIA','MEL','NINA','OTO','PIO']
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1366,'height':900}); ctx.route('https://masmorra-das-arvores.vercel.app/api/ranking**', route); pg=ctx.new_page(); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(F); pg.wait_for_timeout(400); print('abertura:', close(pg)); print('como:', close(pg))
    play(pg, True, True); pg.wait_for_timeout(200); pg.screenshot(path='shots/mt_fim.png', full_page=True)
    handle_rank(pg, NAMES[0])
    for i in range(1,13): pg.keyboard.press('Enter'); pg.wait_for_timeout(60); play(pg, False); handle_rank(pg, NAMES[i])
    pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    rank_checks(pg, '__mercado', 'shots/mt_rank.png')
    mc=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2); mc.route('https://masmorra-das-arvores.vercel.app/api/ranking**', route); m=mc.new_page(); m.goto(F); m.wait_for_timeout(300); close(m); close(m); m.screenshot(path='shots/mt_mobile.png', full_page=True)
    check(m.evaluate('document.documentElement.scrollWidth')<=392,'scroll horizontal')
    b.close()
print('erros', errs, 'falhas', fails)
srv.kill()
