/* Daily timetable editor. Time segments use local wall-clock minutes and are stored on this device. */
(()=>{
'use strict';
const STORE='eunseong-day-plan-v1',MODES=['school','weekend','sunday','full'];
const LABELS={school:'학교 병행 평일 · 순공부 4시간',weekend:'토요일 · 순공부 6시간',sunday:'일요일 · 순공부 4시간',full:'전일 학습 · 순공부 10시간'};
const SUBJECTS=['수학','국어','영어','통합과학','통합사회','한국사','오답·복습'];
const KIND={study:'순공부',break:'짧은 휴식',meal:'식사',exercise:'운동·산책',class:'학교 수업',routine:'일상'};
const defaultRows={
 full:{wake:'07:00',sleep:'23:00',items:[
 ['routine','기상·세면',30],['meal','아침 식사',30],
 ['study','수학',95],['break','휴식',15],['study','국어',75],['break','휴식',15],
 ['study','수학',90],['meal','점심 식사',50],['study','영어',75],['break','간식·휴식',25],
 ['study','통합과학',60],['exercise','산책·운동',40],['study','수학',70],['meal','저녁 식사',50],
 ['study','통합사회',60],['break','휴식',15],['study','국어',40],['break','휴식',15],
 ['study','한국사',35]
 ]},
 school:{wake:'07:00',sleep:'23:30',items:[
 ['routine','기상·세면',30],['meal','아침 식사',30],['class','학교·수업',480],
 ['routine','귀가·정리',60],['meal','저녁 식사',60],['exercise','운동·자율시간',60],
 ['study','수학',70],['break','휴식',5],['study','영어',40],['break','휴식',5],
 ['study','국어',45],['break','휴식',5],['study','통합과학',30],['break','휴식',5],
 ['study','수학',35],['study','국어',20]
 ]},
 weekend:{wake:'07:30',sleep:'23:00',items:[
 ['routine','기상·세면',30],['meal','아침 식사',30],['routine','자율 준비',30],
 ['study','수학',90],['break','휴식',15],['study','국어',75],['meal','점심 식사',60],
 ['study','수학',75],['break','휴식',15],['study','영어',60],['exercise','운동·산책',60],
 ['study','통합과학',60],['meal','저녁 식사',60]
 ]},
 sunday:{wake:'08:00',sleep:'22:30',items:[
 ['routine','기상·세면',30],['meal','아침 식사',30],
 ['study','수학',60],['break','휴식',15],['study','국어',60],['meal','점심 식사',60],
 ['study','수학',60],['break','휴식',15],['study','영어',30],['exercise','산책·회복',60],
 ['study','통합과학',30],['meal','저녁 식사',60]
 ]}
};
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const localDate=d=>{const x=d||new Date();return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const clone=x=>JSON.parse(JSON.stringify(x));
const minutes=t=>{const m=String(t).match(/^([01]\d|2[0-3]):([0-5]\d)$/);return m?Number(m[1])*60+Number(m[2]):NaN};
const clock=t=>String(Math.floor(((t%1440)+1440)%1440/60)).padStart(2,'0')+':'+String(((t%60)+60)%60).padStart(2,'0');
const getSpan=(wake,sleep)=>{const a=minutes(wake),b=minutes(sleep);if(!Number.isFinite(a)||!Number.isFinite(b))return NaN;return b<=a?b+1440-a:b-a};
const savedRead=()=>{try{const v=JSON.parse(localStorage.getItem(STORE));return v&&typeof v==='object'?v:{}}catch{return {}}};
let state=savedRead(),draft=null;
if(!state.templates||typeof state.templates!=='object')state.templates={};
if(!state.dates||typeof state.dates!=='object')state.dates={};
if(!['full','school'].includes(state.weeklyMode))state.weeklyMode='school';
function defaultPlan(mode){
 const template=defaultRows[mode]||defaultRows.full;
 return {wake:template.wake,sleep:template.sleep,mode,items:template.items.map(([kind,title,duration],i)=>({
  id:mode+'-'+i,kind,title,subject:kind==='study'?title:'',duration
 }))};
}
function templateFor(mode){
 const found=state.templates[mode];
 return found?.items?.length?clone(found):defaultPlan(mode);
}
function dayMode(date,weeklyMode){
 if(state.dates[date]?.mode&&MODES.includes(state.dates[date].mode))return state.dates[date].mode;
 if((weeklyMode||state.weeklyMode)==='full')return 'full';
 const weekday=new Date(date+'T12:00:00').getDay();
 return weekday===6?'weekend':weekday===0?'sunday':'school';
}
function planFor(date,mode){
 const custom=state.dates[date];
 if(custom&&(!mode||custom.mode===mode))return clone(custom);
 return templateFor(mode||dayMode(date));
}
function analyze(plan){
 if(!plan||!Array.isArray(plan.items)||plan.items.length>60)return{error:'일정은 1~60개 항목으로 구성해야 합니다.'};
 const span=getSpan(plan.wake,plan.sleep);
 if(!Number.isFinite(span)||span<480||span>1200)return{error:'기상부터 취침까지는 8~20시간 범위로 지정해 주세요.'};
 let study=0,other=0,used=0;
 const rows=[];
 for(const item of plan.items){
  const dur=Number(item.duration);
  if(!Number.isInteger(dur)||dur<5||dur>600)return{error:'각 활동의 길이는 5~600분이어야 합니다.'};
  if(!Object.hasOwn(KIND,item.kind))return{error:'활동 유형을 다시 선택해 주세요.'};
  if(item.kind==='study'&&!SUBJECTS.includes(item.subject))return{error:'학습 활동에는 과목을 선택해 주세요.'};
  if(!String(item.title||'').trim()||String(item.title).length>80)return{error:'활동 이름은 1~80자로 입력해 주세요.'};
  const start=minutes(plan.wake)+used;used+=dur;
  const end=minutes(plan.wake)+used;
  rows.push({...item,start:clock(start),end:clock(end),time:start,minutes:dur});
  if(item.kind==='study')study+=dur;else other+=dur;
 }
 const filler=span-used;
 if(filler<15)return {error:filler<0?'활동 길이가 기상~취침 범위를 초과했습니다. 학습·일상 시간을 줄이거나 취침 시간을 늦추세요.':'취침 준비 시간을 최소 15분 남겨주세요.'};
 rows.push({id:'bedtime',kind:'routine',title:'취침 준비·자율시간',subject:'',minutes:filler,start:clock(minutes(plan.wake)+used),end:plan.sleep});
 return {rows,study,other:other+filler,span,filler,goal:{school:240,weekend:360,sunday:240,full:600}[plan.mode]||600};
}
function store(){
 try{localStorage.setItem(STORE,JSON.stringify(state));return true}
 catch(e){$('dayPlanFeedback').textContent='시간표를 저장할 수 없습니다: '+e.message;return false}
}
function emit(){
 document.dispatchEvent(new CustomEvent('study:change',{detail:{source:'dayplan'}}));
}
function rowStatus(){
 const result=analyze(draft);
 if(result.error){
  $('dayPlanSummary').innerHTML='<strong>시간표 수정 필요</strong> · '+esc(result.error);
  $('dayPlanPreview').innerHTML='';return;
 }
 const ok=result.study===result.goal;
 $('dayPlanSummary').innerHTML='<strong>기상 '+esc(draft.wake)+' → 취침 '+esc(draft.sleep)+'</strong> · 하루 순공부 <strong>'+Math.floor(result.study/60)+'시간 '+result.study%60+'분</strong>'+
 ' · 일상·식사·휴식 '+Math.floor(result.other/60)+'시간 '+result.other%60+'분'+
 '<br><small>'+(ok?'기본 목표 '+result.goal+'분과 일치합니다.':'기본 순공부 목표 '+result.goal+'분 대비 '+(result.study-result.goal>0?'+':'')+(result.study-result.goal)+'분. 변경한 시간도 저장할 수 있습니다.')+'</small>';
 $('dayPlanPreview').innerHTML='<div class="day-list-head"><b>하루 일과 미리보기</b><span>기상부터 취침까지 · 빈 시간 자동 연결</span></div>'+
 result.rows.map(row=>'<div class="day-timeline-row '+(row.kind==='study'?'study':'life')+'"><time>'+esc(row.start)+'–'+esc(row.end)+'</time><div><strong>'+esc(row.title)+'</strong>'+
 (row.kind==='study'?'<small>'+esc(window.studyRoadmap?.suggest(row.subject,Number(String(row.id).replace(/\D/g,''))||0)?.title||'학습 단원 선택 가능')+'</small>':'')+
 '</div><span>'+row.minutes+'분</span></div>').join('');
}
const kindOptions=Object.entries(KIND).map(([v,label])=>'<option value="'+v+'">'+label+'</option>');
function renderRows(){
 $('dayWake').value=draft.wake;$('daySleep').value=draft.sleep;
 $('dayPlanEditorRows').innerHTML=draft.items.map((x,i)=>'<div class="day-editor-row" data-row="'+i+'">'+
 '<label class="day-type">유형 <select data-field="kind" data-index="'+i+'">'+kindOptions.join('')+'</select></label>'+
 '<label class="day-subject">과목 <select data-field="subject" data-index="'+i+'">'+
 ['<option value="">-</option>',...SUBJECTS.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>')].join('')+'</select></label>'+
 '<label class="day-title">활동/학습 목표 <input type="text" maxlength="80" data-field="title" data-index="'+i+'" value="'+esc(x.title)+'"></label>'+
 '<label class="day-length">시간(분) <input type="number" inputmode="numeric" min="5" max="600" step="5" data-field="duration" data-index="'+i+'" value="'+x.duration+'"></label>'+
 '<button type="button" class="secondary day-remove" data-remove="'+i+'" aria-label="'+esc(x.title)+' 삭제">삭제</button></div>').join('');
 for(let i=0;i<draft.items.length;i++){
  const item=draft.items[i];
  const kind=$('dayPlanEditorRows').querySelector('[data-field="kind"][data-index="'+i+'"]');
  const subject=$('dayPlanEditorRows').querySelector('[data-field="subject"][data-index="'+i+'"]');
  kind.value=item.kind;subject.value=item.subject||'';
  subject.disabled=item.kind!=='study';
 }
 rowStatus();
}
function loadEditor(mode,date,keepMessage=false){
 draft=planFor(date,mode);draft.mode=mode;
 if(!keepMessage)$('dayPlanFeedback').textContent='변경할 수 있는 기상·취침·활동 시간을 조절한 뒤 저장하세요.';
 renderRows();
}
function selectDate(){
 const date=$('dayPlanDate').value||localDate();
 const mode=dayMode(date);
 $('dayPlanMode').value=mode;loadEditor(mode,date);
}
$('dayPlanDate').value=localDate();
$('dayPlanMode').innerHTML=MODES.map(mode=>'<option value="'+mode+'">'+LABELS[mode]+'</option>').join('');
$('dayPlanDate').onchange=selectDate;
$('dayPlanMode').onchange=()=>loadEditor($('dayPlanMode').value,$('dayPlanDate').value);
$('dayWake').onchange=()=>{draft.wake=$('dayWake').value;rowStatus()};
$('daySleep').onchange=()=>{draft.sleep=$('daySleep').value;rowStatus()};
$('dayPlanEditorRows').addEventListener('change',e=>{
 const field=e.target.dataset.field,index=Number(e.target.dataset.index);
 if(!['kind','subject','title','duration'].includes(field)||!Number.isInteger(index)||!draft.items[index])return;
 const item=draft.items[index];
 if(field==='duration')item.duration=Number(e.target.value);
 else item[field]=e.target.value;
 if(field==='kind'&&item.kind==='study'&&!SUBJECTS.includes(item.subject)){item.subject='수학';item.title='수학'}
 if(field==='kind'&&item.kind!=='study')item.subject='';
 if(field==='kind')renderRows();else rowStatus();
});
$('dayPlanEditorRows').addEventListener('click',e=>{
 const rm=e.target.closest('[data-remove]');if(!rm)return;
 if(draft.items.length<=1){$('dayPlanFeedback').textContent='일과 활동을 최소 한 개는 남겨야 합니다.';return}
 draft.items.splice(Number(rm.dataset.remove),1);renderRows();
});
$('dayAddStudy').onclick=()=>{
 if(draft.items.length>=60){$('dayPlanFeedback').textContent='활동은 최대 60개입니다.';return}
 draft.items.push({id:'extra-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),kind:'study',subject:'수학',title:'수학',duration:30});
 renderRows();
};
$('dayAddRest').onclick=()=>{
 if(draft.items.length>=60)return;
 draft.items.push({id:'extra-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),kind:'break',subject:'',title:'휴식',duration:10});
 renderRows();
};
$('dayResetDraft').onclick=()=>{draft=defaultPlan($('dayPlanMode').value);renderRows();$('dayPlanFeedback').textContent='기본 일과표를 불러왔습니다. 저장 버튼을 눌러야 반영됩니다.'};
function savePlan(target){
 const validated=analyze(draft);
 if(validated.error){$('dayPlanFeedback').textContent='저장 불가: '+validated.error;return}
 const mode=$('dayPlanMode').value,date=$('dayPlanDate').value;
 if(!date||!MODES.includes(mode))return;
 const copy=clone(draft);copy.mode=mode;
 if(target==='date')state.dates[date]=copy;
 else state.templates[mode]=copy;
 if(!store())return;
 $('dayPlanFeedback').textContent=target==='date'?'해당 날짜의 일과표를 저장했습니다. 오늘 타이머와 주간 시간표에도 반영됩니다.':'이 유형의 기본 일과표를 저장했습니다. 날짜별로 저장한 예외는 유지됩니다.';
 emit();loadEditor(mode,date,true);
}
$('daySaveDate').onclick=()=>savePlan('date');
$('daySaveTemplate').onclick=()=>savePlan('template');
$('dayRemoveOverride').onclick=()=>{
 const date=$('dayPlanDate').value;
 if(!state.dates[date]){$('dayPlanFeedback').textContent='이 날짜에 저장된 개별 시간표가 없습니다.';return}
 if(!confirm('이 날짜만 따로 저장한 시간표를 삭제하고 유형 기본안으로 되돌릴까요?'))return;
 delete state.dates[date];if(!store())return;
 $('dayPlanFeedback').textContent='해당 날짜의 개별 시간표를 삭제했습니다.';
 emit();selectDate();
};
function getWeeklyMode(){return state.weeklyMode}
function setWeeklyMode(mode){if(!['full','school'].includes(mode))return;state.weeklyMode=mode;store()}
window.studyDayPlan={
 get:(date,mode)=>{const d=date||localDate();return planFor(d,mode||dayMode(d))},
 timeline:(date,mode)=>analyze(planFor(date||localDate(),mode||dayMode(date||localDate()))),
 weekdayMode:dayMode,getWeeklyMode,setWeeklyMode,
 summaryFor:(date,mode)=>{const x=analyze(planFor(date,mode));return x.error?null:{study:x.study,other:x.other,rows:x.rows}},
 defaults:()=>clone(defaultRows),
 currentDate:localDate,
 edit:(date,mode)=>{
  const day=date||localDate(),value=mode||dayMode(day);
  $('dayPlanDate').value=day;$('dayPlanMode').value=value;loadEditor(value,day);
 },
 syncEditor:()=>{const date=$('dayPlanDate').value;if(date)loadEditor($('dayPlanMode').value,date,true)}
};
selectDate();
})();