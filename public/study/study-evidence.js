/* Verified sample classifications: 2028 CSAT math sample released Apr 2025.
  Counts refer to ONE example exam, NOT historical probabilities or 2028 predicted quotas.
  Sources: https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=103113&lev=0
  Detailed sample-item breakdown: https://snu-potato.tistory.com/84
  EBS 2026 retrospective: https://www.ebsi.co.kr/ebs/ent/enta/retrieveEntAnlyStrdDataVw.ebs?bbsCd=B114&datNo=127090
*/
window.studyEvidence={
  sampleYear:'2028학년도 수능 예시문항 (2025년 4월 공개 · 1회)',
  sampleMath:[
    {numbers:[1,22],focus:'지수법칙·로그 정의',note:'기초 계산과 정의'},
    {numbers:[10,30],focus:'지수·로그함수 그래프와 조건 추론',note:'30번: 변별형'},
    {numbers:[7,16,19],focus:'호도법·삼각함수 그래프·사인/코사인법칙',note:'16·19번: 그래프·도형 해석'},
    {numbers:[4,14,24,27],focus:'등차·등비수열, 귀납적 정의, 수열의 합',note:'14·27번: 추론·융합'},
    {numbers:[18],focus:'극한과 함수 조건 분석',note:'18번: 종합 추론'},
    {numbers:[2],focus:'연속함수의 성질',note:'연속 기초 (미분과 연계)'},
    {numbers:[5,11,15,25,28],focus:'미분계수·접선·속도·극값·미분가능성',note:'28번: 조건과 미분가능성'},
    {numbers:[8,17,20,23],focus:'부정적분·정적분·넓이·함수',note:'17·20번: 종합 추론'},
    {numbers:[3,21],focus:'중복순열·중복조합',note:'21번: 변별형'},
    {numbers:[9,12,29],focus:'확률 연산·조건부확률',note:'29번: 조건부확률 단답형'},
    {numbers:[6,13,26],focus:'모비율·정규분포·확률변수',note:'2022 개정 모비율 단원 포함'}
  ],
  priorMath:{
    year:'2025·2026학년도 실제 수능 (기존 공통+선택 체제)',
    examples2025:'2025학년도 공통 수학Ⅰ 수열 귀납적 정의 22번, 수학Ⅱ 함수의 극한 21번',
    publicBreakdown:'수학Ⅰ 11문항, 수학Ⅱ 11문항, 선택과목별 8문항',
    highDiscrimination:'수학Ⅰ 지수·로그함수 그래프(22번), 수학Ⅱ 함수의 극한(21번), 선택 확률과 통계 30번',
    caveat:'선택과목 체제의 수치는 2028 수능의 확률과 통계 8문항 비율을 보장하지 않음'
  },
  pastExamExamples:{
    // Only directly described past-exam examples; NOT a full frequency census.
    1:[{year:2026,item:'공통 22',kind:'지수·로그함수의 그래프와 대칭'}],
    3:[{year:2024,item:'공통 15',kind:'수열의 귀납적 정의'},{year:2025,item:'공통 22',kind:'수열의 귀납적 정의'},{year:2026,item:'공통 20',kind:'수열의 부분합'}],
    4:[{year:2024,item:'공통 14',kind:'극한 조건'},{year:2025,item:'공통 21',kind:'함수의 극한'},{year:2026,item:'공통 21',kind:'함수의 극한 조건'}],
    6:[{year:2026,item:'공통 15',kind:'미분·접선과 부호 분석'}],
    8:[{year:2026,item:'선택 확통 30',kind:'공 배분 경우의 수'}],
    9:[{year:2026,item:'선택 확통 28',kind:'확률 사건의 조건 해석'}],
    10:[{year:2026,item:'선택 확통 29',kind:'이항분포와 정규근사'}]
  },
  pastExamWarnings:'2024~2026은 수학Ⅰ/Ⅱ 공통 22문항 + 선택과목 8문항 체제. 표에 있는 번호는 출제가 확인된 대표 사례이지 단원별 전체 출제횟수가 아닙니다. 해당 연도 선택 확률과 통계 응시자만 풀었던 문항을 2028 필수확통과 동일시하지 않습니다.',
  sampleKorean:{
    meta:'2028 국어 예시문항 45문항 1회 · 대영역별 집계이며 현 앱의 10개 학습분류별 출제횟수가 아님',
    areas:{독서:15,문학:15,화법:5,언어:5,작문:5},
    integrated:'독서·작문 통합 세트의 독서 2문항·작문 2문항은 위 독서 15·작문 5에 포함',
    byUnit:['독서 15문항 범주','독서 15문항 범주','문학 15문항 범주','문학 15문항 범주','문학 15문항 범주','문학 15문항 범주','문학 15문항 범주','화법 5문항 + 언어 5문항','작문 5문항','독서·작문 통합 4문항(중복포함)']
  },
  koreanUnitProxy:[7.5,7.5,3,3,3,3,3,10,5,3],
  integration2028:{
   social:'2028 통합사회 예시(25문항)에서 지리·일반사회 관련 개념, 표·지도·복합 자료 해석이 중요하게 관찰됨. 영역 간 융합 문항도 존재.',
   science:'2028 통합과학 예시(25문항)에서 단일 공식 계산보다 실험 해석·자료 추론·동일 과목 안의 단원 연계가 강조됨.',
   caveat:'학원·전문가의 출제 경향 분석이며 미래 실제 수능의 단원별 출제확률이나 고정 문항수로 보장하지 않음.'
  },
  sampleEnglish:{total:45,listening:17,other:28,note:'영어 45문항 중 듣기 17문항은 공식 고정 형식. 세부 유형별 문항 수는 확정값이 아님'},
  englishProxy:[4,4,4,4,4,4,8.5,8.5,4],
  importanceModifiers:[1.00,1.27,1.12,1.23,1.13,1.10,1.30,1.20,1.30,1.23,1.12],
  subjectUnitPriorities:{
    국어:[1.3,1.3,1.07,1.08,1.1,1.08,1.0,1.15,1.15,1.12],
    영어:[1.1,1.2,1.1,1.45,1.4,1.18,0.9,0.9,1.12],
    통합사회:[1.2,0.95,1.1,1,1.08,1.1,1.14,1.2,1.18,1.22],
    통합과학:[1,1.22,1.25,1.2,1.25,1.18,1.32],
    한국사:[0.97,0.95,1.03,1.2,1.25,1.18]
  },
  sources:[
    {label:'교육부 · 2028학년도 수능 예시문항 공개',url:'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=103113&lev=0'},
    {label:'2028 수학 예시문항 1~30번 단원별 분석',url:'https://snu-potato.tistory.com/84'},
    {label:'2028 국어 예시문항 영역별(화법/언어/독서/작문/문학) 분석',url:'https://commonkorean.tistory.com/113'},
    {label:'2026 실제 수능 · EBS 수학 영역 출제 경향',url:'https://www.ebsi.co.kr/ebs/ent/enta/retrieveEntAnlyStrdDataVw.ebs?bbsCd=B114&datNo=127090'},
    {label:'2025 실제 수능 · 공통 수학 변별 문항 설명',url:'https://www.newsis.com/view/NISX20241114_0002959264'},
    {label:'2026 실제 수능 · 단원별 공통·확통 풀이 사례',url:'https://mathlab.kr/2026/csat/'},
    {label:'교육부 · 2028 수능 통합형 개편 확정',url:'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=97551&lev=0'},
    {label:'2028 통합사회·통합과학 예시문항 전문가 분석',url:'https://www.localnaeil.com/News/View/652907'}
  ]
};