/* Family-review preview: all data stays in this browser until a separate login/sync design is approved. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const subjectOrder=['수학','국어','영어','통합과학','통합사회','한국사'];
const defaultShares={'수학':42,'국어':20,'영어':16,'통합과학':10,'통합사회':8,'한국사':4};
const sourceKey='eunseong-confidence-v1',planKey='eunseong-plan-settings-v1',progressKey='eunseong-curriculum-demo-v1',focusKey='eunseong-focus-v1';
const read=k=>{try{const x=JSON.parse(localStorage.getItem(k));return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let confidence=read(sourceKey),settings=read(planKey),filter='all',allExpanded=false;
function validSettings(x){const v=x||{},shares=v.shares||{};return {weeklyMinutes:Number.isFinite(+v.weeklyMinutes)&&+v.weeklyMinutes>=300&&+v.weeklyMinutes<=4200?Math.round(+v.weeklyMinutes):1800,shares:Object.fromEntries(subjectOrder.map(s=>[s,Number.isFinite(+shares[s])&&+shares[s]>=1?+shares[s]:defaultShares[s]]))}}
settings=validSettings(settings);
function list(){return subjectOrder.flatMap(s=>subjects[s].flatMap((title,i)=>(window.studyChecklistTopics[s]?.[i]||[]).map((text,j)=>({subject:s,unit:title,unitIndex:i,topic:text,id:s+'_'+i+'__'+j}))));}
const checklist=list();
function currentStats(){
 const progress=read(progressKey),diagnostics=read('eunseong-interviews-v1');
 return Object.fromEntries(subjectOrder.map(s=>{
  const units=all.filter(x=>x.s===s),parts=checklist.filter(x=>x.subject===s);
  const counts=[1,2,3,4].map(n=>units.filter(x=>(+progress[x.id]||0)>=n).length);
  return [s,{units:units.length,counts,parts:parts.length,checked:parts.filter(x=>confidence[x.id]).length,
    strong:parts.filter(x=>confidence[x.id]==='strong').length,unsure:parts.filter(x=>confidence[x.id]==='unsure').length,
    weak:parts.filter(x=>confidence[x.id]==='weak').length,
    diagnosed:units.filter(x=>diagnostics[x.id]?.version===2).length}];
 }));
}
function weights(){
 const stats=currentStats(),base=validSettings(settings).shares;
 const raw=Object.fromEntries(subjectOrder.map(s=>{
  const k=stats[s],insufficient=(k.weak/k.parts)*.52+(k.unsure/k.parts)*.20;
  return [s,base[s]*(1+Math.min(.4,insufficient))];
 }));
 const sum=Object.values(raw).reduce((a,b)=>a+b,0);
 return Object.fromEntries(subjectOrder.map(s=>[s,raw[s]/sum*100]));
}
const fmt=m=>{const x=Math.round(m);return (Math.floor(x/60)?Math.floor(x/60)+'시간 ':'')+(x%60?x%60+'분':Math.floor(x/60)?'':'0분')};
const percent=(a,b)=>b?Math.round(a/b*100):0;
const monday=()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d};
const today=()=>new Date().toLocaleDateString('en-CA');
const focusRest={school:[1,3,5,7],weekend:[1,3,5,7,9,11],full:[1,3,5,7,9,11,13]};
function timeStats(){
 const focus=read(focusKey),begin=monday(),end=new Date(begin);end.setDate(begin.getDate()+7);
 let weekly=0,daily=0,blocks=0;
 for(const [key,entry] of Object.entries(focus)){
  const m=/^(\d{4}-\d{2}-\d{2})-(school|weekend|full)$/.exec(key);
  if(!m)continue;
  const day=new Date(m[1]+'T12:00:00');if(!Number.isFinite(+day))continue;
  let total=0;
  for(const [i,r] of Object.entries(entry.records||{})){
   if(focusRest[m[2]].includes(+i))continue;
   total+=Math.max(0,+r.seconds||0);blocks++;
  }
  if(day>=begin&&day<end)weekly+=total/60;
  if(m[1]===today())daily+=total/60;
 }
 const weeklyMinutes=settings.weeklyMinutes,full=weeklyMinutes>=2400,
 weekday=full?360:Math.round(weeklyMinutes/1800*240),
 weekend=full?360:Math.round(weeklyMinutes/1800*360);
 const day=new Date().getDay();
 const dailyGoal=day===6?weekend:weekday;
 return {weekly:Math.round(weekly),daily:Math.round(daily),weeklyGoal:weeklyMinutes,dailyGoal,blocks};
}
function card(label,value,pct,desc){
 return '<div class="summary-mini"><small>'+label+'</small><strong>'+value+'</strong>'+
 (pct==null?'':'<div class="bar"><div class="fill" style="width:'+Math.max(0,Math.min(100,pct))+'%"></div></div>')+
 (desc?'<small>'+desc+'</small>':'')+'</div>';
}
function renderGoals(){
 const x=timeStats(),p=percent(x.weekly,x.weeklyGoal),d=percent(x.daily,x.dailyGoal);
 $('goalOverview').innerHTML=card('이번 주 순학습',fmt(x.weekly)+' / '+fmt(x.weeklyGoal),p,'달성 '+p+'%')+
 card('오늘 순학습',fmt(x.daily)+' / '+fmt(x.dailyGoal),d,'달성 '+d+'%')+
 card('오늘 남은 학습',fmt(Math.max(0,x.dailyGoal-x.daily)),null,'완료한 타이머 블록 기준 · 미기록 학습은 제외');
}
function renderDashboard(){
 const stats=currentStats(),w=weights(),total=checklist.length,checked=Object.values(stats).reduce((n,k)=>n+k.checked,0),
 weak=Object.values(stats).reduce((n,k)=>n+k.weak,0),unsure=Object.values(stats).reduce((n,k)=>n+k.unsure,0);
 $('overallSubjectNote').textContent='6개 과목 · '+all.length+'개 학습 분류 · '+total+'개 세부 체크 항목 · 점검 '+checked+'/'+total+' · 자신 없음 '+weak+' · 애매함 '+unsure;
 $('subjectDashboard').innerHTML=subjectOrder.map(s=>{
  const x=stats[s],target=fmt(settings.weeklyMinutes*w[s]/100),levels=x.counts.map(n=>percent(n,x.units));
  return '<div class="subject-line"><div class="subject-head"><button class="subject-open" data-open-subject="'+s+'">'+s+' ↗</button><span class="sub">'+escape(window.studyExamScope[s])+'</span></div>'+
   '<div class="subject-metrics">'+levels.map((n,i)=>'<div><small>'+(i===3?'심화':(i+1)+'회독')+'</small><div class="mini-track"><i style="width:'+n+'%"></i></div><b>'+x.counts[i]+'/'+x.units+'</b></div>').join('')+'</div>'+
   '<div class="subject-foot"><span>자기진단 '+x.checked+'/'+x.parts+' · <b class="weak-text">취약 '+x.weak+'</b> · 애매 '+x.unsure+'</span><span>주 '+target+' · '+w[s].toFixed(1)+'%</span></div></div>';
 }).join('');
 $('overviewWeakness').innerHTML=subjectOrder.filter(s=>stats[s].weak||stats[s].unsure).map(s=>{
  const units=checklist.filter(x=>x.subject===s&&(confidence[x.id]==='weak'||confidence[x.id]==='unsure')).slice(0,3);
  return '<div class="weak-sample"><b>'+s+'</b> '+units.map(x=>escape(x.topic)).join(' · ')+(stats[s].weak+stats[s].unsure>3?' 외 '+(stats[s].weak+stats[s].unsure-3)+'개':'')+'</div>';
 }).join('')||'<span class="sub">체크한 취약·애매 항목이 아직 없습니다. 먼저 빠른 자기진단을 진행하세요.</span>';
}
function renderPlan(){
 const stats=currentStats(),w=weights();
 $('planWeeklyMinutes').value=settings.weeklyMinutes;
 $('allocationInputs').innerHTML=subjectOrder.map(s=>
  '<label class="allocation-input"><span>'+s+'</span><input inputmode="numeric" type="number" min="1" max="70" step="1" data-share="'+s+'" value="'+settings.shares[s]+'" aria-label="'+s+' 기본 비율"> %</label>').join('');
 $('allocationPreview').innerHTML=subjectOrder.map(s=>{
  const p=w[s],x=stats[s];
  return '<div class="allocate-row"><div class="row"><b>'+s+'</b><span>'+p.toFixed(1)+'% · '+fmt(settings.weeklyMinutes*p/100)+'</span></div><div class="bar"><div class="fill" style="width:'+p.toFixed(2)+'%"></div></div><small>자가진단 취약 '+x.weak+'개 · 애매 '+x.unsure+'개 (기본 비중 '+settings.shares[s]+'%)</small></div>';
 }).join('');
 $('allocationHelp').textContent='현재 기본 합계 100% · 수학 우선 배분. 자가진단 취약·애매 항목이 있으면 해당 과목에 일부 시간을 가중한 추천 비중을 표시합니다.';
}
function renderConfidence(){
 const stats=currentStats();
 const allCount=checklist.length,c=Object.values(stats).reduce((n,s)=>n+s.checked,0),
 weak=Object.values(stats).reduce((n,s)=>n+s.weak,0),strong=Object.values(stats).reduce((n,s)=>n+s.strong,0),
 unsure=Object.values(stats).reduce((n,s)=>n+s.unsure,0);
 $('confidenceStats').innerHTML=card('전체 세부 주제',allCount+'개',null,'학습 점검용 분류 초안')+
 card('자기 점검 완료',c+'/'+allCount,percent(c,allCount),'미확인 '+(allCount-c)+'개')+
 card('자신 있음 / 애매 / 자신 없음',strong+' / '+unsure+' / '+weak,null,'자가평가이며 실력 인증은 아닙니다');
 const stateNames={strong:'자신 있음',unsure:'애매함',weak:'자신 없음'};
 $('confidenceWorkspace').innerHTML=subjectOrder.map(s=>{
  const x=stats[s],units=subjects[s].map((title,i)=>{
   const parts=checklist.filter(t=>t.subject===s&&t.unitIndex===i&&(
     filter==='all'||filter==='weak'&&['weak','unsure'].includes(confidence[t.id])||filter==='unseen'&&!confidence[t.id]));
   if(!parts.length&&filter!=='all')return '';
   const lines=parts.map(t=>{
    const value=confidence[t.id]||'';
    return '<div class="confidence-row" data-confidence-row="'+t.id+'"><span class="confidence-topic">'+escape(t.topic)+'</span>'+
    '<div class="confidence-buttons">'+Object.entries(stateNames).map(([v,label])=>
       '<button type="button" class="confidence-btn" data-confidence-key="'+t.id+'" data-choice="'+v+'" aria-pressed="'+(value===v)+'" title="'+(value===v?'다시 눌러 체크 취소':'')+'">'+label+'</button>').join('')+'</div></div>';
   }).join('');
   const count=checklist.filter(t=>t.subject===s&&t.unitIndex===i&&confidence[t.id]).length,
     complete=(window.studyChecklistTopics[s]?.[i]||[]).length;
   return '<details class="confidence-unit" '+(allExpanded||filter!=='all'?'open':'')+'><summary><span>'+escape(title)+'</span><span class="sub">체크 '+count+'/'+complete+' · 펼치기</span></summary>'+lines+'</details>';
  }).join('');
  if(!units&&filter!=='all')return '';
  return '<details class="confidence-subject" data-subject="'+s+'" '+(s==='수학'||allExpanded||filter!=='all'?'open':'')+'><summary><b>'+s+'</b><span class="sub">점검 '+x.checked+'/'+x.parts+' · 취약 '+x.weak+' · 애매 '+x.unsure+'</span></summary><p class="sub">2028 출제과목: '+escape(window.studyExamScope[s])+'</p>'+units+'</details>';
 }).join('')||'<p class="summary-note">해당 상태의 주제가 없습니다. 필터를 전체로 바꾸세요.</p>';
 document.querySelectorAll('[data-show-confidence]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.showConfidence===filter)));
}
function saveChoice(key,value){
 if(!checklist.some(x=>x.id===key))return;
 if(confidence[key]===value)delete confidence[key];else confidence[key]=value;
 localStorage.setItem(sourceKey,JSON.stringify(confidence));
 const row=document.querySelector('[data-confidence-row="'+CSS.escape(key)+'"]');
 if(row)row.querySelectorAll('[data-choice]').forEach(b=>b.setAttribute('aria-pressed',String(confidence[key]===b.dataset.choice)));
 renderConfidence();
 // Keep the currently selected branch visible even after updating counts.
 const r=document.querySelector('[data-confidence-row="'+CSS.escape(key)+'"]');
 if(r){r.closest('.confidence-subject').open=true;r.closest('.confidence-unit').open=true}
 renderDashboard();renderGoals();renderPlan();
 document.dispatchEvent(new CustomEvent('study:change',{detail:{source:'confidence'}}));
}
$('confidenceWorkspace').addEventListener('click',e=>{const b=e.target.closest('[data-confidence-key]');if(b)saveChoice(b.dataset.confidenceKey,b.dataset.choice)});
document.querySelectorAll('[data-show-confidence]').forEach(btn=>btn.onclick=()=>{filter=btn.dataset.showConfidence;renderConfidence()});
$('confidenceExpand').onclick=()=>{allExpanded=!allExpanded;$('confidenceExpand').textContent=allExpanded?'모두 접기':'모두 펼치기';renderConfidence()};
$('allocationSave').onclick=()=>{
 const m=Number($('planWeeklyMinutes').value),values={};
 for(const s of subjectOrder){const input=document.querySelector('[data-share="'+s+'"]');values[s]=Number(input.value);}
 const sum=Object.values(values).reduce((a,b)=>a+b,0);
 if(!Number.isInteger(m)||m<300||m>4200){$('allocationFeedback').textContent='주간 순학습 목표는 300~4,200분으로 설정하세요.';return}
 if(Object.values(values).some(v=>!Number.isInteger(v)||v<1||v>70)||sum!==100){$('allocationFeedback').textContent='과목별 배분은 각각 1~70%이며 합계가 정확히 100%여야 합니다. 현재 '+sum+'%입니다.';return}
 settings=validSettings({weeklyMinutes:m,shares:values});localStorage.setItem(planKey,JSON.stringify(settings));
 $('allocationFeedback').textContent='목표 저장됨 · 시간표 추천에도 반영됩니다. 이 기기에만 저장됩니다.';
 rerender();document.dispatchEvent(new CustomEvent('study:change',{detail:{source:'plan'}}));
};
$('allocationReset').onclick=()=>{
 settings=validSettings({weeklyMinutes:1800,shares:defaultShares});
 localStorage.setItem(planKey,JSON.stringify(settings));$('allocationFeedback').textContent='기본 비중으로 되돌렸습니다.';rerender();document.dispatchEvent(new CustomEvent('study:change',{detail:{source:'plan'}}));
};
$('subjectDashboard').addEventListener('click',e=>{const btn=e.target.closest('[data-open-subject]');if(btn)openSubject(btn.dataset.openSubject)});
function openSubject(s){
 const tab=document.querySelector('[data-tab="diagnostic"]');if(tab)tab.click();
 const detail=document.querySelector('.confidence-subject[data-subject="'+CSS.escape(s)+'"]');
 if(detail){detail.open=true;detail.scrollIntoView({behavior:'smooth',block:'start'})}
}
function rerender(){renderGoals();renderDashboard();renderPlan();renderConfidence()}
window.studyManager={get settings(){return settings},weights,stats:currentStats,focus:timeStats,refresh:rerender,openSubject};
rerender();
document.addEventListener('study:change',e=>{if(e.detail?.source==='confidence'||e.detail?.source==='plan')return;renderGoals();renderDashboard()});
})();
