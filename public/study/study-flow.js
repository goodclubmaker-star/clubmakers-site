/* Learning-flow prototype: device-local data, not shared family records. */
(()=>{
const $=id=>document.getElementById(id), storageKey='eunseong-study-flow-v1';
let records={};try{records=JSON.parse(localStorage.getItem(storageKey))||{}}catch{}
const resultText={diagnostic:'먼저 10~15문항으로 진단하세요. 개념 누락과 문제 유형별 오답 원인을 기록합니다.',weak:'개념으로 돌아가세요. 예제 풀이를 설명할 수 있을 때 기본 유형을 시작합니다.',medium:'기본 유형을 반복하되 틀린 문제는 개념·조건 해석·계산·시간 부족으로 분류합니다.',strong:'기출·고난도 유형으로 이동합니다. 제한시간을 설정하고 풀이 전략을 비교하세요.',error:'오답 원인을 먼저 분석하고 유사 문제를 다시 풉니다. 다음 날 재검증하세요.',master:'실전 상태를 유지하며 간격 복습으로 장기 기억을 확인합니다.'};
const subjectsList=Object.keys(subjects);$('flowSubject').innerHTML=subjectsList.map(x=>'<option>'+x+'</option>').join('');
function topics(){const s=$('flowSubject').value;$('flowTopic').innerHTML=subjects[s].map((t,i)=>'<option value="'+i+'">'+t+'</option>').join('');advice()}
function id(){return $('flowSubject').value+'_'+$('flowTopic').value}
function datePlus(d,n){const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.toLocaleDateString('en-CA')}
function today(){return new Date().toLocaleDateString('en-CA')}
function advice(){const r=records[id()];$('flowAdvice').textContent=r?'마지막 기록: '+r.date+' · '+resultText[r.result]+' · 다음 복습 '+r.next:resultText[$('flowResult').value];}
function queue(){const due=Object.entries(records).filter(([k,v])=>v.next<=today()).sort((a,b)=>a[1].next.localeCompare(b[1].next));$('reviewQueue').innerHTML=due.length?due.map(([k,v])=>{const x=all.find(a=>a.id===k);return x?'<p>• '+x.s+' — '+x.t+' (예정 '+v.next+')</p>':''}).join(''):'오늘까지 예정된 복습이 없습니다.';}
$('flowSubject').onchange=topics;$('flowTopic').onchange=advice;$('flowResult').onchange=advice;
$('flowSave').onclick=()=>{const result=$('flowResult').value,old=records[id()],same=old&&old.result===result,step=result==='weak'||result==='error'?0:same?Math.min(3,(old.step||0)+1):0;const gaps=[1,3,7,14];records[id()]={result,date:today(),step,next:datePlus(today(),gaps[step])};localStorage.setItem(storageKey,JSON.stringify(records));window.studyCloudChanged?.(storageKey);advice();queue();};topics();queue();
})();