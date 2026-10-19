(()=>{
const $=id=>document.getElementById(id);const names=['국어','수학','영어','통합사회','통합과학','한국사'];const weights={국어:20,수학:42,영어:16,통합사회:8,통합과학:10,한국사:4};
const base={school:[['19:00','20:30'],['20:40','22:10'],['22:20','23:20']],full:[['09:00','10:30'],['10:40','12:10'],['13:30','15:00'],['15:10','16:40']]};
const weekend={school:{sat:[['09:00','10:30'],['10:40','12:10'],['13:30','15:00'],['15:10','16:40']],sun:[['10:00','11:30'],['11:40','13:10'],['15:00','16:00']]},full:{sat:[['09:00','10:30'],['10:40','12:10'],['13:30','15:00'],['15:10','16:40']],sun:[['10:00','11:30'],['11:40','13:10'],['15:00','16:30'],['16:40','18:10']]}};
function minutes([a,b]){const [h,m]=a.split(':').map(Number),[hh,mm]=b.split(':').map(Number);return(hh*60+mm)-(h*60+m)}
function diagnostics(){
 let d={};try{d=JSON.parse(localStorage.getItem('eunseong-interviews-v1'))||{}}catch{}
 const w=window.studyManager?.weights()||{...weights},weak={};
 for(const [id,r] of Object.entries(d)){
  const name=names.find(s=>id.startsWith(s+'_'));if(!name||r.version!==2||r.total<5)continue;
  if(r.path==='집중 보강'){weak[name]=(weak[name]||0)+1;w[name]+=0.5}
 }
 return {w,weak};
}
function weakTopics(){
 let saved={};try{saved=JSON.parse(localStorage.getItem('eunseong-confidence-v1'))||{}}catch{}
 const result=Object.fromEntries(names.map(s=>[s,[]]));
 for(const s of names){
  (window.studyChecklistTopics?.[s]||[]).forEach((unit,i)=>unit.forEach((topic,j)=>{
   const status=saved[s+'_'+i+'__'+j];if(status==='weak'||status==='unsure')result[s].push(topic);
  }));
 }
 return result;
}
function stage(date){const d=date.toLocaleDateString('en-CA'),first=window.studyRoadmap?.firstDeadline||'2027-03-31';return d<=first?'1회독·개념':d<='2027-07-31'?'2회독·유형':d<='2027-10-15'?'3회독·기출':d<='2027-11-10'?'심화·실전':'최종 복습'}
function build(){const mode=$('scheduleMode').value,raw=$('scheduleStart').value,anchor=raw?new Date(raw+'T12:00:00'):new Date();if(!Number.isFinite(anchor.getTime()))return;const monday=new Date(anchor);monday.setDate(anchor.getDate()-((anchor.getDay()+6)%7));const {w,weak}=diagnostics(),selfWeak=weakTopics(),selfCursor=Object.fromEntries(names.map(s=>[s,0])),totalWeight=names.reduce((a,s)=>a+w[s],0);const blocks=[];const days=['월','화','수','목','금','토','일'];let seq=0;const pattern=['수학','국어','영어','수학','통합과학','수학','국어','영어','통합사회','수학','영어','한국사'];const assigned={};names.forEach(s=>assigned[s]=0);for(let day=0;day<7;day++){const date=new Date(monday);date.setDate(monday.getDate()+day);const slots=day<5?base[mode]:day===5?weekend[mode].sat:weekend[mode].sun;for(const slot of slots){const mins=minutes(slot);let best=pattern[seq%pattern.length];const eligible=names.map(s=>({s,score:(w[s]/totalWeight)*(blocks.reduce((a,b)=>a+b.minutes,0)+mins)-assigned[s]})).sort((a,b)=>b.score-a.score);if(eligible.length)best=eligible[0].s;assigned[best]+=mins;const selected=window.studyRoadmap?.suggest(best,seq+day);blocks.push({day:days[day],date:date.toLocaleDateString('en-CA'),time:slot.join('–'),minutes:mins,subject:best,stage:stage(date),focusId:selected?.unitId||null,focus:selected?selected.unit+' → '+selected.topic:(selfWeak[best].length?selfWeak[best][(selfCursor[best]++)%selfWeak[best].length]:null)});seq++}}
const total=blocks.reduce((a,b)=>a+b.minutes,0),goal=window.studyManager?.settings.weeklyMinutes||1800; $('scheduleSummary').innerHTML='<strong>'+monday.toLocaleDateString('ko-KR')+' 시작 주간</strong> · 순공부 '+(total/60).toFixed(1)+'시간 · '+blocks.length+'개 학습 블록'+(total===goal?' · 주간 목표와 시간표 일치':' · <strong>목표 '+(goal/60).toFixed(1)+'시간 대비 시간표 '+((total-goal)/60).toFixed(1)+'시간 차이</strong> (30h/42h 템플릿 확인)')+'<br>자가진단에서 표시한 보강 항목: '+(names.filter(s=>selfWeak[s].length).map(s=>s+' '+selfWeak[s].length+'개').join(', ')||'미입력')+' · 문제로 확인한 보강 단원 '+(Object.values(weak).reduce((a,b)=>a+b,0))+'개';$('scheduleTable').innerHTML='<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th style="padding:8px;text-align:left">요일</th><th>시간</th><th>과목</th><th>학습 단계</th><th>분</th></tr></thead><tbody>'+blocks.map(b=>'<tr style="border-top:1px solid #e6eaf2"><td style="padding:8px">'+b.day+'</td><td>'+b.time+'</td><td><strong>'+b.subject+'</strong>'+(b.focus?'<br><small class="sub">보강: '+b.focus+'</small>':'')+'</td><td>'+b.stage+'</td><td>'+b.minutes+'</td></tr>').join('')+'</tbody></table>';$('scheduleAllocation').innerHTML=names.map(s=>{const m=assigned[s],p=Math.round(m/total*100);return '<div style="margin:9px 0"><div class="row"><strong>'+s+'</strong><span class="sub">'+(m/60).toFixed(1)+'시간 · '+p+'%</span></div><div class="bar"><div class="fill" style="width:'+p+'%"></div></div></div>'}).join('')}
document.addEventListener('study:change',build);if(window.studyManager?.settings.weeklyMinutes===2520)$('scheduleMode').value='full';const now=new Date(),iso=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);$('scheduleStart').value=iso;$('scheduleBuild').onclick=build;$('scheduleMode').onchange=build;build();
})();