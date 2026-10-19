const subjects={
'국어':['독서·설명 및 논증','독서·자료와 글의 통합 이해','문학·현대시','문학·고전시가','문학·현대소설','문학·고전소설','문학·극과 수필','화법과 언어','작문·논증과 표현','독서·작문 통합'],
'수학':['대수·지수와 로그','대수·지수함수와 로그함수','대수·삼각함수','대수·수열','미적분Ⅰ·함수의 극한','미적분Ⅰ·함수의 연속','미적분Ⅰ·미분','미적분Ⅰ·적분','확률과 통계·경우의 수','확률과 통계·확률','확률과 통계·통계'],
'영어':['어휘·표현','문장 구조와 구문','독해·주제·요지','독해·빈칸 추론','독해·순서·삽입','독해·장문','듣기·대화','듣기·담화','쓰기·문맥'],
'통합사회':['통합적 관점','인간·사회·환경과 행복','자연환경과 인간','문화와 다양성','생활공간과 사회','인권과 헌법','사회정의와 불평등','시장경제와 지속가능발전','세계화와 평화','미래와 지속가능한 삶'],
'통합과학':['과학의 기초','물질의 규칙성과 결합','시스템과 상호작용','변화와 다양성','환경과 에너지','과학과 미래 사회','통합 탐구·자료 해석'],
'한국사':['선사·고대 국가','고려 사회','조선 사회','근대 국가 수립','일제 강점기','현대 사회']
};
const $=x=>document.getElementById(x), today=new Date(),exam=new Date(2027,10,18),days=Math.max(0,Math.ceil((exam-today)/86400000));$('days').textContent=days+'일';$('dday').textContent='D-'+days;
/* 2028 국어 출제범위에서 '매체' 단독 영역이 제외되므로 이전 매체 단원 체크는 새 통합 단원의 완료로 계승하지 않습니다. */
const scopeMigration='eunseong-2028-korean-scope-migration-v1';
if(!localStorage.getItem(scopeMigration)){
 for(const k of ['eunseong-curriculum-demo-v1','eunseong-interviews-v1','eunseong-study-flow-v1']){
   try{const x=JSON.parse(localStorage.getItem(k))||{};delete x['국어_9'];localStorage.setItem(k,JSON.stringify(x))}catch{}
 }
 try{const conf=JSON.parse(localStorage.getItem('eunseong-confidence-v1'))||{};Object.keys(conf).filter(k=>k.startsWith('국어_9__')).forEach(k=>delete conf[k]);localStorage.setItem('eunseong-confidence-v1',JSON.stringify(conf))}catch{}
 localStorage.setItem(scopeMigration,'1');
}
const key='eunseong-curriculum-demo-v1';let saved={};try{saved=JSON.parse(localStorage.getItem(key))||{}}catch{};const all=Object.entries(subjects).flatMap(([s,topics])=>topics.map((t,i)=>({s,t,id:s+'_'+i,level:Math.max(0,Math.min(4,Number(saved[s+'_'+i])||0))})));const levels=['미시작','1회독·개념','2회독·유형','3회독·기출','심화 1회독'];
function draw(){all.forEach(x=>x.level=Math.max(0,Math.min(4,Number(saved[x.id])||0)));const covered=all.filter(x=>x.level>=1).length,reviewed=all.filter(x=>x.level===4).length;const pct=n=>Math.round(n/all.length*100);$('coverage').textContent=pct(covered)+'%';$('coverageBar').style.width=pct(covered)+'%';$('review').textContent=pct(reviewed)+'%';$('reviewBar').style.width=pct(reviewed)+'%';const start=new Date(2026,9,19);let finish=new Date('2027-03-31T12:00:00');try{const v=JSON.parse(localStorage.getItem('eunseong-roadmap-config-v1'))?.firstDeadline;if(/^2027-\d\d-\d\d$/.test(v))finish=new Date(v+'T12:00:00')}catch{}const elapsed=Math.max(0,Math.min(1,(today-start)/(finish-start)));const expected=Math.round(elapsed*100),actual=pct(covered);$('pace').textContent=actual>=expected?'정상':'점검 필요';$('paceDesc').textContent='1회독 기준 '+actual+'% / 일정 목표 '+expected+'%';$('subjects').innerHTML=Object.entries(subjects).map(([s,topics])=>{const a=all.filter(x=>x.s===s),done=a.filter(x=>x.level>=1).length,rev=a.filter(x=>x.level===4).length;return '<div class="subject"><div class="row"><strong>'+s+'</strong><span class="sub">개념 '+done+'/'+a.length+' · 복습 '+rev+'/'+a.length+'</span></div><div class="bar" style="margin:10px 0"><div class="fill" style="width:'+Math.round(done/a.length*100)+'%"></div></div>'+a.map(x=>{const c=window.studyConcrete?.fromId(x.id);return '<div class="topic"><div><div><strong>'+(c?.name||x.t)+'</strong></div><small>'+x.t+' · '+levels[x.level]+'</small>'+(c?'<p style="margin:5px 0 0;font-size:12px;color:#4e607e;line-height:1.55"><b>실제 할 일:</b> '+c.task+'</p>':'')+'</div><div class="flex"><button class="secondary" type="button" data-free-unit="'+x.id+'">학습 목표</button><button class="secondary" data-id="'+x.id+'">단계 변경</button></div></div>'}).join('')+'</div>'}).join('');const remaining=all.filter(x=>x.level===0);$('alerts').innerHTML='<p>미시작 단원 <strong>'+remaining.length+'개</strong> / 전체 '+all.length+'개</p><p>심화 미완료 <strong>'+(all.length-reviewed)+'개</strong></p><p>1회독 목표일까지 현재 속도를 매주 비교하세요. 이 지표는 진단 점수나 실제 공부 시간은 아직 반영하지 않습니다.</p>';$('priorities').innerHTML=remaining.slice(0,6).map(x=>'<p class="sub">• '+x.s+' — '+x.t+'</p>').join('')||'<p class="sub">모든 단원 개념을 한 번 완료했습니다. 취약 유형과 기출을 우선하세요.</p>';}
window.studyProgressSet=(id,stage)=>{
 if(!all.some(x=>x.id===id))return false;
 const before=Math.max(0,Math.min(4,Number(saved[id])||0));
 const after=Math.max(0,Math.min(4,Number(stage)||0));
 if(before===after)return true;
 // Append an event against the previous state so the graph never invents historical progress.
 window.studyRoadmap?.prepareProgressEvent?.(id,before);
 saved[id]=after;localStorage.setItem(key,JSON.stringify(saved));
 window.studyRoadmap?.logProgress(id,before,after);
 window.studyCloudChanged?.(key);draw();return true;
};
$('subjects').onclick=e=>{const id=e.target.closest('[data-id]')?.dataset.id;if(!id)return;const before=Math.max(0,Math.min(4,Number(saved[id])||0));window.studyProgressSet(id,(before+1)%5)};$('reset').onclick=()=>{if(confirm('이 기기의 시각화 진도를 초기화할까요?')){const previous={...saved};window.studyRoadmap?.prepareProgressEvent?.('reset',0);saved={};localStorage.removeItem(key);for(const [id,old] of Object.entries(previous)){if(Number(old)>0)window.studyRoadmap?.logProgress(id,Number(old),0)}window.studyCloudChanged?.(key);draw();}};document.addEventListener('study:change',e=>{if(e.detail?.source==='roadmap')draw()});draw();
