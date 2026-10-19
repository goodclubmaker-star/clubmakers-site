/* Morning study target, exception reasons, original baseline and actual completed minutes. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),STORE='eunseong-daily-goals-v1';
const TODAY=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const DATE=d=>/^\d{4}-\d\d-\d\d$/.test(d)&&Number.isFinite(new Date(d+'T12:00:00').getTime());
const fmt=m=>{m=Math.max(0,Math.round(Number(m)||0));return Math.floor(m/60)+'시간 '+String(m%60).padStart(2,'0')+'분'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const REASONS={normal:'평소대로',ill:'몸이 아픔·컨디션 저하',event:'가족·학교·개인 일정',exam:'시험·수행평가 일정',rest:'휴식·회복이 필요함',other:'기타 조정'};
const getObject=key=>{try{const x=JSON.parse(localStorage.getItem(key));return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}};
let saved=getObject(STORE);
if(!saved.days||typeof saved.days!=='object')saved.days={};
const oldBreaks={school:[1,3,5,7],weekend:[1,3,5,7,9,11],sunday:[1,3,5,7,9,11],full:[1,3,5,7,9,11,13]};
function actualFor(date){
 const v1=getObject('eunseong-focus-v1'),v2=getObject('eunseong-focus-v2');
 const free=getObject('eunseong-free-study-v1');
 let legacySeconds=0,newSeconds=0,freeMinutes=0;
 for(const mode of Object.keys(oldBreaks)){
  const records=v1[date+'-'+mode]?.records||{};
  for(const [i,r] of Object.entries(records)){
   if(oldBreaks[mode].includes(Number(i)))continue;
   legacySeconds+=Math.max(0,Number(r?.seconds)||0);
  }
 }
 const rec=v2[date]?.records||{};
 for(const r of Object.values(rec)){
  if(r?.kind==='study')newSeconds+=Math.max(0,Number(r.seconds)||0);
 }
 if(Array.isArray(free.tasks))for(const t of free.tasks){
  if(t?.status==='done'&&t?.doneDate===date)freeMinutes+=Math.max(0,Math.min(300,Number(t.actualMinutes)||0));
 }
 return {
  legacy:Math.round(legacySeconds/60),
  timer:Math.round(newSeconds/60),
  free:Math.round(freeMinutes),
  total:Math.round((legacySeconds+newSeconds)/60+freeMinutes)
 };
}
function baseline(date){
 const standard=window.studyDayPlan?.baselineFor?.(date);
 return standard?.study??(window.studyDayPlan?.getWeeklyMode?.()==='full'?600:240);
}
function get(date=TODAY()){
 const stored=saved.days[date];
 const defaultMinutes=baseline(date);
 const original=Number.isInteger(stored?.baselineMinutes)?stored.baselineMinutes:defaultMinutes;
 const personal=Number.isInteger(stored?.targetMinutes)?stored.targetMinutes:defaultMinutes;
 const actual=actualFor(date);
 return {date,baselineMinutes:original,currentBaseline:defaultMinutes,targetMinutes:personal,
  reason:stored?.reason||'normal',note:stored?.note||'',setAt:stored?.setAt||null,
  actualMinutes:actual.total,actual,remaining:Math.max(0,personal-actual.total),
  baseRemaining:Math.max(0,original-actual.total)};
}
function compare(){
 const info=get(),pct=(v,d)=>d>0?Math.min(100,Math.round(v/d*100)):100;
 const changed=info.setAt!==null&&(info.targetMinutes!==info.baselineMinutes||info.reason!=='normal');
 const badge=changed?REASONS[info.reason]:'기본 계획';
 const text='<div class="daily-compare-summary">'+
 '<div><small>원래 해야 할 공부</small><strong>'+fmt(info.baselineMinutes)+'</strong></div>'+
 '<div><small>오늘 정한 목표</small><strong>'+fmt(info.targetMinutes)+'</strong><span>'+esc(badge)+'</span></div>'+
 '<div><small>실제 학습 기록</small><strong>'+fmt(info.actualMinutes)+'</strong><span>남은 개인 목표 '+fmt(info.remaining)+'</span></div></div>'+
 '<div class="daily-bars"><div><small>원래 기준 달성률 '+pct(info.actualMinutes,info.baselineMinutes)+'%</small>'+
 '<div class="bar"><div class="fill" style="width:'+pct(info.actualMinutes,info.baselineMinutes)+'%"></div></div></div>'+
 '<div><small>오늘 개인 목표 달성률 '+pct(info.actualMinutes,info.targetMinutes)+'%</small>'+
 '<div class="bar"><div class="fill" style="width:'+pct(info.actualMinutes,info.targetMinutes)+'%"></div></div></div></div>'+
 '<p class="sub">타이머와 자유 학습에서 실제로 기록한 시간을 합산합니다. 목표를 줄여도 원래 학습 기준과 진도는 별도로 유지합니다.</p>';
 $('dailyGoalOverview').innerHTML=text;
 $('dailyTargetSummary').innerHTML=text;
 $('dailyTargetWeeklyInfo').textContent=info.setAt?'설정: '+new Date(info.setAt).toLocaleString('ko-KR')+' · 사유 '+badge:'아직 오늘 목표를 직접 정하지 않았습니다. 원래 계획을 그대로 사용합니다.';
}
function formSync(date){
 if(!DATE(date))date=TODAY();
 const info=get(date);
 $('dailyTargetDate').value=date;
 $('dailyTargetMinutes').value=String(info.targetMinutes);
 $('dailyTargetReason').value=info.reason;
 $('dailyTargetNote').value=info.note;
 const override=window.studyDayPlan?.get?.(date);
 const custom=window.studyDayPlan?.timeline?.(date);
 $('dailyTargetSource').innerHTML='원래 기본 계획: <strong>'+fmt(info.baselineMinutes)+'</strong>'+
 ' · 날짜별 시간표: <strong>'+fmt(custom?.study||0)+'</strong>'+
 (override?.mode?'<br><small>정해둔 단원 시간과 아침에 선택한 실제 목표는 별도로 관리합니다.</small>':'');
}
function save(){
 const date=$('dailyTargetDate').value,target=Number($('dailyTargetMinutes').value),reason=$('dailyTargetReason').value,note=$('dailyTargetNote').value.trim();
 if(!DATE(date)){$('dailyTargetFeedback').textContent='날짜를 확인해 주세요.';return}
 if(!Number.isInteger(target)||target<0||target>1200){$('dailyTargetFeedback').textContent='순학습 목표는 0~1,200분으로 입력하세요.';return}
 if(!Object.hasOwn(REASONS,reason)||note.length>240){$('dailyTargetFeedback').textContent='조정 사유나 메모를 확인해 주세요.';return}
 const current=saved.days[date],base=current?.baselineMinutes??baseline(date);
 saved.days[date]={targetMinutes:target,baselineMinutes:base,reason,note,setAt:new Date().toISOString()};
 try{localStorage.setItem(STORE,JSON.stringify(saved))}catch(e){$('dailyTargetFeedback').textContent='저장되지 않았습니다: '+e.message;return}
 $('dailyTargetFeedback').textContent='선택한 날짜의 목표가 저장되었습니다. 원래 계획은 변경하지 않았습니다.';
 refresh();
 document.dispatchEvent(new CustomEvent('study:change',{detail:{source:'dailyGoal'}}));
}
function refresh(){compare();formSync($('dailyTargetDate').value||TODAY())}
$('dailyTargetDate').value=TODAY();
$('dailyTargetReason').innerHTML=Object.entries(REASONS).map(([value,label])=>'<option value="'+esc(value)+'">'+esc(label)+'</option>').join('');
$('dailyTargetDate').onchange=()=>formSync($('dailyTargetDate').value);
$('dailyTargetSave').onclick=save;
$('dailyTargetReset').onclick=()=>{
 const date=$('dailyTargetDate').value;
 if(!saved.days[date]){$('dailyTargetFeedback').textContent='이 날짜는 원래 목표를 따르고 있습니다.';return}
 delete saved.days[date];
 try{localStorage.setItem(STORE,JSON.stringify(saved))}catch(e){$('dailyTargetFeedback').textContent='원래 목표로 되돌리지 못했습니다: '+e.message;return}
 $('dailyTargetFeedback').textContent='개인 조정 목표를 지우고 원래 계획으로 돌아왔습니다.';
 refresh();
 document.dispatchEvent(new CustomEvent('study:change',{detail:{source:'dailyGoal'}}));
};
$('dailyTargetJumpSchedule').onclick=()=>{
 const date=$('dailyTargetDate').value;
 document.querySelector('[data-tab="plan"]')?.click();
 window.studyDayPlan?.edit?.(date);
 $('dayPlanEditor')?.scrollIntoView({block:'start',behavior:'smooth'});
};
window.studyDailyGoals={get,actualFor,baseline,refresh,fmt,sourceKey:STORE};
document.addEventListener('study:change',e=>{
 if(e.detail?.source==='dailyGoal')return;
 refresh();
});
refresh();
})();