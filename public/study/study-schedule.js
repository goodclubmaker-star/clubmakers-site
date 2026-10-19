/* Editable day-plan driven weekly timetable: full = 7 × 10h, school = 30h initially. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const names=['수학','국어','영어','통합과학','통합사회','한국사'];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
const weekdays=['일','월','화','수','목','금','토'];
const fmt=m=>{m=Math.round(Math.abs(m));return Math.floor(m/60)+'시간 '+(m%60)+'분'};
const stage=date=>{
 const d=iso(date),first=window.studyRoadmap?.firstDeadline||'2027-03-31';
 return d<=first?'1회독 · 개념':d<='2027-07-31'?'2회독 · 유형':d<='2027-10-15'?'3회독 · 기출':d<='2027-11-10'?'심화 · 실전':'최종 복습';
};
function build(){
 const mode=$('scheduleMode').value,raw=$('scheduleStart').value;
 const anchor=raw?new Date(raw+'T12:00:00'):new Date();
 if(!Number.isFinite(anchor.getTime())){$('scheduleSummary').textContent='주 시작일을 다시 입력하세요.';return}
 const monday=new Date(anchor);monday.setDate(anchor.getDate()-((anchor.getDay()+6)%7));
 const assigned=Object.fromEntries(names.map(s=>[s,0]));
 const dayTotals=[],blocks=[],errors=[];let seq=0;
 for(let d=0;d<7;d++){
  const date=new Date(monday);date.setDate(monday.getDate()+d);
  const dateKey=iso(date),dayMode=window.studyDayPlan.weekdayMode(dateKey,mode);
  const t=window.studyDayPlan.timeline(dateKey,dayMode);
  if(t.error){errors.push(dateKey+' '+t.error);continue}
  dayTotals.push({date:dateKey,day:weekdays[date.getDay()],minutes:t.study,wake:t.rows[0]?.start||'',sleep:t.rows.at(-1)?.end||''});
  for(const row of t.rows){
   if(row.kind!=='study')continue;
   const subject=names.includes(row.subject)?row.subject:'수학';
   assigned[subject]+=row.minutes;
   const selected=window.studyRoadmap?.suggest(subject,seq+date.getDay());
   blocks.push({date:dateKey,day:weekdays[date.getDay()],time:row.start+'–'+row.end,minutes:row.minutes,
    subject,stage:stage(date),activity:row.title,focus:selected?.title||'세부 학습 단원을 선택하세요',focusId:selected?.unitId||null});
   seq++;
  }
 }
 const total=dayTotals.reduce((n,x)=>n+x.minutes,0),goal=window.studyManager?.settings.weeklyMinutes||1800;
 const difference=total-goal;
 const compare=difference===0?' · 주간 목표와 일치':
  ' · <span class="sub">주간 목표와 '+(difference>0?'+':'−')+fmt(difference)+' 차이 (과목 블록/주간 목표를 조정하세요)</span>';
 $('scheduleSummary').innerHTML='<strong>'+esc(iso(monday))+' 시작 주간 · '+(mode==='full'?'전일 학습':'학교 병행')+'</strong><br>'+
 '일과표의 순공부 합계 <strong>'+fmt(total)+'</strong> · '+blocks.length+'개 학습 블록 · 주간 목표 '+fmt(goal)+compare+
 (errors.length?'<br><strong>검토 필요: '+errors.map(esc).join(', ')+'</strong>':'')+
 '<p class="sub">날짜별 일과표에 저장한 기상·취침·과목별 공부 시간이 그대로 반영됩니다. 오전에 조정한 개인 학습 목표는 기본 계획과 별도로 비교됩니다.</p>';
 $('scheduleDailySummary').innerHTML=dayTotals.map(day=>
  '<div class="day-week-card"><small>'+day.day+'요일 · '+day.date.slice(5)+'</small><strong>'+fmt(day.minutes)+'</strong><span>'+day.wake+' 기상 · '+day.sleep+' 취침</span></div>').join('');
 $('scheduleTable').innerHTML='<table class="study-week-table"><thead><tr><th>요일</th><th>시간</th><th>과목·세부 단원</th><th>학습 단계</th><th>분</th></tr></thead><tbody>'+
 blocks.map(b=>'<tr><td>'+b.day+'</td><td>'+esc(b.time)+'</td><td><strong>'+esc(b.subject)+' · '+esc(b.activity)+'</strong>'+
 '<br><small class="sub">'+esc(b.focus)+'</small>'+
 (b.focusId?'<br><button type="button" class="secondary" data-free-unit="'+esc(b.focusId)+'">해당 단원 공략</button>':'')+
 '</td><td>'+esc(b.stage)+'</td><td>'+b.minutes+'</td></tr>').join('')+'</tbody></table>';
 $('scheduleAllocation').innerHTML=names.map(s=>{
  const mins=assigned[s],percent=total?Math.round(mins/total*100):0;
  return '<div style="margin:9px 0"><div class="row"><strong>'+s+'</strong><span class="sub">'+fmt(mins)+' · '+percent+'%</span></div>'+
  '<div class="bar"><div class="fill" style="width:'+percent+'%"></div></div></div>';
 }).join('');
}
document.addEventListener('study:change',e=>{if(e.detail?.source!=='schedule')build()});
$('scheduleMode').value=window.studyDayPlan?.getWeeklyMode?.()||'school';
const now=new Date();
$('scheduleStart').value=iso(now);
$('scheduleBuild').onclick=build;
$('scheduleMode').onchange=()=>{
 const mode=$('scheduleMode').value,old=window.studyDayPlan.getWeeklyMode();
 window.studyDayPlan.setWeeklyMode(mode);
 const previous=window.studyManager?.settings.weeklyMinutes;
 if((mode==='full'&&previous===1800)||(mode==='school'&&previous===4200)){
  window.studyManager?.setWeeklyMinutes?.(mode==='full'?4200:1800);
 }
 build();
 document.dispatchEvent(new CustomEvent('study:change',{detail:{source:'schedule'}}));
};
window.studyWeekSchedule={build};
if($('scheduleMode').value==='full'&&window.studyManager?.settings.weeklyMinutes===1800){window.studyManager?.setWeeklyMinutes?.(4200)}
build();
})();