from playwright.sync_api import sync_playwright
import subprocess, json, urllib.request
srv=subprocess.Popen(['node','/home/claude/masmorra-das-arvores/tests/serve_ranking.js','8899'],stdout=subprocess.PIPE); srv.stdout.readline()
API='http://127.0.0.1:8899/api/ranking'
def api_get(q): return json.load(urllib.request.urlopen(API+q))
def route(r):
    u=r.request.url.replace('https://masmorra-das-arvores.vercel.app/api/ranking',API); resp=r.fetch(url=u); r.fulfill(response=resp)
F='file:///home/claude/masmorra-das-arvores/jogos/arena-das-arvores.html'
errs=[]; fails=[]
def check(c,m):
    if not c: fails.append(m); print('FALHA',m)
MODAL="()=>{const d=document.querySelector('[aria-labelledby=hx-title]');return d?d.querySelector('#hx-title').textContent:null}"
def solo(pg, wrong=set(), slow=0, name=None, shots=False):
    pg.click('#goSolo'); pg.wait_for_timeout(150); t=pg.evaluate(MODAL); check(t=='Como funciona o desafio','instrução do desafio'); pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
    for i in range(15):
        q=pg.evaluate("()=>{const T=window.__arena.T;return {i:T.i,correct:T.quiz[T.i].correct,phase:T.phase}}"); check(q['phase']=='question' and q['i']==i,'pergunta %d'%i)
        if slow: pg.wait_for_timeout(slow)
        if shots and i==0: pg.screenshot(path='shots/ar_solo_q.png')
        if i in wrong: pg.keyboard.press(str(((q['correct']+1)%4)+1))
        elif i%2: pg.click(f'#soloOpts [data-i="{q["correct"]}"]')
        else: pg.keyboard.press('ABCD'[q['correct']].lower())
        pg.wait_for_timeout(60)
        if shots and i==min(wrong or {99}): pg.screenshot(path='shots/ar_solo_erro.png')
        # tempo parado na revelação
        if i==3:
            m0=pg.evaluate("()=>window.__arena.T.ms"); pg.wait_for_timeout(500); check(pg.evaluate("()=>window.__arena.T.ms")==m0,'tempo parado na explicação')
        pg.keyboard.press('Enter'); pg.wait_for_timeout(60)
    T=pg.evaluate("()=>{const T=window.__arena.T;return {hits:T.hits,ms:T.ms,phase:T.phase,log:T.log.length}}"); print('fim:', T)
    check(T['phase']=='end' and T['hits']==15-len(wrong) and T['log']==15,'placar do desafio')
    pg.wait_for_timeout(900)
    if pg.evaluate("()=>!!document.getElementById('pl-tag')"):
        if shots: pg.screenshot(path='shots/ar_solo_nome.png')
        if name: pg.fill('#pl-tag', name)
        pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
        if shots: pg.screenshot(path='shots/ar_solo_rank.png')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    return T
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1366,'height':900}); ctx.route('https://masmorra-das-arvores.vercel.app/api/ranking**', route)
    pg=ctx.new_page(); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(F); pg.wait_for_timeout(400); pg.screenshot(path='shots/ar_setup.png')
    a=solo(pg, wrong={2,7}, name='Zé1', shots=True)
    pg.screenshot(path='shots/ar_solo_fim.png', full_page=True)
    rk=api_get('?board=arena')['top']; print('ranking:', rk); check(len(rk)==1 and rk[0]['tag']=='ZE1' and rk[0]['hits']==13,'gravou na arena')
    # mesmos acertos, mais lento: fica atrás no desempate
    pg.evaluate("()=>{const p=JSON.parse(localStorage.getItem('masmorra-jogador'));p.tag='';localStorage.setItem('masmorra-jogador',JSON.stringify(p))}")
    pg.click('#soloBack'); pg.wait_for_timeout(100); solo(pg, wrong={0,1}, slow=150, name='bob')
    pg.click('#soloBack'); pg.wait_for_timeout(100); solo(pg, wrong=set(), name='ana')
    rk=api_get('?board=arena')['top']; print('ranking:', [(r['tag'],r['hits'],r['ms']) for r in rk])
    check([r['tag'] for r in rk]==['ANA','ZE1','BOB'],'acertos e desempate pelo tempo')
    pg.click('#soloRank'); pg.wait_for_timeout(300); pg.screenshot(path='shots/ar_rank_tab.png')
    check('Ranking por pontos' in pg.inner_text('#pl'),'abre no grupo de pontos')
    pg.click('[data-tab=geral]'); pg.wait_for_timeout(300); check('Queda' in pg.inner_text('#pl'),'aba geral')
    pg.keyboard.press('Escape')
    # sem conexão: ranking deste aparelho
    c2=b.new_context(viewport={'width':1366,'height':900}); c2.route('https://masmorra-das-arvores.vercel.app/api/ranking**', lambda r: r.abort())
    p2=c2.new_page(); p2.on('pageerror',lambda e: errs.append(str(e))); p2.goto(F); p2.wait_for_timeout(300)
    solo(p2, wrong={5}, name='off')
    p2.click('#soloRank'); p2.wait_for_timeout(400); txt=p2.inner_text('#pl'); print('offline:', txt.replace('\n',' | ')[:200]); check('OFF' in txt and 'Sem conexão' in txt,'reserva local')
    m=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2).new_page(); m.goto(F); m.wait_for_timeout(300); m.screenshot(path='shots/ar_setup_m.png', full_page=True)
    check(m.evaluate('document.documentElement.scrollWidth')<=392,'scroll horizontal')
    m.click('#goSolo'); m.keyboard.press('Enter'); m.wait_for_timeout(200); m.screenshot(path='shots/ar_solo_m.png', full_page=True)
    b.close()
srv.kill()
print('erros', errs, 'falhas', fails)
