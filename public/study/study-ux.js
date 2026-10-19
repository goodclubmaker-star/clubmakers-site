(()=>{'use strict';
const $=id=>document.getElementById(id),tabs=[...document.querySelectorAll('[data-tab]')],panels=[...document.querySelectorAll('[data-panel]')];
const read=k=>{try{return JSON.parse(localStorage.getItem(k))||{}}catch{return {}}};
const today=()=>new Date().toLocaleDateString('en-CA');
const fmt=m=>{m=Math.max(0,Math.round(m));return (m>=60?Math.floor(m/60)+'시간 ':'')+(m%60||m<60?m%60+'분':'')};
function summary(){
 const progress=read('eunseong-curriculum-demo-v1'),exam=read('eunseong-interviews-v1'),reviews=read('eunseong-study-flow-v1');
 const stats=window.studyManager?.stats(),focus=window.studyManager?.focus();
 const first=all.filter(x=>(+progress[x.id]||0)>=1).length,second=all.filter(x=>(+progress[x.id]||0)>=2).length,
 third=all.filter(x=>(+progress[x.id]||0)>=3).length,advanced=all.filter(x=>(+progress[x.id]||0)>=4).length;
 const assessed=Object.values(exam).filter(x=>x.version===2);
 const insufficient=assessed.filter(x=>x.path==='추가 진단 필요').length;
 const due=Object.values(reviews).filter(x=>x.next&&x.next<=today()).length;
 const confidence=stats?Object.values(stats).reduce((a,x)=>a+x.checked,0):0;
 const weak=stats?Object.values(stats).reduce((a,x)=>a+x.weak+x.unsure,0):0;
 const cards=[
 ['1회독 · 개념',first+' / '+all.length],
 ['2회독 · 유형',second+' / '+all.length],
 ['3회독 · 기출',third+' / '+all.length],
 ['심화 · 실전',advanced+' / '+all.length],
 ['자가진단 체크',confidence+' / '+(stats?Object.values(stats).reduce((a,x)=>a+x.parts,0):0)],
 ['문제 진단',assessed.length+'개 (추가 문항 필요 '+insufficient+')'],
 ['이번 주 실제 기록 (타이머·자유)',focus?fmt(focus.weekly):'0분'],
 ['예정 복습',due+'개']
 ];
 $('overviewStats').innerHTML=cards.map(([label,val])=>'<div class="summary-mini"><small>'+label+'</small><strong>'+val+'</strong></div>').join('');
 const priority=all.filter(x=>(+progress[x.id]||0)===0).sort((a,b)=>(a.s==='수학'?-1:0)-(b.s==='수학'?-1:0)).slice(0,4);
 $('overviewNext').innerHTML='<p><b>자가진단에서 확인한 애매·취약 주제:</b> '+weak+'개</p>'+
 '<p><b>미시작 주요 단원:</b> '+(priority.map(x=>x.s+' · '+x.t).join(' / ')||'모든 학습 분류의 1회독을 완료했습니다.')+'</p>'+
 '<p class="sub">문제은행의 초기 확인 문항은 단원별로 충분하지 않아 점수만으로 통과 판정을 하지 않습니다. 자가진단도 본인 판단이므로 문제 진단·오답 분석과 함께 확인하세요.</p>';
}
const valid=new Set(tabs.map(t=>t.dataset.tab));let active='overview',navDepth=0;
const drawer=$('appDrawer'),shade=$('drawerShade'),trigger=$('menuToggle');
function drawerOpen(open){
 drawer.hidden=!open;shade.hidden=!open;trigger.setAttribute('aria-expanded',String(open));
 document.body.style.overflow=open?'hidden':'';
}
trigger.addEventListener('click',()=>drawerOpen(drawer.hidden));
$('drawerClose').addEventListener('click',()=>drawerOpen(false));
shade.addEventListener('click',()=>drawerOpen(false));
$('studyHome').addEventListener('click',()=>{drawerOpen(false);show('overview',{push:true})});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer.hidden)drawerOpen(false)});
function show(name,opts={}){
 if(!valid.has(name))name='overview';
 if(opts.push&&name!==active){history.pushState({studyTab:name},'',location.pathname+location.search+(name==='overview'?'':'#'+name));navDepth++}
 active=name;
 tabs.forEach(t=>t.setAttribute('aria-selected',String(t.dataset.tab===name)));
 panels.forEach(p=>p.hidden=p.dataset.panel!==name);
 $('studyBack').hidden=name==='overview';
 if(opts.refresh!==false){window.studyManager?.refresh();window.studyRoadmap?.refresh();summary()}
 if(opts.scroll!==false)window.scrollTo({top:0,behavior:'instant'});
}
for(const tab of tabs)tab.addEventListener('click',()=>{drawerOpen(false);show(tab.dataset.tab,{push:true})});
for(const btn of document.querySelectorAll('[data-go]'))btn.addEventListener('click',()=>show(btn.dataset.go,{push:true}));
$('studyBack').addEventListener('click',()=>{drawerOpen(false);if(navDepth>0){history.back()}else{history.replaceState({studyTab:'overview'},'',location.pathname+location.search);show('overview')}});
window.addEventListener('popstate',e=>{navDepth=Math.max(0,navDepth-1);show(e.state?.studyTab||'overview',{push:false})});
document.addEventListener('study:change',()=>{summary()});
document.addEventListener('click',e=>{if(e.target.closest('#interviewSave,#focusDone,#focusReset,#reset,#flowSave,#subjects button'))setTimeout(()=>{window.studyManager?.refresh();window.studyRoadmap?.refresh();summary()},100)});
const requested=location.hash.slice(1);const initial=valid.has(requested)?requested:'overview';
history.replaceState({studyTab:initial},'',location.pathname+location.search+(initial==='overview'?'':'#'+initial));
show(initial,{push:false,scroll:false});
})();