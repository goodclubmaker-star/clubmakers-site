/* Live daily schedule, current clock and focus context. No extra logging or duplicate timer. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const clock=()=>new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false});
const localDate=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const toMins=x=>{const p=String(x).split(':');return Number(p[0])*60+Number(p[1])};
let lastDate='',lastMode='',lastMinute=-1;
function update(force=false){
 const now=new Date(),m=now.getHours()*60+now.getMinutes(),date=localDate(),mode=$('focusMode').value;
 $('liveClock').textContent=clock();
 if(!force&&lastMinute===m&&lastDate===date&&lastMode===mode)return;
 lastMinute=m;lastDate=date;lastMode=mode;
 const t=window.studyDayPlan?.timeline(date,mode);
 if(!t||t.error||!t.rows?.length){
  $('liveActivity').textContent='시간표를 확인해 주세요';
  $('liveActivityTime').textContent=t?.error||'오늘 일과표를 불러올 수 없습니다.';
  $('liveNext').textContent='전체 계획에서 시간표를 설정할 수 있습니다.';
  $('liveType').textContent='일정 없음';
  $('todayScheduleRows').innerHTML='<p class="sub">시간표 오류 또는 등록된 활동이 없습니다.</p>';
  $('liveSelectCurrent').hidden=true;
  return;
 }
 const first=toMins(t.rows[0].start),last=toMins(t.rows.at(-1).end);
 let nowMins=m;
 if(last<=first&&m<first)nowMins=m+1440; // sleep after midnight
 let active=t.rows.findIndex((row,i)=>{
   let a=toMins(row.start),b=toMins(row.end);
   if(a<first)a+=1440;if(b<=a)b+=1440;
   return nowMins>=a&&nowMins<b;
 });
 const before=nowMins<first,after=active<0&&!before;
 const row=active>=0?t.rows[active]:null;
 const study=row?.kind==='study',subject=row?.subject==='오답·복습'?'수학':row?.subject;
 const unit=study?window.studyRoadmap?.suggest(subject,active):null;
 const concrete=unit?window.studyConcrete?.fromId(unit.unitId):null;
 if(before){
  $('liveActivity').textContent='기상 전 · 하루 준비';
  $('liveActivityTime').textContent='기상 '+t.rows[0].start+' 예정';
  $('liveType').textContent='기상 전';
 }else if(after){
  $('liveActivity').textContent='오늘 일과 종료';
  $('liveActivityTime').textContent='취침 '+t.rows.at(-1).end;
  $('liveType').textContent='휴식';
 }else{
  $('liveActivity').textContent=study?(unit?subject+' · '+(concrete?.name||unit.unit):row.title):row.title;
  $('liveActivityTime').textContent=row.start+' – '+row.end+(study&&concrete?' · '+concrete.task:'');
  $('liveType').textContent=study?'순공부':'일상·휴식';
 }
 const following=active>=0?active+1:before?0:t.rows.length;
 const next=t.rows[following];
 $('liveNext').textContent=next?'다음 '+next.start+' · '+next.title:'오늘 마지막 일정입니다.';
 const selected=window.studyFocusTimer?.current?.();
 $('liveSelectCurrent').hidden=!study||selected?.selected===row?.id;
 $('liveSelectCurrent').textContent=study?'현재 공부 블록 타이머 선택':'';
 let start=active>=0?Math.max(0,active-1):before?0:Math.max(0,t.rows.length-4);
 let until=Math.min(t.rows.length,start+8);
 let items=t.rows.slice(start,until).map((r,j)=>{
  const idx=start+j,s=r.kind==='study',named=s?window.studyRoadmap?.suggest(r.subject==='오답·복습'?'수학':r.subject,idx):null;
  const actual=named?window.studyConcrete?.fromId(named.unitId):null;
  return '<div class="today-schedule-row'+(idx===active?' is-now':idx<active?' is-past':'')+(s?'':' is-life')+'">'+
   '<time>'+esc(r.start)+'–'+esc(r.end)+'</time><div><b>'+esc(s?(r.subject+' · '+(actual?.name||named?.unit||r.title)):r.title)+'</b>'+
   (s?'<small>'+esc(actual?.task||named?.topic||'오늘의 학습 과제')+'</small>':'')+'</div>'+
   (s?'<button class="secondary" type="button" data-live-select="'+idx+'">선택</button>':'<span class="sub" style="text-align:right;font-size:11px">'+r.minutes+'분</span>')+'</div>';
 }).join('');
 if(until<t.rows.length){
  items+='<details class="today-details"><summary>이후 일정 '+(t.rows.length-until)+'개 더 보기</summary>'+
   t.rows.slice(until).map((r,j)=>{
    const idx=until+j,s=r.kind==='study',unit=s?window.studyRoadmap?.suggest(r.subject==='오답·복습'?'수학':r.subject,idx):null,
    concrete=unit?window.studyConcrete?.fromId(unit.unitId):null;
    return '<div class="today-schedule-row'+(s?'':' is-life')+'"><time>'+esc(r.start)+'–'+esc(r.end)+'</time>'+
    '<div><b>'+esc(s?r.subject+' · '+(concrete?.name||unit?.unit||'학습'):r.title)+'</b>'+
    (s?'<small>'+esc(concrete?.task||unit?.topic||'')+'</small>':'')+'</div>'+
    (s?'<button class="secondary" data-live-select="'+idx+'" type="button">선택</button>':'<span class="sub">'+r.minutes+'분</span>')+'</div>';
   }).join('')+'</details>';
 }
 $('todayScheduleRows').innerHTML=items;
}
$('todayScheduleRows').addEventListener('click',e=>{
 const btn=e.target.closest('[data-live-select]');
 if(!btn)return;window.studyFocusTimer?.selectIndex?.(Number(btn.dataset.liveSelect));update(true);
 document.querySelector('#liveStudyHero')?.scrollIntoView({behavior:'smooth',block:'start'});
});
$('liveSelectCurrent').onclick=()=>{
 const date=localDate(),mode=$('focusMode').value,t=window.studyDayPlan?.timeline(date,mode);
 if(!t?.rows)return;
 const m=new Date(),minute=m.getHours()*60+m.getMinutes(),first=toMins(t.rows[0].start);
 const adjusted=minute<first?minute+1440:minute;
 const i=t.rows.findIndex(row=>{
  let a=toMins(row.start),b=toMins(row.end);if(a<first)a+=1440;if(b<=a)b+=1440;
  return row.kind==='study'&&adjusted>=a&&adjusted<b;
 });
 if(i>=0)window.studyFocusTimer?.selectIndex?.(i);update(true);
};
$('todayGoalEditOpen').onclick=()=>{
 $('todayTargetEditor').open=true;
 $('todayTargetEditor').scrollIntoView({behavior:'smooth',block:'nearest'});
 $('dailyTargetMinutes').focus();
};
$('focusMode').addEventListener('change',()=>update(true));
document.addEventListener('study:change',()=>update(true));
document.querySelectorAll('#primaryNav [data-tab]').forEach(btn=>btn.addEventListener('click',()=>update(true)));
setInterval(()=>update(),30000);
window.studyLive={refresh:()=>update(true)};
update(true);
})();