(()=>{
const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
const plans={
'국어':{core:'글의 구조·근거·표현과 맥락을 정확히 파악하기',target:'지문 근거를 표시하며 선지의 참·거짓을 설명할 수 있다.',method:'짧은 지문 구조화 → 근거 표시 → 선지 판단 → 오답 선지 반박',pitfall:'배경지식으로 추측하거나 지문 근거 없이 답을 고르기',questions:'교육청·평가원 기출에서 동일 갈래·독해 유형 선별'},
'수학':{core:'정의·성질·조건·공식의 적용 범위 이해',target:'기본 문제를 독립적으로 풀고 풀이 선택 이유를 설명한다.',method:'정의 확인 → 대표 예제 손풀이 → 변형 3~5문항 → 오답 재풀이',pitfall:'공식 암기만 하고 적용 조건·반례를 확인하지 않기',questions:'단원별 평가원·교육청 기출을 난이도별로 분류'},
'영어':{core:'핵심 어휘·구문·문단 논리·듣기 단서',target:'정답 근거 문장을 찾고 오답 선택지를 설명한다.',method:'구문 해석 → 문단 논리 → 유형별 제한시간 풀이 → 근거 문장 복기',pitfall:'모르는 단어 하나에 매달려 전체 논리를 놓치기',questions:'기출 독해 유형별 지문과 듣기 문항 활용'},
'통합사회':{core:'핵심 개념 간 관계·사회 현상과 자료 해석',target:'개념을 실제 사례에 적용하고 그래프·지도·표의 의미를 해석한다.',method:'개념 지도 → 사례 비교 → 자료 해석 → 선지 판단',pitfall:'개념 정의만 외우고 사례에 적용하지 못하기',questions:'교육과정 성취기준에 맞는 자료 해석형 문항 우선'},
'통합과학':{core:'과학 개념의 원리·변인 관계·실험과 자료 해석',target:'표·그래프·실험 결과를 근거로 현상을 설명한다.',method:'핵심 원리 → 모형·실험 이해 → 정량·정성 자료 풀이 → 오답 검증',pitfall:'용어만 외우고 변인·조건을 구분하지 못하기',questions:'실험·그래프·자료 추론 문항 우선'},
'한국사':{core:'시대 흐름·사건의 원인과 결과·사료 단서',target:'시대별 주요 사건을 연결하고 사료로 시대를 판별한다.',method:'연표 정리 → 주요 인과 관계 → 사료 키워드 → 기출 확인',pitfall:'개별 연도만 암기해 시대의 맥락을 놓치기',questions:'시대·주제별 기출 사료 판별 문항'}
};
const special={
'수학·대수·지수와 로그':['지수법칙과 로그의 정의·밑 조건','로그 성질을 증명·활용하고 조건 오류를 판별'],
'수학·대수·삼각함수':['호도법·삼각함수 그래프·주기','그래프의 변화와 주기·최댓값 조건을 연결'],
'수학·대수·수열':['등차·등비수열·합·귀납적 사고','수열의 규칙과 합의 구조를 식으로 표현'],
'수학·미적분Ⅰ·미분':['도함수·증가 감소·극값','함수 그래프와 도함수 부호를 연결'],
'수학·확률과 통계·경우의 수':['합·곱의 법칙·순열·조합','중복 여부와 순서 구분을 먼저 판단'],
'영어·독해·빈칸 추론':['문단 주제·논리 연결·동의어 치환','빈칸 전후 문장 근거로 선택지 제거'],
'국어·문학·고전시가':['화자·정서·표현·시대적 배경','시어의 기능과 표현 효과를 근거로 해석'],
'통합과학·환경과 에너지':['에너지 흐름·생태계·지속가능성','자료를 통해 에너지 전환과 환경 영향을 추론']
};
const roundGuides=['1회독: 개념 설명을 읽고 대표 예제를 스스로 재현','2회독: 기본·중급 유형을 시간 기록하며 풀이','3회독: 평가원·교육청 기출로 전이 가능성 검증','심화 1회독: 복합·고난도 문제와 실전 시간 관리'];
$('guideSubject').innerHTML=Object.keys(subjects).map(s=>'<option>'+s+'</option>').join('');
function populate(){const s=$('guideSubject').value;$('guideTopic').innerHTML=subjects[s].map((t,i)=>'<option value="'+i+'">'+t+'</option>').join('');render()}
function render(){const s=$('guideSubject').value,t=subjects[s][Number($('guideTopic').value)||0],p=plans[s],v=special[s+'·'+t]||[p.core,p.target];$('guideContent').innerHTML='<strong>'+esc(t)+'</strong><p><b>핵심:</b> '+esc(v[0])+'</p><p><b>목표 수준:</b> '+esc(v[1])+'</p><p><b>추천 학습법:</b> '+esc(p.method)+'</p><p><b>주의할 오답:</b> '+esc(p.pitfall)+'</p><p><b>문제은행 활용:</b> '+esc(p.questions)+'</p><p><b>회독별 목표:</b> '+roundGuides.map(x=>'<div>• '+esc(x)+'</div>').join('')+'</p>';const q=encodeURIComponent('2028 수능 '+s+' '+t);$('conceptSearch').href='https://www.google.com/search?q='+q+'+개념';$('lectureSearch').href='https://www.google.com/search?q='+q+'+EBS+강의';$('questionSearch').href='https://www.google.com/search?q='+q+'+기출+문제';}
$('guideSubject').onchange=populate;$('guideTopic').onchange=render;populate();
})();