/* 2028 CSAT evidence-based planning prototype. Estimates are NOT guaranteed question frequencies. */
(()=>{'use strict';
const $=id=>document.getElementById(id),E=window.studyEvidence;
const scope=['수학','국어','영어','통합과학','통합사회','한국사'];
const settingKey='eunseong-roadmap-config-v1',recordKey='eunseong-stage-events-v1',baselineKey='eunseong-stage-baseline-v1';
const progressKey='eunseong-curriculum-demo-v1',confidenceKey='eunseong-confidence-v1';
const ST='2026-10-19',EXAM='2027-11-18',END2='2027-07-31',END3='2027-10-15',END4='2027-11-10';
const iso=d=>{const x=new Date(d);return new Date(+x-x.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const day=s=>new Date(s+'T12:00:00');
const diff=(a,b)=>Math.max(0,Math.ceil((+day(b)-+day(a))/86400000));
const today=()=>iso(new Date());
const fmt=m=>{m=Math.max(0,Math.round(m));return m<60?m+'분':Math.floor(m/60)+'시간'+(m%60?' '+m%60+'분':'')};
const short=s=>s?.replace('2026-','26.').replace('2027-','27.').replace('-','.')||'';
const read=k=>{try{return JSON.parse(localStorage.getItem(k))||{}}catch{return {}}};
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let config=read(settingKey);
let deadline=/^2027-(0[1-6])-\d\d$/.test(config.firstDeadline)&&config.firstDeadline<'2027-07-31'?config.firstDeadline:'2027-03-31';
const phases=()=>[
 {name:'1회독',target:1,start:ST,end:deadline,desc:'전 범위 기본 개념·대표 예제'},
 {name:'2회독',target:2,start:deadline,end:END2,desc:'기본~중급 유형과 약점 보강'},
 {name:'3회독',target:3,start:END2,end:END3,desc:'기출·복합 추론·시간 관리'},
 {name:'심화·실전',target:4,start:END3,end:END4,desc:'고난도·실전 모의·오답 정교화'}
];
function phaseNow(){const t=today();return phases().find(p=>t<=p.end)||phases()[3]}
function subjectWeight(s){return (window.studyManager?.weights()?.[s]||({수학:42,국어:20,영어:16,통합과학:10,통합사회:8,한국사:4}[s]))/100}
function unitProgress(x){return Math.max(0,Math.min(4,Number(read(progressKey)[x.id])||0))}
function partsFor(x){return window.studyChecklistTopics?.[x.s]?.[Number(x.id.split('_').pop())]||[]}
function confidenceFor(x){const v=read(confidenceKey),idx=x.id;
 const ps=partsFor(x);return {weak:ps.filter((_,j)=>v[idx+'__'+j]==='weak').length,unsure:ps.filter((_,j)=>v[idx+'__'+j]==='unsure').length}
}
function baseImportance(x){
 const index=+x.id.split('_').pop();
 if(x.s==='수학'){
  const sample=E.sampleMath[index],mod=E.importanceModifiers[index];
  return (sample.numbers.length+0.65)*mod;
 }
 if(x.s==='국어'){
  // Area totals from one 2028 example exam; split across internal learning categories as a *planning proxy*, not per-unit counts.
  return (E.koreanUnitProxy[index]+0.65)*(E.subjectUnitPriorities.국어[index]||1);
 }
 if(x.s==='영어'){
  // 17 listening of 45 official format. The learning-topic split is an editable planning proxy, NOT official unit-by-unit counts.
  return (E.englishProxy[index]+.65)*(E.subjectUnitPriorities.영어[index]||1);
 }
 return (E.subjectUnitPriorities[x.s]?.[index]||1)*(1+Math.max(0,partsFor(x).length-3)*.09);
}
function score(x){const c=confidenceFor(x);return baseImportance(x)*(1+Math.min(.55,c.weak*.11+c.unsure*.045))}
function groups(s,pass=phaseNow().target){
 const deferred=read('eunseong-unit-defer-v1');
 const original=all.filter(x=>x.s===s&&!deferred[x.id]).map(x=>({...x,stage:unitProgress(x),priority:score(x)}));
 const pending=original.filter(x=>x.stage<pass);
 // On the first pass, prerequisites lead; later passes emphasize exam relevance and weakness.
 return (pending.length?pending:original).sort((a,b)=>
    pass===1 ? (+a.id.split('_').pop())-(+b.id.split('_').pop()) : b.priority-a.priority);
}
function suggest(s,seed=0,pass=phaseNow().target){
 const ordered=groups(s,pass);if(!ordered.length)return null;
 const pending=ordered.filter(x=>x.stage<pass);
 const group=pending.length?pending:ordered;
 // Revisit the CURRENT unit with different subtopics until its stage is recorded complete.
 const x=pass===1?group[0]:group[Math.abs(Math.floor(seed||0))%Math.min(group.length,3)];
 const conf=read(confidenceKey),raw=partsFor(x);
 const ranked=raw.map((t,j)=>({text:t,index:j,state:conf[x.id+'__'+j]}));
 ranked.sort((a,b)=>
   ({weak:0,unsure:1,undefined:2,strong:3}[a.state]??2)-({weak:0,unsure:1,undefined:2,strong:3}[b.state]??2));
 const index=Math.abs(Math.floor(seed||0))%Math.max(1,ranked.length);
 const focus=ranked[index]?.text||'대표 개념과 예제';
 return {subject:s,unit:x.t,unitId:x.id,topic:focus,title:x.t+' · '+focus,
  priority:x.priority,stage:x.stage,pass,ready: x.stage>=pass};
}
function getPlan(){
 const w=window.studyManager?.weights()||{},weekly=window.studyManager?.settings.weeklyMinutes||1800;
 const phase=phaseNow(),dayKey=today(),daysLeft=Math.max(1,diff(dayKey,phase.end)),weeksLeft=daysLeft/7,
 remaining=all.filter(x=>unitProgress(x)<phase.target);
 const totals={};
 for(const s of scope){
  const candidates=groups(s,phase.target),missing=candidates.filter(x=>x.stage<phase.target),active=missing.length?missing:candidates;
  const sum=active.reduce((n,x)=>n+x.priority,0)||1;
  const weeklyMin=weekly*subjectWeight(s);
  totals[s]=active.map(x=>({...x,share:x.priority/sum,weeklyMin:weeklyMin*x.priority/sum,remainingMin:weeklyMin*weeksLeft*x.priority/sum}));
 }
 return {phase,weekly,remaining,daysLeft,weeksLeft,totals};
}
function byUnit(s,pass=phaseNow().target){
 const list=groups(s,pass),weekly=(window.studyManager?.settings.weeklyMinutes||1800)*subjectWeight(s),sum=list.reduce((n,x)=>n+x.priority,0)||1;
 return list.map(x=>({...x,weeklyMin:weekly*x.priority/sum}));
}
function sampleLabel(s,index){if(s!=='수학')return '예전 수능의 해당 단원별 횟수는 직접 비교 불가';
 const n=E.sampleMath[index].numbers;
 return n.length+'문항 ('+n.join('·')+'번)'}
function evidencePanel(){
 const source=E.sources.map(x=>'<a target="_blank" rel="noopener noreferrer" href="'+x.url+'">'+safe(x.label)+' ↗</a>').join(' · ');
 const table=['수학','국어','영어','통합과학','통합사회','한국사'].map(s=>{
  const units=byUnit(s);
  return '<details class="allocation-subject" '+(s==='수학'?'open':'')+'><summary><strong>'+s+'</strong><span>'+fmt(units.reduce((n,x)=>n+x.weeklyMin,0))+'/주 · '+units.length+'개 단원</span></summary>'+
  '<div class="wide-scroll"><table class="priority-table"><thead><tr><th>단원</th><th>2028 공개 예시 / 근거</th><th>2024~2026 실제 수능 대표 사례</th><th>학습 우선도</th><th>이번 주 권장</th><th>학습 상태</th></tr></thead><tbody>'+
  units.map(x=>{
    const idx=Number(x.id.split('_').pop()),sample=x.s==='수학'?E.sampleMath[idx]:null,korean=x.s==='국어'?E.sampleKorean.byUnit[idx]:null,english=x.s==='영어'?(idx===6||idx===7?'영어 듣기 17문항 범주':'영어 독해·어법 등 28문항 범주'):null;
    const maxImportance=scope.includes(x.s)?Math.max(...all.filter(z=>z.s===x.s).map(z=>baseImportance(z))):1;
    const p=Math.min(100,Math.round(baseImportance(x)/maxImportance*100));
    const level=['미시작','1회독','2회독','3회독','심화'][x.stage],past=x.s==='수학'?E.pastExamExamples[idx]||[]:[];
    return '<tr><td><strong>'+safe(x.t)+'</strong>'+(sample?'<br><small>'+safe(sample.focus)+'</small>':'')+'</td>'+
     '<td><strong>'+(sample?sample.numbers.length+'문항 · '+sample.numbers.join('·')+'번':korean?safe(korean)+' (대영역 기준)':english?safe(english)+' (유형 기준)':'비교 가능한 단원별 횟수 미확인')+'</strong>'+(sample?'<br><small>'+safe(sample.note)+'</small>':korean?'<br><small>내부 단원에 문항 수를 임의 배분하지 않음</small>':english?'<br><small>17문항 듣기·28문항 기타를 학습 범위에 나눈 계획용 비율</small>':'<br><small>개념 난이도·범위에 따른 전략적 판단</small>')+'</td>'+
     '<td>'+(past.length?past.map(e=>'<small><b>'+e.year+' '+safe(e.item)+'</b> · '+safe(e.kind)+'</small>').join('<br>'):'<small>검증된 대표 사례 미등록<br>출제되지 않았다는 뜻 아님</small>')+'</td>'+ 
     '<td><div class="tiny-bar"><i style="width:'+p+'%"></i></div><small>학습 우선 '+p+'점*</small></td>'+
     '<td><strong>'+fmt(x.weeklyMin)+'</strong></td><td>'+level+'</td></tr>';
  }).join('')+'</tbody></table></div></details>';
 }).join('');
 $('evidenceInfo').innerHTML='<p class="summary-note"><b>숫자의 의미:</b> 수학의 문항 수는 실제 2028 수능의 역대 빈도가 아니라 평가원이 공개한 <b>2028 예시문항 1회(30문항)</b>의 단원별 분석입니다. 2024~2026 실제 수능은 선택과목 방식이 달라 당시 대표 사례만 별도 열에 두었습니다. 사례가 없는 단원도 출제 가능성을 0으로 가정하지 않습니다. 국어는 같은 예시문항의 대영역 기준 문항 수(독서·문학 각 15, 화법·언어·작문 각 5)를 사용하며, 중단원별 횟수로 오인하지 않게 구분했습니다. 영어는 공식 듣기 17/45문항을 반영하지만 세부 유형별 횟수는 임의로 단정하지 않습니다. 통합사회·통합과학·한국사는 검증된 동일 기준의 단원별 출제횟수 자료가 없어 시간을 꾸며 계산하지 않고, <b>학습 범위·개념 부담·취약도에 따른 권장안</b>으로 표시합니다.</p>'+
 '<p><b>탐구의 출제 경향:</b> 통합사회 예시문항은 지리·일반사회 개념과 지도·도표 해석, 통합과학은 실험·자료 해석과 단원 연계가 중요하게 분석됐습니다. 영역·소단원별 미래 출제 개수는 고정된 값이 아니므로 학습 난도와 취약도에 기반해 배분합니다.</p>'+ 
 '<p><b>기존 실제 수능 변별형:</b> 2025학년도 수학Ⅰ 수열 귀납적 정의(22번), 수학Ⅱ 함수의 극한(21번); 2026학년도 수학Ⅰ 지수·로그함수 그래프(22번), 수학Ⅱ 함수의 극한(21번), 선택 확률과 통계(30번) 등. <b>2028 예시에서 강조된 유형:</b> 지수·로그함수 그래프 30번, 미분가능성 28번, 경우의 수 21번, 조건부확률 29번. 예시문항 출제 비율은 확정 출제 계획이 아닙니다.</p>'+
 '<p class="sub">* 실제 수능 열의 과거 번호는 검증된 일부 대표 사례만 등록한 것이며, 전수조사를 통해 계산한 출제 빈도는 아닙니다. 중요도 점수는 공식 통계가 아닌 앱 내부 상대 학습 우선지표입니다. 한두 문항이 적게 나온 단원도 생략하지 않습니다.</p><p class="sub">'+source+'</p>';
 $('evidenceUnitTable').innerHTML=table;
}
function dateMetrics(){
 const t=today(),p=phaseNow();
 const allCount=all.length,counts=[1,2,3,4].map(k=>all.filter(x=>unitProgress(x)>=k).length),d=diff(t,p.end);
 const remaining=Math.max(0,allCount-counts[p.target-1]),speed=remaining/(Math.max(d,1)/7);
 const weekly=window.studyManager?.settings.weeklyMinutes||1800;
 const todayStat=window.studyManager?.focus?.();
 const stageTime=weekly*Math.max(0,d)/7;
 return {t,p,counts,d,remaining,speed,weekly,stageTime,todayStat};
}
function activeSubjectDay(dayOffset=0){
 const dayOf=(new Date().getDay()+dayOffset)%7;
 const pairs={0:['수학','통합과학','국어'],1:['수학','국어','영어'],2:['수학','영어','통합과학'],3:['수학','국어','통합사회'],
 4:['수학','영어','한국사'],5:['수학','국어','통합과학'],6:['수학','통합사회','영어']};
 return pairs[dayOf]||pairs[1];
}
function sticky(){
 const m=dateMetrics(),duration=(m.todayStat?.dailyGoal||220),w=Math.round(m.todayStat?.weekly||0),dp=Math.round(m.todayStat?.daily||0);
 const phase=m.p;
 const mo=new Date(),last=new Date(mo.getFullYear(),mo.getMonth()+1,0);
 const mEnd=iso(last)>phase.end?phase.end:iso(last);
 const thisMonth=Math.max(0,diff(today(),mEnd)+1);
 const monthTarget=Math.min(m.remaining,Math.ceil(m.speed*thisMonth/7));
 const weekTarget=Math.min(m.remaining,Math.max(1,Math.ceil(m.speed)));
 const dayGoal=activeSubjectDay()[0],unit=suggest(dayGoal,new Date().getDay());
 $('goalRail').innerHTML=[
   '<div class="goal-item"><small>장기 · 3회독+심화</small><b>1회독 '+short(deadline)+' 완료 목표</b><span>'+phase.name+' '+m.counts[phase.target-1]+'/'+all.length+' · D-'+m.d+'</span></div>',
   '<div class="goal-item"><small>월간 · '+(mo.getMonth()+1)+'월</small><b>'+phase.name+' '+monthTarget+'단원 목표</b><span>1회독 이후에도 단계별로 재계산</span></div>',
   '<div class="goal-item"><small>주간 목표</small><b>'+weekTarget+'단원 · '+fmt(w)+'/'+fmt(m.weekly)+'</b><span>월~일 · 실제 기록과 비교</span></div>',
   '<div class="goal-item"><small>오늘 목표</small><b>'+safe(unit?.unit||'단원 선택')+'</b><span>'+safe(unit?.topic||'단원 학습')+' · '+fmt(dp)+'/'+fmt(duration)+'</span></div>'
 ].join('');
 $('goalRail').querySelectorAll('.goal-item').forEach((x,i)=>x.onclick=()=>{const tab=document.querySelector('[data-tab="'+(i===3?'today':i===2?'plan':'overview')+'"]');tab?.click()});
}
function longGoals(){
 const m=dateMetrics(),ps=phases(),todayKey=today();
 const stats=window.studyManager?.stats();
 $('roundDeadline').value=deadline;
 const durations=ps.map((p,i)=>{
  const start=day(p.start),end=day(p.end),from=todayKey>p.start?todayKey:p.start;
  const weeks=Math.max(0,diff(from,p.end))/7;
  return {phase:p,weeks,minutes:Math.round(weeks*m.weekly)};
 });
 $('passPlan').innerHTML=durations.map(({phase:p,weeks,minutes})=>{
   const done=all.filter(x=>unitProgress(x)>=p.target).length;
   const pct=Math.round(done/all.length*100);
   return '<div class="pass-row"><div><strong>'+p.name+'</strong><span class="sub">'+short(p.end)+' 마감 · '+p.desc+'</span></div>'+
     '<div class="pass-meter"><i style="width:'+pct+'%"></i></div><span><b>'+done+'/'+all.length+'</b> · 남은 예산 '+fmt(minutes)+'</span></div>';
 }).join('');
 const assigned=Object.entries(window.studyManager?.weights()||{}).sort((a,b)=>b[1]-a[1]);
 $('timeAllocation').innerHTML=assigned.map(([s,p])=>{
  const unit=suggest(s,0);
  return '<div class="subject-hour"><div class="row"><b>'+s+'</b><span>'+p.toFixed(1)+'% · '+fmt(m.weekly*p/100)+'/주</span></div>'+
    '<div class="bar"><div class="fill" style="width:'+p+'%"></div></div>'+
    '<small>우선: '+safe(unit?.unit||'미확정')+' · '+safe(unit?.topic||'')+'</small></div>';
 }).join('');
 const weekMin=Math.max(0,m.weekly),remaining=Math.max(0,m.remaining);
 $('roadmapPace').innerHTML='<b>'+m.p.name+' 기한:</b> '+short(m.p.end)+' · 남은 '+m.d+'일 · 이 단계 미완료 '+remaining+'/'+all.length+'개 · 권장 주간 완료 속도 약 '+m.speed.toFixed(1)+'단원.<br><small>시간 예산은 설정한 주 '+fmt(weekMin)+'과 과목별 배분으로 계산한 계획치입니다. 점검표는 학습 단위의 분류이며 실제 223개 세부 항목을 모두 평가한 점수가 아닙니다.</small>';
}
function priorityGoals(){
 const time=dateMetrics(),p=time.p,todayList=activeSubjectDay();
 const recommended=scope.map(s=>suggest(s,0,p.target)).filter(Boolean);
 const now=new Date(),weekEnd=new Date(now);
 weekEnd.setDate(now.getDate()+((7-now.getDay())%7));
 const wRate=Math.max(1,Math.ceil(time.speed)),monthEnd=iso(new Date(now.getFullYear(),now.getMonth()+1,0));
 const monthWeeks=Math.max(1,(diff(today(),monthEnd)+1)/7),monthCount=Math.min(time.remaining,Math.ceil(time.speed*monthWeeks));
 $('weekTaskList').innerHTML='<strong>이번 주 '+p.name+' 목표: 약 '+wRate+'단원 완료</strong>'+
 '<p class="sub">목표 달성 판정은 학습 완료 단계 기록으로 확인합니다. 아래는 우선 학습 후보이며, 실제 시간표는 설정된 과목별 비율에 따라 배치합니다.</p>'+
 '<div class="goal-tasks">'+recommended.map(t=>'<div><strong>'+t.subject+'</strong> · '+safe(t.unit)+'<br><span>'+safe(t.topic)+'</span><br><button type="button" class="secondary task-done" data-task-done="'+safe(t.unitId)+'" data-task-pass="'+p.target+'">'+p.name+' 완료 표시</button></div>').join('')+'</div>';
 const expanded=todayList.map((s,i)=>suggest(s,now.getDate()+i,p.target)).filter(Boolean);
 const available=time.todayStat?.dailyGoal||220,raw=expanded.map(x=>x.subject==='수학'?.46:x.subject==='국어'?.29:.25);
 const total=raw.reduce((a,b)=>a+b,0);
 $('todayTaskList').innerHTML='<strong>오늘 학습 주제 · '+fmt(available)+' 권장</strong>'+
 '<div class="goal-tasks">'+expanded.map((x,i)=>'<div><strong>'+x.subject+' · '+safe(x.unit)+'</strong><br><span>'+safe(x.topic)+'</span><br><small>권장 약 '+fmt(available*raw[i]/total)+'</small><br><button type="button" class="secondary task-done" data-task-done="'+safe(x.unitId)+'" data-task-pass="'+p.target+'">'+p.name+' 완료 표시</button></div>').join('')+'</div>'+
 '<p class="sub">세부 학습 시간은 권장 분배입니다. 타이머 완료 기록이 자동으로 단원 성취를 인증하지는 않습니다.</p>';
 $('monthTaskList').innerHTML='<b>'+(now.getMonth()+1)+'월 · '+p.name+'</b> · 계획 '+monthCount+'단원. 우선순위 '+recommended.slice(0,4).map(x=>x.subject+' '+x.unit).join(' / ');
}
function svgLine(a,b,color='currentColor'){return '<path d="'+a+'" fill="none" stroke="'+color+'" stroke-width="'+b+'" stroke-linejoin="round" stroke-linecap="round"/>'}
function longTarget(dateKey){
 const edges=[{date:ST,val:0},{date:deadline,val:all.length},{date:END2,val:all.length*2},{date:END3,val:all.length*3},{date:END4,val:all.length*3}];
 const t=+day(dateKey);let last=edges[0];
 for(const n of edges.slice(1)){if(t<=+day(n.date)){
  return last.val+(n.val-last.val)*Math.max(0,(t-(+day(last.date)))/((+day(n.date))-(+day(last.date))||1))
 }last=n}
 return all.length*3;
}
function ensureBaseline(override){
 if(read(baselineKey).at)return;
 localStorage.setItem(baselineKey,JSON.stringify({at:Date.now(),stages:override||read(progressKey)}));
}
function prepareProgressEvent(id,oldLevel){
 const before={...read(progressKey)};
 if(id!=='reset')before[id]=Number(oldLevel)||0;
 ensureBaseline(before);
}
function logProgress(id,oldLevel,newLevel){
 prepareProgressEvent(id,oldLevel);
 const events=read(recordKey);const arr=Array.isArray(events.items)?events.items:[];
 arr.push({at:Date.now(),id,from:Number(oldLevel)||0,to:Number(newLevel)||0});
 localStorage.setItem(recordKey,JSON.stringify({items:arr.slice(-2000)}));
 document.dispatchEvent(new CustomEvent('study:change',{detail:{source:'progress'}}));
}
function calcPast(levels,events,until){
 const stage={...levels};
 for(const e of events)if(e.at<=until)stage[e.id]=e.to;
 return Object.values(stage).reduce((a,v)=>a+Math.min(3,Math.max(0,+v||0)),0);
}
function pathLine(points){return points.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}
function renderGraphs(){
 ensureBaseline();
 const baseline=read(baselineKey),events=(read(recordKey).items||[]).sort((a,b)=>a.at-b.at);
 const now=today(),end=EXAM,first=ST,current=Math.min(+day(now),+day(end));
 const w=670,h=194,left=45,right=25,top=13,bottom=37,iw=w-left-right,ih=h-top-bottom;
 const xx=d=>left+Math.max(0,Math.min(1,(+day(d)-(+day(first)))/((+day(end))-(+day(first))))) *iw;
 const yy=v=>top+ih*(1-Math.max(0,Math.min(100,v))/100);
 const tickMonths=[];
 for(let year=2026,mon=10;year<2028;mon++){if(mon>12){year++;mon=1}if(year===2027&&mon===12)break;tickMonths.push(year+'-'+String(mon).padStart(2,'0')+'-01')}
 const tx=[first,...tickMonths,END2,END3,END4,end].filter((v,i,a)=>a.indexOf(v)===i).sort();
 const targets=tx.map(d=>[xx(d),yy(100*longTarget(d)/(all.length*3))]);
 const startAt=iso(new Date(Number(baseline.at)||Date.now()));
 const initial=baseline.stages||{};
 const days=[startAt,now,...events.map(e=>iso(new Date(e.at)))].filter((v,i,a)=>a.indexOf(v)===i&&v>=first&&v<=now).sort();
 const actual=days.map(d=>{
  const after=+day(d)+12*3600000,score=calcPast(initial,events,after);
  return [xx(d),yy(100*score/(all.length*3))]
 });
 const grids=[0,25,50,75,100].map(n=>'<line x1="'+left+'" x2="'+(w-right)+'" y1="'+yy(n)+'" y2="'+yy(n)+'" stroke="#e5eaf2"/><text x="'+(left-7)+'" y="'+(yy(n)+3)+'" text-anchor="end" font-size="10" fill="#718097">'+n+'%</text>').join('');
 const dateTicks=['2026-10-19','2027-01-01','2027-04-01','2027-07-01','2027-10-01','2027-11-18'].map(d=>'<text x="'+xx(d)+'" y="'+(h-12)+'" text-anchor="middle" font-size="10" fill="#718097">'+(d.slice(2,4)+'.'+Number(d.slice(5,7)))+'</text>').join('');
 const link=actual.length>1?svgLine(pathLine(actual),'3','#406fcb'):'';
 const point=actual.length?'<circle cx="'+actual[actual.length-1][0]+'" cy="'+actual[actual.length-1][1]+'" r="5" fill="#406fcb"/>':'';
 $('longChart').innerHTML='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="1회독 2회독 3회독 장기 계획 진척도, 기록을 시작한 날 이후 실제 변화 표시">'+
 grids+dateTicks+'<path d="'+pathLine(targets)+'" fill="none" stroke="#a4aebb" stroke-width="2" stroke-dasharray="7 5"/>'+link+point+'</svg>';
 const score=Object.values(read(progressKey)).reduce((a,v)=>a+Math.min(3,Math.max(0,Number(v)||0)),0);
 $('longChartLabel').textContent='현재 3회독 누적 진도 '+score+'/'+(all.length*3)+' ('+Math.round(score/(all.length*3)*100)+'%). 회색 점선=단계별 목표, 파란색=이 브라우저에서 기록을 시작한 '+short(startAt)+' 이후 실제 기록. 이전 날짜의 진도는 추정하지 않습니다.';
 const days14=[...Array(14)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-13+i);return iso(d)});
 const focus=read('eunseong-focus-v1'),rest={school:[1,3,5,7],weekend:[1,3,5,7,9,11],sunday:[1,3,5,7,9,11],full:[1,3,5,7,9,11,13]};
 const freeTasks=read('eunseong-free-study-v1').tasks||[];
 const daily=days14.map(d=>{
  let seconds=0;
  for(const mode of Object.keys(rest))for(const [i,r] of Object.entries(focus[d+'-'+mode]?.records||{})){
   if(!rest[mode].includes(+i))seconds+=Math.max(0,Number(r.seconds)||0);
  }
  const extra=Array.isArray(freeTasks)?freeTasks.filter(t=>t.status==='done'&&t.doneDate===d).reduce((m,t)=>m+Math.max(0,Math.min(300,Number(t.actualMinutes)||0)),0):0;
  return Math.round(seconds/60+extra);
 });
 const dailyGoal=Math.ceil((window.studyManager?.settings.weeklyMinutes||1800)/7),max=Math.max(dailyGoal,...daily,60);
 const bw=(iw-13*7)/14;
 const bars=daily.map((m,i)=>{
  const x=left+i*(bw+7),height=ih*m/max;
  return '<rect x="'+x+'" y="'+(top+ih-height)+'" width="'+bw+'" height="'+height+'" rx="3" fill="#3b72cb"/>'+
   (i%2===0?'<text x="'+(x+bw/2)+'" y="'+(h-10)+'" font-size="10" text-anchor="middle" fill="#738097">'+Number(days14[i].slice(8))+'</text>':'');
 }).join('');
 $('shortChart').innerHTML='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="최근 14일간 일별 완료한 순학습 시간">'+
 '<line x1="'+left+'" y1="'+(top+ih)+'" x2="'+(w-right)+'" y2="'+(top+ih)+'" stroke="#bfc9d8"/>'+
 '<line x1="'+left+'" y1="'+(top+ih-ih*dailyGoal/max)+'" x2="'+(w-right)+'" y2="'+(top+ih-ih*dailyGoal/max)+'" stroke="#a4aebb" stroke-dasharray="5 4"/>'+
 bars+'</svg>';
 $('shortChartLabel').textContent='최근 14일간 정규 타이머와 자유 학습에서 완료·기록한 순학습 시간. 회색 점선은 주간 목표를 7일로 나눈 참고선('+fmt(dailyGoal)+')입니다. 학습 시간을 별도로 기록하지 않았다면 0으로 표시됩니다.';
}
function refresh(){longGoals();priorityGoals();sticky();evidencePanel();renderGraphs()}
$('roundSave').onclick=()=>{
 const d=$('roundDeadline').value;
 if(!/^2027-\d\d-\d\d$/.test(d)||d<'2027-01-01'||d>='2027-07-31'||d<today()){
  $('roundFeedback').textContent='1회독 마감일은 현재 이후부터 2027년 7월 30일 사이로 입력하세요.';return;
 }
 deadline=d;localStorage.setItem(settingKey,JSON.stringify({firstDeadline:d}));
 $('roundFeedback').textContent='1회독 기한을 변경했습니다. 목표·시간 배분·그래프에 반영됩니다.';refresh();document.dispatchEvent(new CustomEvent('study:change',{detail:{source:'roadmap'}}));
};
document.addEventListener('click',e=>{
 const target=e.target.closest?.('[data-task-done]');
 if(!target)return;
 const id=target.dataset.taskDone,pass=Number(target.dataset.taskPass);
 const x=all.find(unit=>unit.id===id);
 if(!x||!Number.isInteger(pass)||pass<1||pass>4)return;
 const progress=unitProgress(x);
 if(progress>=pass){target.textContent='이미 '+pass+'회독 이상 완료';return}
 if(!confirm('해당 단원의 '+pass+'회독 학습을 완료 처리할까요? 개념·대표 문제까지 확인한 경우에만 완료하세요.'))return;
 window.studyProgressSet?.(id,pass);
});
window.studyRoadmap={refresh,suggest,score,groups,phase:phaseNow,passPlan:phases,logProgress,prepareProgressEvent,get firstDeadline(){return deadline}};
document.addEventListener('study:change',()=>refresh());
ensureBaseline();
refresh();
})();