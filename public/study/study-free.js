/* Self-directed study: on-device drafts. No login or cloud sync until family design is finalized. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const STORE='eunseong-free-study-v1', MEMORY='eunseong-free-memory-v1';
const playbooks=window.studyFreePlaybooks||{},rounds=window.studyFreeRoundGuides||{};
const subjectsAll=['수학','국어','영어','통합과학','통합사회','한국사'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const read=k=>{try{const x=JSON.parse(localStorage.getItem(k));return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}};
const localDate=d=>{const date=d||new Date();return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10)};
let saved=read(STORE),tasks=Array.isArray(saved.tasks)?saved.tasks.filter(x=>x&&x.id&&subjectsAll.includes(x.subject)&&Number.isInteger(x.unitIndex)):[],editing=null,showTranslations=true;
let memory=read(MEMORY);
const unitId=(s,i)=>s+'_'+i;
const selected=()=>{
 const s=$('freeSubject').value,i=Number($('freeUnit').value),j=Number($('freeFocus').value);
 const title=subjects[s]?.[i]||'',topic=window.studyChecklistTopics?.[s]?.[i]?.[j]||'전체 개념';
 return {s,i,j,title,topic,id:unitId(s,i)};
};
function save(){
 try{localStorage.setItem(STORE,JSON.stringify({version:1,tasks}));window.studyCloudChanged?.(STORE);return true}
 catch(e){$('freeNotice').textContent='저장 공간이 부족하거나 차단되어 저장하지 못했습니다: '+e.message;return false}
}
function restoreSubject(s){
 $('freeSubject').value=subjectsAll.includes(s)?s:'수학';
 $('freeUnit').innerHTML=subjects[$('freeSubject').value].map((name,i)=>'<option value="'+i+'">'+esc(name)+'</option>').join('');
 $('freeUnit').value='0';restoreFocus();
}
function restoreFocus(){
 const s=$('freeSubject').value,i=Number($('freeUnit').value),parts=window.studyChecklistTopics?.[s]?.[i]||[];
 $('freeFocus').innerHTML=parts.map((name,j)=>'<option value="'+j+'">'+esc(name)+'</option>').join('')||'<option value="0">전체 단원</option>';
 $('freeFocus').value='0';
}
function suggestPass(id){
 const r=read('eunseong-curriculum-demo-v1');
 return Math.max(1,Math.min(4,(Number(r[id])||0)+1));
}
function usage(s){
 return {수학:'정의·조건 확인 → 손풀이 → 풀이 설명',국어:'근거 표시 → 선지 반박 → 오답 유형 정리',
 영어:'단어·숙어 회상 → 문장 구조 → 지문 적용',통합사회:'개념 지도 → 사례 비교 → 자료 해석',
 통합과학:'원리·모형 → 변인·그래프 → 복합 자료',한국사:'연표 → 원인·결과 → 사료 검증'}[s]||'핵심 개념→문제→복습';
}
function lesson(){
 const x=selected(),base=playbooks[x.s]?.[x.i]||[],
  unitParts=window.studyChecklistTopics?.[x.s]?.[x.i]||[],
  level=Number($('freeStage').value)||1,
  stages=rounds[x.s]||[],instructions=['1회독 · 개념','2회독 · 유형','3회독 · 기출','심화 · 실전'];
 const main=unitParts[x.j]||x.topic;
 const custom=$('freeGoal').value.trim();
 const reason=$('freeReason').value;
 let intro=base[0]||'관련 개념과 원리를 정의·사례로 확인합니다.',tactic=base[1]||usage(x.s);
 let tip=base[2]||'정의와 적용 조건을 빠뜨리지 않습니다.',advanced=base[3]||'여러 자료와 조건을 결합해 스스로 풀이 근거를 설명합니다.';
 const req=['핵심 용어와 선수 개념 확인','오늘 선택 주제: '+main,'단원 공략: '+tactic,
     '취약한 판단·오답 원인 기록','제한시간 없이 설명 후, 시간 제한으로 다시 검증'];
 const current=stages[level-1]||['학습 후 대표 문제를 풀어 봅니다.','오답을 다시 검증합니다.'];
 const refQ=encodeURIComponent('2028 수능 '+x.s+' '+x.title+' '+main);
 $('freeGuide').innerHTML='<header class="free-guide-head"><div><small>'+esc(x.s)+' / '+esc(x.title)+' / '+esc(main)+'</small>'+
 '<h3>'+esc(main)+' 공략</h3></div><span class="pill">'+esc(instructions[level-1])+'</span></header>'+
 '<div class="free-guide-summary"><strong>이 단원에서 알아야 할 것</strong><p>'+esc(intro)+'</p>'+
 '<strong>풀이와 공부의 핵심 전략</strong><p>'+esc(tactic)+'</p><strong>자주 틀리는 부분</strong><p>'+esc(tip)+'</p></div>'+
 (custom?'<div class="summary-note"><b>내가 직접 세운 목표:</b> '+esc(custom).replace(/\n/g,'<br>')+'</div>':'')+
 '<h4>이번 '+esc(instructions[level-1])+'의 실행 순서</h4>'+
 '<ol class="free-guide-steps">'+req.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ol>'+
 '<div class="free-stage-detail"><strong>현재 단계에서 달성할 것</strong><p>'+esc(current[0])+'</p>'+
 '<strong>초기 통과 기준</strong><p>'+esc(current[1])+'</p></div>'+
 '<h4>회독별 목표와 심화 범위</h4>'+
 '<div class="free-round-grid">'+stages.map(([aim,pass],i)=>'<div class="free-round'+(level===i+1?' current':'')+'">'+
 '<strong>'+esc(instructions[i])+'</strong><p>'+esc(aim)+'</p><small>확인: '+esc(pass)+'</small></div>').join('')+'</div>'+
 '<div class="free-advanced"><h4>심화는 어디까지?</h4><p>'+esc(advanced)+'</p>'+
 '<p class="sub">기초를 넘어서는 문제는 3회독과 심화에서 다룹니다. 위 통과 기준과 문항 수는 학습용 초기 제안이지 검증된 평가원 합격선은 아닙니다.</p></div>'+
 '<div class="flex" style="margin-top:15px"><a href="https://www.google.com/search?q='+refQ+'+EBS+개념" target="_blank" rel="noopener">EBS 개념·강의 검색 ↗</a>'+
 '<a href="https://www.google.com/search?q='+refQ+'+평가원+기출+문제" target="_blank" rel="noopener">평가원·기출 자료 검색 ↗</a></div>'+
 '<p class="sub">교과 개념·학습 방법을 바탕으로 만든 공략 초안입니다. 공식 교육과정 목차와 대조한 완성형 교재가 아닙니다. '+(reason==='reinforce'?'부족한 부분은 오류 원인 기록과 다음 날 재검증을 우선하세요.':'')+'</p>';
 memoryPreview();
}
function memoryPreview(){
 const s=$('freeSubject').value,unit=Number($('freeUnit').value);
 if(s!=='영어'){$('freeMemorize').hidden=true;$('freeMemorize').innerHTML='';return}
 $('freeMemorize').hidden=false;
 const packNo=unit%window.studyFreeVocabSets.length,pack=window.studyFreeVocabSets[packNo];
 const keys=[['단어 20개','words','단어'],['숙어 5개','idioms','숙어'],['문장 3개','sentences','문장']];
 const counts=keys.map(([,key])=>pack[key].filter((_,i)=>memory['pack'+packNo+'-'+key+'-'+i]).length);
 $('freeMemorize').innerHTML='<div class="row"><h3>영어 암기 목록 · SET '+(packNo+1)+'</h3><button id="freeTranslateToggle" class="secondary" type="button">'+(showTranslations?'뜻 가리기':'뜻 보기')+'</button></div>'+
 '<p class="sub">단어 '+counts[0]+'/20 · 숙어 '+counts[1]+'/5 · 문장 '+counts[2]+'/3 확인 · 단어/숙어/문장 각각 뜻을 가리고 회상한 뒤 체크하세요. 기존 암기 체크는 현재 기기에 저장됩니다.</p>'+
 keys.map(([title,key,type])=>'<details class="free-memory-group" '+(key==='words'?'open':'')+'><summary>'+title+' · 암기 확인</summary>'+
 pack[key].map(([en,ko],i)=>{
 const memKey='pack'+packNo+'-'+key+'-'+i,checked=!!memory[memKey];
 return '<label class="free-memory-item"><input type="checkbox" data-memorize="'+esc(memKey)+'" '+(checked?'checked':'')+'><span><strong>'+esc(en)+'</strong>'+
 '<small class="free-meaning" '+(showTranslations?'':'hidden')+'>'+esc(ko)+'</small></span></label>';
 }).join('')+'</details>').join('')+
 '<p class="sub">이 목록은 앱에서 직접 선정한 기초·중급 학습용 예시입니다. 공식 수능 출제 빈도 순위는 아닙니다.</p>';
}
function readForm(){
 const x=selected(),minutes=Number($('freeMinutes').value);
 if(!x.title||!Number.isInteger(minutes)||minutes<10||minutes>300){$('freeNotice').textContent='학습 시간은 10~300분으로 입력하세요.';return null}
 const date=$('freeDue').value;
 if(!/^\d{4}-\d\d-\d\d$/.test(date)||Number.isNaN(new Date(date+'T12:00:00').getTime())){$('freeNotice').textContent='학습 날짜를 정확하게 선택하세요.';return null}
 if($('freeGoal').value.length>600){$('freeNotice').textContent='직접 학습 목표는 600자 이하로 입력하세요.';return null}
 return {
  id:editing||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),
  subject:x.s,unitIndex:x.i,focusIndex:x.j,pass:Number($('freeStage').value),
  reason:$('freeReason').value,minutes,due:date,goal:$('freeGoal').value.trim(),
  priority:$('freePriority').value,createdAt:editing?(tasks.find(x=>x.id===editing)?.createdAt||Date.now()):Date.now(),
  status:editing?(tasks.find(x=>x.id===editing)?.status||'planned'):'planned',
  actualMinutes:editing?(tasks.find(x=>x.id===editing)?.actualMinutes||0):0,
  doneDate:editing?(tasks.find(x=>x.id===editing)?.doneDate||null):null,
  note:editing?(tasks.find(x=>x.id===editing)?.note||''):''
 };
}
function nameFor(task){
 const unit=subjects[task.subject]?.[task.unitIndex]||'단원 미지정';
 const part=window.studyChecklistTopics?.[task.subject]?.[task.unitIndex]?.[task.focusIndex]||'전체';
 return {unit,part};
}
function taskCard(task){
 const {unit,part}=nameFor(task);
 const label={planned:'예정',active:'학습 중',done:'완료'}[task.status]||'예정';
 return '<article class="free-task'+(task.status==='done'?' is-done':'')+'" data-free-task="'+esc(task.id)+'">'+
 '<div class="free-task-heading"><div><span class="tag">'+esc(task.subject)+'</span><small>'+esc(task.due)+' · '+task.pass+'회독 · 목표 '+task.minutes+'분 · '+label+(task.priority==='high'?' · 우선':'')+'</small></div>'+
 '<strong>'+esc(unit)+' → '+esc(part)+'</strong></div>'+
 (task.goal?'<p class="free-task-goal"><b>내 목표:</b> '+esc(task.goal).replace(/\n/g,'<br>')+'</p>':'')+
 (task.status==='done'?'<p class="sub">완료 '+esc(task.doneDate||'')+' · 실제 기록 '+(Number(task.actualMinutes)||0)+'분</p>':'<label class="free-actual-label">완료 시 실제 학습시간 <input inputmode="numeric" type="number" min="0" max="300" step="1" value="'+(Number(task.actualMinutes)||0)+'" data-actual="'+esc(task.id)+'" aria-label="실제 학습 시간(분)">분</label>')+
 '<div class="free-task-actions">'+
 '<button class="secondary" type="button" data-free-edit="'+esc(task.id)+'">공략·목표 수정</button>'+
 (task.status!=='done'?'<button type="button" data-free-complete="'+esc(task.id)+'">학습 완료</button>':'<button class="secondary" type="button" data-free-reopen="'+esc(task.id)+'">다시 학습</button>')+
 '<button class="secondary" type="button" data-free-postpone="'+esc(task.id)+'">내일로</button>'+
 '<button class="secondary" type="button" data-free-delete="'+esc(task.id)+'">삭제</button></div></article>';
}
function redraw(){
 const sorted=[...tasks].sort((a,b)=>(a.status==='done')-(b.status==='done')||a.due.localeCompare(b.due)||Number(b.priority==='high')-Number(a.priority==='high')||a.createdAt-b.createdAt);
 const mode=$('freeFilter').value;
 const filtered=sorted.filter(t=>mode==='all'||mode==='today'&&t.due===localDate()||mode==='pending'&&t.status!=='done');
 $('freeTasks').innerHTML=filtered.length?filtered.map(taskCard).join(''):'<div class="summary-note">해당 조건의 자유 학습이 없습니다. 위에서 학습 과제를 직접 만들어 보세요.</div>';
 const todayTasks=sorted.filter(t=>t.due===localDate()&&t.status!=='done');
 $('freeTodayList').innerHTML=todayTasks.length?todayTasks.map(t=>{
 const name=nameFor(t);
 return '<div class="free-today-row"><strong>'+esc(t.subject)+' · '+esc(name.unit)+'</strong><small>'+esc(name.part)+' · '+t.minutes+'분</small><button class="secondary" type="button" data-free-edit="'+esc(t.id)+'">공략 열기</button></div>';
 }).join(''):'<p class="sub">오늘 추가한 자유 학습 과제가 없습니다.</p>';
 const pending=sorted.filter(t=>t.status!=='done');
 $('freeOverviewList').innerHTML='<b>직접 계획 '+pending.length+'개 · 오늘 '+todayTasks.length+'개</b>'+
 (pending.length?'<p class="sub">'+pending.slice(0,3).map(t=>{const n=nameFor(t);return esc(t.subject)+' '+esc(n.unit)}).join(' / ')+(pending.length>3?' 외 '+(pending.length-3)+'개':'')+'</p>':'<p class="sub">공부하고 싶은 단원이나 보강 과제를 추가할 수 있습니다.</p>');
 $('freeCount').textContent='총 '+tasks.length+'개 · 완료 '+tasks.filter(t=>t.status==='done').length+'개 · 오늘 남음 '+todayTasks.length+'개';
}
function dispatch(){redraw();document.dispatchEvent(new CustomEvent('study:change',{detail:{source:'free'}}))}
function formReset(){
 editing=null;$('freeSave').textContent='자유 학습 과제 추가';$('freeCancel').hidden=true;
 $('freeGoal').value='';$('freeNotice').textContent='새 학습 목표를 추가할 수 있습니다.';
 $('freeDue').value=localDate();$('freePriority').value='normal';$('freeReason').value='basics';$('freeMinutes').value='45';
 $('freeStage').value=String(suggestPass(selected().id));lesson();
}
function startEdit(id){
 const t=tasks.find(t=>t.id===id);if(!t)return;
 editing=id;restoreSubject(t.subject);$('freeUnit').value=String(t.unitIndex);restoreFocus();$('freeFocus').value=String(t.focusIndex||0);
 $('freeStage').value=String(t.pass);$('freeReason').value=t.reason||'basics';$('freeMinutes').value=String(t.minutes);
 $('freeDue').value=t.due;$('freeGoal').value=t.goal||'';$('freePriority').value=t.priority||'normal';
 $('freeSave').textContent='변경 내용 저장';$('freeCancel').hidden=false;lesson();
 $('freeNotice').textContent='과제 수정 중 · 변경 내용을 저장하면 기존 기록이 유지됩니다.';
 document.querySelector('[data-tab="free"]')?.click();
 $('freeForm').scrollIntoView({block:'start',behavior:'smooth'});
}
function taskAction(target){
 const ids=['free-edit','free-complete','free-reopen','free-postpone','free-delete'];
 const type=ids.find(k=>target.hasAttribute('data-'+k));if(!type)return false;
 const id=target.getAttribute('data-'+type),task=tasks.find(x=>x.id===id);if(!task)return true;
 if(type==='free-edit'){startEdit(id);return true}
 if(type==='free-delete'){
  if(!confirm('이 자유 학습 과제를 삭제할까요?'))return true;
  tasks=tasks.filter(x=>x.id!==id);if(editing===id)formReset();
 }else if(type==='free-complete'){
  const input=document.querySelector('[data-actual="'+CSS.escape(id)+'"]');
  const actual=Number(input?.value||0);
  if(!Number.isInteger(actual)||actual<0||actual>300){$('freeNotice').textContent='실제 학습시간은 0~300분으로 입력하세요.';return true}
  task.status='done';task.doneDate=localDate();task.actualMinutes=actual;
 }else if(type==='free-reopen'){
  task.status='planned';task.doneDate=null;task.actualMinutes=0;
 }else if(type==='free-postpone'){
  const t=new Date(task.due+'T12:00:00');t.setDate(t.getDate()+1);task.due=localDate(t);
  if(task.status==='done'){task.status='planned';task.doneDate=null;task.actualMinutes=0}
 }
 if(save())dispatch();
 return true;
}
$('freeSubject').innerHTML=subjectsAll.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join('');
restoreSubject('수학');$('freeDue').value=localDate();
$('freeSubject').onchange=()=>{restoreSubject($('freeSubject').value);$('freeStage').value=String(suggestPass(selected().id));lesson()};
$('freeUnit').onchange=()=>{restoreFocus();$('freeStage').value=String(suggestPass(selected().id));lesson()};
$('freeFocus').onchange=lesson;$('freeStage').onchange=lesson;$('freeReason').onchange=lesson;$('freeGoal').oninput=()=>{clearTimeout(window.studyFreeTyping);window.studyFreeTyping=setTimeout(lesson,260)};
$('freeForm').onsubmit=e=>{e.preventDefault();const task=readForm();if(!task)return;
 if(editing){const i=tasks.findIndex(x=>x.id===editing);if(i<0)return;tasks[i]=task}else tasks.push(task);
 if(!save())return;formReset();dispatch();$('freeNotice').textContent='과제를 저장했습니다. 날짜에 맞춰 오늘 학습 영역에도 표시됩니다.';
};
$('freeCancel').onclick=formReset;$('freeFilter').onchange=redraw;
// The translation toggle is delegated because memory cards are rerendered.
$('freeMemorize').addEventListener('change',e=>{
 const box=e.target.closest('input[data-memorize]');if(!box)return;
 if(box.checked)memory[box.dataset.memorize]=true;else delete memory[box.dataset.memorize];
 localStorage.setItem(MEMORY,JSON.stringify(memory));memoryPreview();
});
$('freeMemorize').addEventListener('click',e=>{if(e.target.closest('#freeTranslateToggle')){showTranslations=!showTranslations;memoryPreview()}});
const normalize=s=>String(s).toLowerCase().replace(/[\s·\-—.,()·]/g,'');
const choices=()=>subjectsAll.flatMap(s=>subjects[s].flatMap((name,i)=>(window.studyChecklistTopics?.[s]?.[i]||[]).map((topic,j)=>({s,name,i,topic,j}))));const choiceList=choices();
$('freeSearch').oninput=()=>{
 const raw=$('freeSearch').value.trim(),q=normalize(raw);
 if(q.length<2){$('freeSearchResults').hidden=true;return}
 const terms=raw.split(/\s+/).map(normalize).filter(Boolean);
 const rank=x=>{
  const unit=normalize(x.s+x.name),topic=normalize(x.topic),full=unit+topic;
  if(topic===q)return 100;
  if(unit.includes(q))return 85;
  if(topic.includes(q))return 80;
  if(full.includes(q))return 65;
  if(terms.every(t=>full.includes(t)))return 45;
  if(q.length>=3&&topic.includes(q.slice(0,3)))return 20;
  return 0;
 };
 const matches=choiceList.map(x=>({...x,rank:rank(x)})).filter(x=>x.rank>0)
  .sort((a,b)=>b.rank-a.rank||a.i-b.i).slice(0,12);
 $('freeSearchResults').hidden=!matches.length;
 $('freeSearchResults').innerHTML=matches.length?matches.map(x=>'<button type="button" class="free-search-result" data-free-select="'+esc(x.s)+'_'+x.i+'__'+x.j+'"><b>'+esc(x.s)+' · '+esc(x.name)+'</b><small>'+esc(x.topic)+'</small></button>').join(''):'';
};
$('freeSearchResults').addEventListener('click',e=>{
 const b=e.target.closest('[data-free-select]');if(!b)return;
 const m=b.dataset.freeSelect.match(/^(.+)_(\d+)__(\d+)$/);if(!m)return;
 choose(m[1],Number(m[2]),Number(m[3]));$('freeSearchResults').hidden=true;
 $('freeSearch').value='';$('freeNotice').textContent='선택한 단원의 상세 공략을 표시했습니다.';
});
function choose(s,i,j=0){
 if(!subjects[s]||!subjects[s][i])return;
 if(editing)formReset();
 restoreSubject(s);$('freeUnit').value=String(i);restoreFocus();$('freeFocus').value=String(j);
 $('freeStage').value=String(suggestPass(unitId(s,i)));lesson();
}
window.openFreeStudy=(s,i,j=0)=>{
 choose(s,Number(i),Number(j));document.querySelector('[data-tab="free"]')?.click();
 $('freeGuide').scrollIntoView({block:'start',behavior:'smooth'});
};
document.addEventListener('click',e=>{
 const target=e.target.closest('[data-free-unit]');
 if(target){
  e.preventDefault(); // Parents of focus timer rows skip normal selection in their own handlers.
  const match=target.dataset.freeUnit.match(/^(.+)_(\d+)$/);
  if(match)window.openFreeStudy(match[1],Number(match[2]),Number(target.dataset.freeFocus||0));
  return;
 }
 const action=e.target.closest('[data-free-edit],[data-free-complete],[data-free-reopen],[data-free-postpone],[data-free-delete]');
 if(action)taskAction(action);
});
window.studyFree={get tasks(){return tasks},refresh:redraw,open:window.openFreeStudy,totalMinutesForDate(date){
 return tasks.filter(t=>t.status==='done'&&t.doneDate===date).reduce((n,t)=>n+Math.max(0,Number(t.actualMinutes)||0),0);
}};
lesson();redraw();
})();