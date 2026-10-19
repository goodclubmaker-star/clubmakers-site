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
    year:'2026학년도 실제 수능, 2025년 11월 시행',
    publicBreakdown:'수학Ⅰ 11문항, 수학Ⅱ 11문항, 선택과목별 8문항',
    highDiscrimination:'수학Ⅰ 지수·로그함수 그래프(22번), 수학Ⅱ 함수의 극한(21번), 선택 확률과 통계 30번',
    caveat:'선택과목 체제의 수치는 2028 수능의 확률과 통계 8문항 비율을 보장하지 않음'
  },
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
    {label:'2026 실제 수능 · EBS 수학 영역 출제 경향',url:'https://www.ebsi.co.kr/ebs/ent/enta/retrieveEntAnlyStrdDataVw.ebs?bbsCd=B114&datNo=127090'},
    {label:'교육부 · 2028 수능 통합형 개편 확정',url:'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=97551&lev=0'}
  ]
};