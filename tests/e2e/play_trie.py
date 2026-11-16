from playwright.sync_api import sync_playwright
import subprocess, json, urllib.request
srv=subprocess.Popen(['node','/home/claude/masmorra-das-arvores/tests/serve_ranking.js','8899'],stdout=subprocess.PIPE); srv.stdout.readline()
API='http://127.0.0.1:8899/api/ranking'
def api_get(q): return json.load(urllib.request.urlopen(API+q))
def route(r):
    u=r.request.url.replace('https://masmorra-das-arvores.vercel.app/api/ranking',API)
    resp=r.fetch(url=u); r.fulfill(response=resp)
F='file:///home/claude/masmorra-das-arvores/jogos/biblioteca-dos-ecos.html'
errs=[]; fails=[]
def check(c,m):
    if not c: fails.append(m); print('FALHA',m)
MODAL="()=>{const d=document.querySelector('[aria-labelledby=hx-title]');return d?d.querySelector('#hx-title').textContent:null}"
def close(pg):
    t=pg.evaluate(MODAL)
    if t: pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    return t
ST="""()=>{const G=window.__trie.G,T=window.__trie.T; const o={stage:G.stage};
 if(G.stage===0){o.want=T.action(G.node,G.words[G.wi],G.li); o.w=G.words[G.wi]; o.li=G.li;}
 if(G.stage===1){o.a=G.qs[G.qi].a; o.q=G.qs[G.qi].q;}
 if(G.stage===2){o.ids=G.orc.answer.map(w=>T.walk(G.root,w).id); o.prefix=G.orc.prefix; o.other=T.nodes(G.root).filter(n=>n.end&&!G.orc.answer.includes(T.prefixOf(n))).map(n=>n.id);}
 return o;}"""
def play(pg, mistakes, shots=False):
    made={'b':0,'f':0,'q':0,'o':0}
    while True:
        if close(pg): continue
        s=pg.evaluate(ST)
        if s['stage']==0:
            keys={'seguir':'1','cavar':'2','fim':'3'}
            if mistakes and not made['b'] and s['want']=='seguir':
                made['b']=1; pg.keyboard.press('2'); pg.wait_for_timeout(150); t=pg.evaluate(MODAL); print('erro seguir:', t); check(t and 'Seguir' in t,'janela seguir')
                if shots: pg.screenshot(path='shots/tr_erro_seguir.png')
                continue
            if mistakes and not made['f'] and s['want']=='fim' and pg.evaluate("()=>{const G=window.__trie.G;return Object.keys(G.node.kids).length>0}"):
                made['f']=1; pg.keyboard.press('1'); pg.wait_for_timeout(150); t=pg.evaluate(MODAL); print('erro fim (prefixo):', t); check(t and 'Marcar fim' in t,'janela fim')
                if shots: pg.screenshot(path='shots/tr_erro_fim.png')
                continue
            if shots and s['li']==2 and pg.evaluate("()=>window.__trie.G.wi")==4: pg.keyboard.press('h'); print('DICA:', pg.inner_text('#feedback')); pg.screenshot(path='shots/tr_guardar.png')
            pg.keyboard.press(keys[s['want']])
        elif s['stage']==1:
            keys={'sim':'1','prefixo':'2','nao':'3'}
            if mistakes and not made['q'] and s['a']=='prefixo':
                made['q']=1; pg.keyboard.press('1'); pg.wait_for_timeout(150); t=pg.evaluate(MODAL); print('erro consulta:', t); check(t and 'prefixo' in t,'janela consulta')
                if shots: pg.screenshot(path='shots/tr_erro_consulta.png')
                continue
            if shots and pg.evaluate("()=>window.__trie.G.qi")==1: pg.screenshot(path='shots/tr_consulta.png')
            pg.keyboard.press(keys[s['a']])
        elif s['stage']==2:
            ids=s['ids']
            pick=ids[:-1] if mistakes else ids
            for i in pick: pg.click(f'#lib [data-id="{i}"]'); pg.wait_for_timeout(30)
            if mistakes and s['other']: pg.click(f'#lib [data-id="{s["other"][0]}"]')
            if shots: pg.screenshot(path='shots/tr_oraculo.png')
            pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
            if mistakes: t=pg.evaluate(MODAL); print('erro oráculo:', t); check(t and s['prefix'] in t,'janela oráculo');
            if shots and mistakes: pg.screenshot(path='shots/tr_erro_oraculo.png')
        else: break
        pg.wait_for_timeout(20)
    G=pg.evaluate("()=>{const G=window.__trie.G,T=window.__trie.T;return {words:G.words,stored:T.words(G.root),errs:G.errs,total:window.__trie.TM.total,pen:window.__trie.TM.pen,size:T.size(G.root)}}")
    check(sorted(G['words'])==sorted(G['stored']),'trie final igual às palavras')
    print('estante:', G['words'], 'salas', G['size'], 'erros', G['errs'], 'tempo', G['total'], 'pen', G['pen'])

def handle_rank(pg, name):
    pg.wait_for_timeout(750); close(pg)
    pg.wait_for_timeout(350)
    if pg.evaluate("()=>!!document.getElementById('pl-tag')"):
        pg.fill('#pl-tag', name); pg.keyboard.press('Enter'); pg.wait_for_timeout(120)
        check(pg.evaluate("()=>!!document.querySelector('#pl tr.me') || /melhor, que foi mantido/.test(document.getElementById('pl').textContent)"),'gravou '+name)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(60)
    check(not pg.evaluate("()=>!!document.getElementById('pl')"),'ranking fechado')
def rank_checks(pg, hook, shot):
    rk=api_get('?board=trie')['top']; print('ranking:', [(r['tag'], r['ms'], r.get('n'), r.get('v')) for r in rk])
    check(len(rk)==min(10,len(set(r['tag'] for r in rk))) and len(rk)>=8,'top 10 com um por nome')
    check(all(rk[i].get('v',rk[i]['ms'])<=rk[i+1].get('v',rk[i+1]['ms']) for i in range(len(rk)-1)),'ordenado por tempo')
    pg.click('#rankBtn'); pg.wait_for_timeout(200); pg.screenshot(path=shot); pg.keyboard.press('Escape'); pg.wait_for_timeout(80)
    t0=pg.evaluate(f"()=>window.{hook}.TM.ms"); pg.click('#helpBtn'); pg.wait_for_timeout(1000); t1=pg.evaluate(f"()=>window.{hook}.TM.ms")
    check(t1-t0<250,'cronômetro parado com janela'); close(pg); pg.wait_for_timeout(600); check(pg.evaluate(f"()=>window.{hook}.TM.ms")-t1>350,'cronômetro volta')
NAMES=['ANA','BIA','CAIO','DUDA','EDU','FABI','GUI','HUGO','IVO','JU','KAI','LIA','MEL','NINA','OTO','PIO']
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1366,'height':900}); ctx.route('https://masmorra-das-arvores.vercel.app/api/ranking**', route); pg=ctx.new_page(); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(F); pg.wait_for_timeout(400); print('abertura:', close(pg)); print('etapa:', close(pg))
    play(pg, True, True); pg.wait_for_timeout(200); close(pg); pg.screenshot(path='shots/tr_fim.png')
    check(pg.evaluate("()=>window.__trie.TM.pen")>=30000,'penalidades somadas')
    handle_rank(pg, NAMES[0])
    for i in range(1,16): pg.keyboard.press('Enter'); pg.wait_for_timeout(80); play(pg, False); handle_rank(pg, NAMES[i])
    pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    rank_checks(pg, '__trie', 'shots/tr_rank.png')
    mc=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2); mc.route('https://masmorra-das-arvores.vercel.app/api/ranking**', route); m=mc.new_page(); m.goto(F); m.wait_for_timeout(300); close(m); close(m)
    for i in range(10):
        s=m.evaluate(ST); m.click({'seguir':'[data-a=seguir]','cavar':'[data-a=cavar]','fim':'[data-a=fim]'}[s['want']]); m.wait_for_timeout(60)
    m.screenshot(path='shots/tr_mobile.png', full_page=True); check(m.evaluate('document.documentElement.scrollWidth')<=392,'scroll horizontal')
    b.close()
print('erros', errs, 'falhas', fails)
srv.kill()
