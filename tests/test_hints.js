const E=require('../src/engine.js'); global.Engine=E; global.window={addEventListener(){}};
const fs=require('fs'); eval(fs.readFileSync(require('path').join(__dirname,'../src/hints.js'),'utf8')+';global.Hints=Hints;');
let n=0,f=0; const ok=(c,m)=>{n++; if(!c){f++; if(f<12) console.log('FALHA',m);}};
const RBW={ok:/Nada a fazer/,recolor:/recolorir/,single:/rotação simples/,double:/rotação dupla/,root:/pinte/};
const N={zig:'Zig.',zigzig:'Zig-zig.',zigzag:'Zig-zag.'};
for(let s=0;s<500;s++){
  const a=E.genAVL(null,3); const z=a.answer.z, cs=a.answer.cs;
  const h1=Hints.avl(a.tree,z,a.key,false), h2=Hints.avl(a.tree,z,a.key,true);
  ok(h1[1].includes('Caso '+cs+':') && h2[1].includes('Caso '+cs+':'), 'avl '+cs);
  ok(!h1[0].includes('Caso'), 'avl camada 1 não entrega o caso');
  const ex=Hints.explainAVL(a.tree,z,a.key,['L','R']); ok(ex.title.includes(cs) && ex.svgs.length==2 && ex.svgs[1].svg.includes('<svg'),'explainAVL');
  const hf=Hints.avlFind(a.tree,a.key); ok(hf[1].includes('é '+z+'.'), 'avlFind');
  const r=E.genRB(['ok','recolor','single','double','long'][s%5],2); const t=E.clone(r.tree); let x=E.find(t,r.key);
  while(x){ const d=E.rbDiagnose(t,x); const h=Hints.rb(t,x); ok(RBW[d].test(h[1]), 'rb '+d+' | '+h[1]);
    ['ok','recolor','single','double','root'].filter(c=>c!==d).forEach(c=>{ const e=Hints.explainRB(t,x,c); ok(e.title.includes(Hints.RBN[d]) && e.lines[0].length>10 && !/undefined|null|NaN/.test(e.lines.join(' ')), 'explainRB '+d+'/'+c+' '+e.lines[0]); });
    x=E.rbApply(t,x,d); }
  const sp=E.genSplay(null,2); const st=E.clone(sp.tree); let y=E.find(st,sp.key);
  while(y.parent){ const d=E.splayDiagnose(y); const h=Hints.splay(y); ok(h[1].includes(N[d]), 'splay '+d+' '+h[1]);
    ['zig','zigzig','zigzag'].filter(c=>c!==d).forEach(c=>{ const e=Hints.explainSplay(st,y,c); ok(e.lines.length>=2 && !/undefined|null/.test(e.lines.join(' ')),'explainSplay '+d+'/'+c+' '+e.lines.join('|')); });
    E.splayApply(st,y,d); }
  const b=E.genBST(3); const path=E.insertPath(b.tree,b.key);
  path.forEach(p=>{ const h=Hints.step(b.tree,b.key,p.node.key); ok(h[1].includes(p.dir==='L'?'esquerda':'direita') && !/undefined/.test(h.join()), 'step');
    const e=Hints.explainStep(b.tree,b.key,p.node.key,p.dir==='L'?'R':'L'); ok(e.svgs[0].svg.includes('stroke-dasharray') && !/undefined/.test(e.lines.join()), 'explainStep'); });
  const last=path[path.length-1]; ok(Hints.insert(b.tree,b.key)[1].includes('à '+(last.dir==='L'?'esquerda':'direita')+' de '+last.node.key),'insert');
  const k0=E.keys(b.tree)[s%E.size(b.tree)], hs=Hints.search(b.tree,k0); ok(hs[1].includes('São '+(E.depth(E.find(b.tree,k0))+1)),'search');
  const tv=Hints.trav(b.tree,'a pré-ordem'); ok(tv[1].startsWith('Pré-ordem'),'trav');
}
console.log(n+' verificações, '+f+' falhas');
