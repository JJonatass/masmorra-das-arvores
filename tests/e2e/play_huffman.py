from playwright.sync_api import sync_playwright
import subprocess, json, urllib.request
srv=subprocess.Popen(['node','/home/claude/masmorra-das-arvores/tests/serve_ranking.js','8899'],stdout=subprocess.PIPE); srv.stdout.readline()
API='http://127.0.0.1:8899/api/ranking'
def api_get(q): return json.load(urllib.request.urlopen(API+q))
def route(r):
    u=r.request.url.replace('https://masmorra-das-arvores.vercel.app/api/ranking',API)
    resp=r.fetch(url=u); r.fulfill(response=resp)
F='file:///home/claude/masmorra-das-arvores/jogos/forja-de-huffman.html'
errs=[]; fails=[]
def check(c,m):
    if not c: fails.append(m); print('FALHA',m)
MODAL="()=>{const d=document.querySelector('[aria-labelledby=hx-title]');return d?d.querySelector('#hx-title').textContent:null}"
def close(pg):
    t=pg.evaluate(MODAL)
    if t: pg.keyboard.press('Enter'); pg.wait_for_timeout(120)
    return t
def play(pg, mistakes=True, shots=False):
    made={'f':0,'e':0,'d':0}
    while True:
        close(pg)
        st=pg.evaluate("()=>window.__huff.G.stage")
        if st==0:
            info=pg.evaluate("""()=>{const G=window.__huff.G,H=window.__huff.Huff; const s=H.sortedForest(G.forest); return {ids:s.map(n=>n.id), heavy:s[s.length-1].id, n:s.length, w:s.map(n=>n.w)}}""")
            if mistakes and not made['f'] and info['n']>3 and info['w'][-1]>info['w'][1]:
                made['f']=1; pg.click(f'[data-id="{info["ids"][-1]}"]'); pg.click(f'[data-id="{info["ids"][-2]}"]'); pg.wait_for_timeout(200)
                t=pg.evaluate(MODAL); print('erro forja:', t); check(t and 'mais leves' in t,'janela forja')
                if shots: pg.screenshot(path='shots/hf_erro_forja.png')
                continue
            if shots and info['n']==4: pg.screenshot(path='shots/hf_forja.png')
            pg.click(f'[data-id="{info["ids"][0]}"]'); pg.click(f'[data-id="{info["ids"][1]}"]'); pg.wait_for_timeout(40)
        elif st==1:
            nb=pg.evaluate("()=>{const G=window.__huff.G;return G.codes[G.w1[G.i]][G.bit.length]}")
            if mistakes and not made['e'] and pg.evaluate("()=>window.__huff.G.i")==2:
                made['e']=1; pg.keyboard.press('1' if nb=='0' else '0'); pg.wait_for_timeout(200); t=pg.evaluate(MODAL); print('erro codificar:', t); check(t and 'código de' in t,'janela codificar')
                if shots: pg.screenshot(path='shots/hf_erro_cod.png')
                continue
            if shots and pg.evaluate("()=>window.__huff.G.i")==3 and pg.evaluate("()=>window.__huff.G.bit.length")==1:
                pg.keyboard.press('h'); pg.wait_for_timeout(80); print('DICA:', pg.inner_text('#feedback')); pg.screenshot(path='shots/hf_cod.png')
            pg.keyboard.press('ArrowLeft' if nb=='0' else 'ArrowRight')
        elif st==2:
            ch=pg.evaluate("()=>{const G=window.__huff.G;return window.__huff.Huff.decodeNext(G.root,G.bits2,G.pos).ch}")
            if mistakes and not made['d'] and pg.evaluate("()=>window.__huff.G.decoded.length")==1:
                other=pg.evaluate(f"()=>window.__huff.Huff.letters(window.__huff.G.root).find(c=>c!=='{ch}')")
                made['d']=1; pg.click(f'#actions [data-ch="{other}"]'); pg.wait_for_timeout(200); t=pg.evaluate(MODAL); print('erro decifrar:', t); check(t and 'levam' in t,'janela decifrar')
                if shots: pg.screenshot(path='shots/hf_erro_dec.png')
                continue
            if shots and pg.evaluate("()=>window.__huff.G.decoded.length")==3: pg.screenshot(path='shots/hf_dec.png')
            if made['d']==1 and pg.evaluate("()=>window.__huff.G.decoded.length")==2:
                pg.click(f'#forge [data-ch="{ch}"]'); made['d']=2   # clique na folha
            else: pg.keyboard.press(ch.lower())
        else:
            break
        pg.wait_for_timeout(25)
    G=pg.evaluate("()=>{const G=window.__huff.G;return {w1:G.w1,w2:G.w2,dec:G.decoded,total:window.__huff.TM.total,ms:Math.round(window.__huff.TM.ms),pen:window.__huff.TM.pen,errs:G.errs,hints:G.hints}}")
    print('rodada:', G); check(G['dec']==G['w2'],'decifrou certo')
    return G
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1366,'height':900}); ctx.route('https://masmorra-das-arvores.vercel.app/api/ranking**', route); pg=ctx.new_page(); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(F); pg.wait_for_timeout(500)
    t=close(pg); print('abertura:', t); t=close(pg); print('etapa1:', t)
    g=play(pg, True, True)
    pg.screenshot(path='shots/hf_fim.png', full_page=True)
    txt=pg.inner_text('#pText'); check('Economia' in txt and 'bits' in txt,'resumo de compressão'); print(txt.replace('\n',' | ')[:200])
    check(g['pen']>=30000,'penalidade de 3 erros + dica')
    check(abs(g['total']-(g['ms']+g['pen']))<=1,'total = cronômetro + penalidade')
    pg.wait_for_timeout(800)
    check(pg.evaluate("()=>!!document.getElementById('pl-tag')"),'pede nome ao entrar no top 10')
    pg.screenshot(path='shots/hf_rank_nome.png')
    pg.keyboard.type('ana!x9z'); v=pg.input_value('#pl-tag'); print('nome digitado:', v); check(v=='ANA','filtro do nome (3)')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    pg.wait_for_timeout(300); check(len(api_get('?board=huffman')['top'])==1,'gravou no ranking online')
    check(pg.evaluate("()=>JSON.parse(localStorage.getItem('masmorra-jogador')).tag")=='ANA','nome compartilhado')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100); check(not pg.evaluate("()=>!!document.getElementById('pl')"),'fecha ranking')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(200); check(pg.evaluate("()=>window.__huff.G.round")==2,'nova forja')
    # cronômetro parado com janela aberta
    pg.keyboard.press('h'); pg.wait_for_timeout(50)
    t0=pg.evaluate("()=>window.__huff.TM.ms"); pg.click('#helpBtn'); pg.wait_for_timeout(1200); t1=pg.evaluate("()=>window.__huff.TM.ms")
    print('ms com janela aberta:', t0, t1); check(t1-t0<250,'pausa com janela'); close(pg)
    pg.wait_for_timeout(600); t2=pg.evaluate("()=>window.__huff.TM.ms"); check(t2-t1>400,'volta a contar')
    names=['BIA','CAIO','DUDA','EDU','FABI','GUI','HUGO','IVO','JU','KAI','LIA','MEL']
    for i in range(12):
        pg.evaluate(f"()=>{{const p=JSON.parse(localStorage.getItem('masmorra-jogador'));p.tag='{names[i]}';localStorage.setItem('masmorra-jogador',JSON.stringify(p))}}")
        play(pg, False); pg.wait_for_timeout(750)
        if pg.evaluate("()=>!!document.getElementById('pl-tag')"):
            pg.keyboard.press('Enter'); pg.wait_for_timeout(150); pg.keyboard.press('Escape')
        pg.keyboard.press('Enter'); pg.wait_for_timeout(50)
    rk=api_get('?board=huffman')['top']; print('ranking:', [(r['tag'], r['ms'], r.get('n'), r.get('v')) for r in rk])
    check(len(rk)==10,'top 10'); check(all(rk[i].get('v',rk[i]['ms'])<=rk[i+1].get('v',rk[i+1]['ms']) for i in range(len(rk)-1)),'ordenado por tempo')
    check(len(set(r['tag'] for r in rk))==len(rk),'um por nome')
    check(all(14<=r['n']<=40 and abs(r['v']-r['ms']/r['n'])<=1 for r in rk),'média por letra = total ÷ letras')
    pg.click('#rankBtn'); pg.wait_for_timeout(200); pg.screenshot(path='shots/hf_rank.png'); pg.keyboard.press('Escape')
    mc=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2); mc.route('https://masmorra-das-arvores.vercel.app/api/ranking**', route); m=mc.new_page(); m.goto(F); m.wait_for_timeout(300); close(m); close(m); m.screenshot(path='shots/hf_mobile.png', full_page=True); m.click('#rankBtn'); m.wait_for_timeout(150); m.screenshot(path='shots/hf_rank_mobile.png')
    check(m.evaluate('document.documentElement.scrollWidth')<=392,'scroll horizontal no celular')
    b.close()
print('erros', errs, 'falhas', fails)
# média por letra: conferir a conta de cada linha
import json
srv.kill()
