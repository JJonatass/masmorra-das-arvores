from playwright.sync_api import sync_playwright
import subprocess
srv=subprocess.Popen(['node','/home/claude/masmorra-das-arvores/tests/serve_ranking.js','8899'],stdout=subprocess.PIPE); srv.stdout.readline()
API='http://127.0.0.1:8899/api/ranking'
def route(r):
    u=r.request.url.replace('https://masmorra-das-arvores.vercel.app/api/ranking',API); resp=r.fetch(url=u); r.fulfill(response=resp)
errs=[]; fails=[]; net=[]
def check(c,m):
    if not c: fails.append(m); print('FALHA',m)
F='file:///home/claude/masmorra-das-arvores/index.html'
MODAL="()=>{const d=document.querySelector('[aria-labelledby=hx-title]');return d?d.querySelector('#hx-title').textContent:null}"
def closeall(f):
    for i in range(4):
        t=f.evaluate(MODAL)
        if not t: break
        f.locator('#hx-ok').click(); f.page.wait_for_timeout(120)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1366,'height':860})
    ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:','about:','data:')) else (route(r) if 'vercel.app/api/ranking' in r.request.url else (net.append(r.request.url), r.abort())))
    pg=ctx.new_page(); pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    pg.goto(F); pg.wait_for_timeout(700); pg.screenshot(path='shots/menu6.png', full_page=True)
    check(pg.locator('.game').count()==6,'6 cartões')
    for gid, hook, title in [('huffman','__huff','A Forja de Huffman'),('trie','__trie','A Biblioteca dos Ecos'),('splay','__mercado','O Mercado da Torre')]:
        pg.click('#back') if pg.locator('#player').is_visible() else None
        pg.wait_for_timeout(200); pg.click(f'[data-game="{gid}"]'); pg.wait_for_timeout(900)
        check(pg.inner_text('#gameTitle')==title, 'título '+gid)
        f=pg.frames[1]; check(f.evaluate("document.fonts.check('20px \"IM Fell English SC\"')"),'fonte '+gid)
        t=f.evaluate(MODAL); print(gid,'abre com:', t); check(bool(t),'instrução '+gid)
        closeall(f); pg.wait_for_timeout(700)
        ms=f.evaluate(f"()=>window.{hook}.TM.ms"); print(gid,'cronômetro ms:', ms); check(ms>300,'cronômetro anda '+gid)
        f.locator('#rankBtn').click(); pg.wait_for_timeout(200); check(f.locator('#pl').count()==1,'ranking abre '+gid); pg.screenshot(path=f'shots/menu_{gid}.png')
        f.locator('[data-pl=close]').click(); pg.wait_for_timeout(100)
    pg.click('#back'); pg.wait_for_timeout(200)
    pg.click('#rankBtn'); pg.wait_for_timeout(700); t=pg.inner_text('#pl'); print('pontos:', t.replace('\n',' | ')[:160]); check('Ranking por pontos' in t and 'Arena individual' in t,'menu: ranking por pontos')
    pg.click('[data-tab=arena]'); pg.wait_for_timeout(500); check('Acertos' in pg.inner_text('#pl') or 'Ninguém' in pg.inner_text('#pl'),'aba arena'); pg.screenshot(path='shots/menu_rank_pontos.png'); pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    pg.click('#rankTimeBtn'); pg.wait_for_timeout(700); t=pg.inner_text('#pl'); check('Ranking por tempo' in t and 'Mercado da Torre' in t,'menu: ranking por tempo'); pg.screenshot(path='shots/menu_rank_tempo.png'); pg.keyboard.press('Escape')
    pg.goto(F+'#trie'); pg.wait_for_timeout(800); check(pg.inner_text('#gameTitle')=='A Biblioteca dos Ecos','rota direta')
    for w in (1000, 800):
        pg.set_viewport_size({'width':w,'height':800}); pg.wait_for_timeout(150)
        check(pg.evaluate("document.querySelector('.bar').scrollWidth<=document.querySelector('.bar').clientWidth+1"),'barra cabe em %d'%w)
    pg.screenshot(path='shots/menu_bar800.png')
    m=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2).new_page()
    m.goto(F); m.wait_for_timeout(500); m.screenshot(path='shots/menu6_m.png', full_page=True)
    check(m.evaluate('document.documentElement.scrollWidth')<=390,'scroll horizontal')
    b.close()
print('erros', errs, '| rede', net, '| falhas', fails)
srv.kill()
