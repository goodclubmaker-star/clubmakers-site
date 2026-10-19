/* Focus timer for editable wake-to-bed daily plans, with safe independent v2 records. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),KEY='eunseong-focus-v2';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const localDate=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY));return x&&typeof x==='object'?x:{}}catch{return {}}};
let state=read(),activeDate=localDate();
const fmtSecs=s=>{s=Math.max(0,Math.floor(Number(s)||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return h?String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0'):String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0')};
function focusMode(){return $('focusMode').value||window.studyDayPlan?.weekdayMode(localDate())||'school'}
function todayRows(){
 const date=localDate();
 return window.studyDayPlan?.timeline(date,focusMode());
}
function getSession(){
 const date=localDate();if(activeDate!==date)activeDate=date;
 if(!state[date]||typeof state[date]!=='object')state[date]={selected:null,records:{},elapsed:0,startedAt:null};
 const session=state[date];if(!session.records||typeof session.records!=='object')session.records={};
 return session;
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){$('focusStats').textContent='기록 저장 오류: '+e.message};window.studyCloudChanged?.(KEY);document.dispatchEvent(new CustomEvent('study:change',{detail:{source:'timer'}}))}
function getCurrent(){
 const timeline=todayRows();if(!timeline||timeline.error)return{timeline,rows:[],session:getSession(),current:null,index:-1};
 const rows=timeline.rows,s=getSession();
 let index=rows.findIndex(x=>x.id===s.selected);
 if(index<0){
  index=rows.findIndex(x=>x.kind==='study');
  if(index<0)index=0;
  s.selected=rows[index]?.id||null;s.elapsed=s.records[s.selected]?.seconds||0;s.startedAt=null;
 }
 return {timeline,rows,session:s,current:rows[index],index};
}
function elapsed(s){return Math.max(0,Math.floor((Number(s.elapsed)||0)+(s.startedAt?(Date.now()-s.startedAt)/1000:0)))}
function pause(){const s=getSession();if(s.startedAt){s.elapsed=elapsed(s);s.startedAt=null;save()}}
function select(index){
 const data=getCurrent();if(!data.rows[index])return;
 pause();const s=getSession();s.selected=data.rows[index].id;s.elapsed=s.records[s.selected]?.seconds||0;s.startedAt=null;save();draw();
}
function unitFor(row,index){
 const subj=row.subject==='오답·복습'?'수학':row.subject;
 return row.kind==='study'&&subj?window.studyRoadmap?.suggest(subj,index):null;
}
function renderTable(data){
 const {rows,session,current,timeline}=data;
 $('focusTable').innerHTML='<div class="sub" style="margin:8px 0">하루 전체 일정: '+esc(rows[0]?.start||'')+' 기상 → '+esc(rows.at(-1)?.end||'')+' 취침 · 순학습 '+Math.round((timeline.study||0)/60*10)/10+'시간</div>'+
 '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th>시간</th><th>과목·일정</th><th>분류</th><th>계획</th><th>실제</th><th>상태</th></tr></thead><tbody>'+
 rows.map((row,i)=>{
  const rec=session.records[row.id],focus=unitFor(row,i);
  return '<tr data-block="'+i+'" style="cursor:pointer;border-top:1px solid #e6eaf2;background:'+(current?.id===row.id?'#e9efff':'transparent')+'">'+
  '<td style="padding:10px 4px;white-space:nowrap">'+esc(row.start)+'–'+esc(row.end)+'</td>'+
  '<td><strong>'+esc(row.title)+'</strong>'+(focus?'<br><small class="sub">'+esc(focus.title)+'</small><br><button type="button" class="secondary" data-free-unit="'+esc(focus.unitId)+'">단원 공략</button>':'')+'</td>'+
  '<td>'+esc(row.kind==='study'?'순공부':row.title)+'</td><td>'+row.minutes+'분</td>'+
  '<td>'+(rec?Math.round(rec.seconds/60)+'분':'—')+'</td>'+
  '<td>'+(rec?'기록 완료':current?.id===row.id?'선택':'대기')+'</td></tr>';
 }).join('')+'</tbody></table>';
 for(const row of $('focusTable').querySelectorAll('[data-block]')){
  row.onclick=e=>{if(e.target.closest('[data-free-unit]'))return;select(Number(row.dataset.block))};
 }
}
function draw(){
 const data=getCurrent(),{timeline,rows,session:s,current,index}=data;
 if(!current||timeline?.error){
  $('focusStats').textContent='일정 오류: '+(timeline?.error||'공부 블록이 없습니다.')+' 시간표에서 일과를 수정하세요.';
  $('focusTable').innerHTML='';$('focusClock').textContent='00:00';$('focusNow').textContent='시간표를 확인하세요.';return;
 }
 const target=current.minutes*60,seconds=elapsed(s),remain=Math.max(0,target-seconds),unit=unitFor(current,index);
 $('focusClock').textContent=fmtSecs(remain);
 $('focusNow').textContent=current.title+(unit?' · '+unit.title:'')+' · 목표 '+current.minutes+'분'+
 (s.startedAt?' · 진행 중':' · 대기/일시정지');
 const records=Object.values(s.records),actual=records.filter(r=>r?.kind==='study').reduce((sum,r)=>sum+(Number(r.seconds)||0),0);
 const stats=window.studyDailyGoals?.get?.(localDate());
 $('focusStats').innerHTML='<strong>현재 일과 순학습 '+(timeline.study||0)+'분 · 타이머 기록 '+Math.round(actual/60)+'분 · 전체 실제 '+(stats?.actualMinutes??Math.round(actual/60))+'분</strong>'+
 '<p class="sub">기상~취침 전체 계획에서 공부 시간만 집계합니다. 오늘 아침에 정한 목표와 원래 목표는 위에서 비교할 수 있습니다.</p>';
 renderTable(data);
}
$('focusMode').value=window.studyDayPlan?.weekdayMode?.(localDate())||'school';
$('focusMode').onchange=()=>{pause();draw()};
$('focusStart').onclick=()=>{const s=getSession();if(!s.startedAt){s.startedAt=Date.now();save()}draw()};
$('focusPause').onclick=()=>{pause();draw()};
$('focusDone').onclick=()=>{
 pause();const data=getCurrent(),s=data.session,row=data.current;
 if(!row)return;
 s.records[row.id]={kind:row.kind,seconds:Math.max(0,Math.min(row.minutes*60,elapsed(s))),finishedAt:new Date().toISOString(),title:row.title};
 const next=Math.min(data.index+1,data.rows.length-1);s.selected=data.rows[next]?.id||null;
 s.elapsed=s.records[s.selected]?.seconds||0;s.startedAt=null;save();draw();
};
$('focusSkip').onclick=()=>{const d=getCurrent();select(Math.min(d.index+1,d.rows.length-1))};
$('focusReset').onclick=()=>{
 if(!confirm('오늘의 새 타이머 기록을 초기화할까요? 과거 방식으로 저장된 학습 기록과 자유 학습 기록은 유지됩니다.'))return;
 delete state[localDate()];save();draw();
};
document.addEventListener('study:change',e=>{
 if(e.detail?.source==='dayplan'||e.detail?.source==='schedule'){$('focusMode').value=window.studyDayPlan.weekdayMode(localDate());}
 if(e.detail?.source==='timer')return;draw();
});
setInterval(()=>{
 const data=getCurrent(),s=data.session,b=data.current;
 if(!s.startedAt||!b)return;
 const rest=Math.max(0,b.minutes*60-elapsed(s));
 if(rest===0){pause();draw()}else $('focusClock').textContent=fmtSecs(rest);
},1000);
window.studyFocusTimer={refresh:draw,storeKey:KEY};
draw();
})();