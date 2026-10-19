/* First-run four-slide guide. The guide is a view over existing units and goals: never delete or reset progress. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),FLAG='eunseong-intro-v1';
const subjects=['수학','국어','영어','통합사회','통합과학','한국사'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const localDate=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
let index=0,subject='수학',unit=0,mode=window.studyDayPlan?.getWeeklyMode?.()==='full'?'full':'school';
const hasSaved=()=>{try{return!!localStorage.getItem(FLAG)}catch{return false}};
function dateText(d){return String(d||'').replace(/^20(\d\d)-(\d\d)-(\d\d)$/,'$1.$2.$3')}
function stages(){
 const rounds=window.studyRoadmap?.passPlan?.()||[];
 $('introPasses').innerHTML=rounds.slice(0,3).map((round,i)=>
 '<div class="intro-round"><strong>'+(i+1)+'회독</strong><span>'+esc(dateText(round.end))+'까지</span>'+
 '<small>'+['기본 개념·대표 문제','유형·취약점 보강','평가원 기출·실전'][i]+'</small></div>').join('')+
 '<p class="sub" style="grid-column:1/-1;margin:0">이후 심화·실전: '+esc(dateText(rounds[3]?.end||'2027-11-10'))+'까지</p>';
}
function showUnits(){
 $('introSubjects').innerHTML=subjects.map(s=>
 '<button type="button" data-intro-subject="'+esc(s)+'" aria-pressed="'+String(s===subject)+'">'+esc(s)+'</button>').join('');
 $('introUnitButtons').innerHTML=(window.studyConcreteUnits?.[subject]||[]).map((row,i)=>
 '<button type="button" data-intro-unit="'+i+'" aria-pressed="'+String(i===unit)+'">'+esc(row[0])+'</button>').join('');
 showUnitDetail();
}
function showUnitDetail(){
 const item=window.studyConcrete?.unit(subject,unit);
 if(!item)return;
 $('introUnitDetail').innerHTML='<strong id="introUnitTitle">'+esc(item.name)+'</strong>'+
 '<div style="margin-top:7px"><b>핵심:</b> '+esc(item.concept)+'</div>'+
 '<div style="margin-top:6px"><b>직접 할 일:</b> '+esc(item.task)+'</div>'+
 '<div style="margin-top:6px"><b>심화:</b> '+esc(item.advanced)+'</div>'+
 '<button type="button" id="introOpenUnit" data-intro-open="true" class="secondary" style="margin-top:11px">이 단원 상세 공략 보기 →</button>';
}
function showHours(){
 const value=Number($('introHoursInput').value);
 $('introHourChoices').querySelectorAll('[data-intro-hours]').forEach(btn=>{
  const checked=btn.dataset.introMode===mode;
  btn.setAttribute('aria-pressed',String(checked));
 });
 $('introHourNote').textContent=mode==='full'?'전일 학습은 기본 순공부 10시간입니다. 나중에 일과표에서 과목과 시간을 수정할 수 있습니다.':
 mode==='school'?'학교 병행은 평일 기본 순공부 4시간, 주간 30시간 계획입니다.':
 '직접 입력한 '+(Number.isFinite(value)?value:'-')+'시간은 오늘 개인 목표로 기록하며 기본 주간 계획은 유지합니다.';
}
function render(){
 document.documentElement.classList.toggle('study-welcome',true);
 document.querySelectorAll('[data-intro-step]').forEach(el=>el.hidden=Number(el.dataset.introStep)!==index);
 $('introSteps').innerHTML=[0,1,2,3].map(i=>
 '<span class="intro-step-dot'+(i===index?' active':'')+'" aria-label="'+(i+1)+'단계"></span>').join('');
 $('introPrevious').hidden=index===0;
 $('introNext').textContent=index===3?'오늘 학습 시작 →':'다음 →';
 $('introNotice').textContent='';
 if(index===0)stages();if(index===1)showUnits();if(index===2)showHours();
}
function finish(saveGoal=true,targetTab='today'){
 if(saveGoal){
  const value=Number($('introHoursInput').value);
  if(!Number.isFinite(value)||value<0||value>20||Math.round(value*2)!==value*2){
   $('introNotice').textContent='0~20시간 범위에서 30분 단위로 입력해 주세요.';return;
  }
  if(mode==='full'||mode==='school'){
   const pick=$('scheduleMode');
   if(pick&&pick.value!==mode){pick.value=mode;pick.onchange?.()}
  }
  const date=localDate();
  if($('dailyTargetDate')){
   $('dailyTargetDate').value=date;
   $('dailyTargetMinutes').value=String(Math.round(value*60));
   $('dailyTargetReason').value='normal';
   $('dailyTargetNote').value='';
   $('dailyTargetSave').click();
  }
 }
 try{localStorage.setItem(FLAG,JSON.stringify({seenAt:new Date().toISOString()}))}
 catch{/* Guide may still close if browser storage is disabled. */}
 document.documentElement.classList.remove('study-welcome');
 const tab=document.querySelector('#primaryNav [data-tab="'+targetTab+'"]')||document.querySelector('[data-tab="'+targetTab+'"]');
 tab?.click();
 $('introReopen').focus();
}
$('introSubjects').addEventListener('click',e=>{
 const btn=e.target.closest('[data-intro-subject]');
 if(!btn)return;subject=btn.dataset.introSubject;unit=0;showUnits();
});
$('introUnitButtons').addEventListener('click',e=>{
 const btn=e.target.closest('[data-intro-unit]');if(!btn)return;
 unit=Number(btn.dataset.introUnit);showUnits();
});
$('introUnitDetail').addEventListener('click',e=>{
 if(!e.target.closest('[data-intro-open]'))return;
 const s=subject,i=unit;
 finish(false,'curriculum');
 window.openFreeStudy?.(s,i);
});
$('introHourChoices').addEventListener('click',e=>{
 const btn=e.target.closest('[data-intro-hours]');if(!btn)return;
 mode=btn.dataset.introMode;
 if(mode==='full')$('introHoursInput').value='10';
 else if(mode==='school')$('introHoursInput').value='4';
 showHours();
});
$('introHoursInput').addEventListener('input',()=>{
 const v=Number($('introHoursInput').value);
 if(mode==='school'&&v!==4||mode==='full'&&v!==10)mode='custom';
 showHours();
});
$('introPrevious').onclick=()=>{index=Math.max(0,index-1);render()};
$('introNext').onclick=()=>{if(index===3)finish(true);else{index++;render()}};
$('introSkip').onclick=()=>finish(false);
$('introReopen').onclick=()=>{index=0;render()};
if(hasSaved())document.documentElement.classList.remove('study-welcome');
else{index=0;render()}
window.studyIntro={reopen:()=>{index=0;render()},close:finish};
})();