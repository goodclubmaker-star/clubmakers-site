// 작업일지 양식과 태그·제목 자동 추천
// 본문에 실제로 나온 브랜드·모델·작업 이름만 골라낸다 (사전에 없는 말을 지어내지 않음).
(function (root) {
  // [표시할 태그, 찾을 말들(정규식 조각)]
  const BRANDS = [
    ['후지쿠라', 'fujikura|후지쿠라'], ['스피더', 'speeder|스피더'], ['벤투스', 'ventus|벤투스'],
    ['미쓰비시', 'mitsubishi|미쓰비시|미츠비시'], ['텐세이', 'tensei|텐세이'], ['디아마나', 'diamana|디아마나'],
    ['그라파이트디자인', 'graphite\\s*design|그라파이트\\s*디자인'], ['투어AD', 'tour\\s*ad|투어\\s*ad'],
    ['UST마미야', 'ust|mamiya|마미야'], ['오토플렉스', 'autoflex|오토플렉스'], ['프로젝트X', 'project\\s*x|프로젝트\\s*x'],
    ['로얄프리시즌', 'royal\\s*precision|로얄\\s*프리시즌'], ['트루템퍼', 'true\\s*temper|트루템퍼'],
    ['다이나믹골드', 'dynamic\\s*gold|다이나믹\\s*골드|\\bdg\\s*(?:s|x|r)?\\d{3}'], ['KBS', '\\bkbs\\b'],
    ['NS PRO', 'n\\.?s\\.?\\s*pro|엔에스\\s*프로'], ['모듀스', 'modus|모듀스'], ['스틸파이버', 'steel\\s*fiber|스틸\\s*파이버'],
    ['에어로텍', 'aerotech|에어로텍'], ['니폰샤프트', 'nippon|니폰'], ['아크라', 'accra|아크라'], ['크라이젤', 'krayzel|크라이젤'],
    ['뉴레벨', 'new\\s*level|뉴레벨'], ['오카무라', 'okamura|오카무라'], ['미스테리', 'mystery|미스테리'],
    ['타이틀리스트', 'titleist|타이틀리스트'], ['핑', '\\bping\\b|핑\\s*(?:g\\d|i\\d|블루프린트)'], ['테일러메이드', 'taylor\\s*made|테일러\\s*메이드'],
    ['캘러웨이', 'callaway|캘러웨이'], ['미즈노', 'mizuno|미즈노'], ['스릭슨', 'srixon|스릭슨'], ['젝시오', 'xxio|젝시오'],
    ['혼마', 'honma|혼마'], ['브리지스톤', 'bridgestone|브리지스톤'], ['코브라', 'cobra|코브라'], ['PXG', '\\bpxg\\b'],
    ['던롭', 'dunlop|던롭'], ['야마하', 'yamaha|야마하'], ['에폰', 'epon|에폰'], ['미우라', 'miura|미우라'],
    ['에델', 'edel|에델'], ['스카티카메론', 'scotty|카메론'], ['오디세이', 'odyssey|오디세이'], ['베티나르디', 'bettinardi|베티나르디'],
    ['슈퍼스트로크', 'super\\s*stroke|슈퍼\\s*스트로크'], ['골프프라이드', 'golf\\s*pride|골프\\s*프라이드'],
    ['이오믹', 'iomic|이오믹'], ['럭스립', 'lux\\s*rib|럭스립'], ['램킨', 'lamkin|램킨'],
    ['VERSUS', 'versus'], ['KRZ', '\\bkrz\\b'], ['DEFINE', '\\bdefine\\b'],
  ];
  const WORKS = [
    ['샤프트교체', '리샤프팅|re-?shaft|샤프트\\s*(?:교체|교환|바꿔)'], ['그립교체', '그립\\s*(?:교체|교환|작업)|regrip'],
    ['라이각조정', '라이\\s*각?\\s*(?:조정|조절|벤딩|수정)|lie\\s*angle'], ['로프트조정', '로프트\\s*(?:조정|조절|벤딩|수정)'],
    ['스윙웨이트', '스윙\\s*웨이트|swing\\s*weight|\\bsw\\b\\s*[a-e]\\d'], ['MOI매칭', 'moi\\s*(?:매칭|matching)|관성\\s*모멘트'],
    ['CPM', '\\bcpm\\b|진동수'], ['길이조정', '길이\\s*(?:조정|조절|줄|늘)|컷팅|익스텐션'], ['총무게', '총\\s*무게|토탈\\s*웨이트'],
    ['클럽피팅', '피팅'], ['클럽수리', '수리|헤드\\s*빠짐|페럴|ferrule'], ['헤드교체', '헤드\\s*(?:교체|교환)'],
    ['커스텀클럽', '커스텀|맞춤\\s*제작|조립'], ['K-VEST', 'k-?vest|케이베스트'], ['론치모니터', '론치\\s*모니터|트랙맨|gc\\s*quad|gcquad'],
    ['슬라이스', '슬라이스'], ['훅', '\\b훅\\b|훅이|훅성'], ['탄도', '탄도'], ['스핀량', '스핀\\s*(?:량|양)'],
    ['스파인', '스파인|spine|flo\\b'], ['카운터밸런스', '카운터\\s*밸런'],
  ];
  const CLUBS = [
    ['드라이버', 'driver', '드라이버'], ['페어웨이우드', 'fairway', '페어웨이|우드|fw\\b|\\b[357]번\\s*우드'], ['하이브리드', 'hybrid', '하이브리드|유틸|utility|ut\\b'],
    ['아이언', 'iron', '아이언|iron'], ['웨지', 'wedge', '웨지|wedge|샌드|[ag]w\\b|\\d{2}도'], ['퍼터', 'putter', '퍼터|putter'],
  ];
  const BASE = ['골프채공작소'];

  function count(text, pat) { const m = text.match(new RegExp(pat, 'gi')); return m ? m.length : 0; }
  // 본문에서 영문 모델명 (예: JADE SPEEDER, MODB-1, MCI 90S, T100, i95)
  const STOP = new Set(['CPM', 'SW', 'MOI', 'KBS', 'PXG', 'UST', 'DG', 'FW', 'UT', 'AW', 'GW', 'LW', 'PW', 'SW', 'NS', 'PRO', 'FLO', 'EI', 'HS', 'THE', 'AND', 'OF', 'DAY', 'FOR', 'NEW', 'MASTER', 'CLUBMAKER', 'CLUBMAKERS', 'GOLF', 'SHAFT', 'IRON', 'DRIVER', 'WOOD', 'PUTTER', 'WEDGE', 'GRIP', 'TOUR', 'LIMITED', 'EDITION', 'KOREA']);
  const CLUBABBR = /^(PW|AW|GW|SW|LW|FW|UT|DR|\d)$/i;
  function models(text) {
    const toks = [...text.matchAll(/[A-Za-z0-9][A-Za-z0-9.-]*/g)].map(m => ({ t: m[0], i: m.index, e: m.index + m[0].length }));
    const mixed = t => /[A-Za-z]/.test(t) && /\d/.test(t) && t.length >= 2;
    const caps = t => /^[A-Z]{4,}$/.test(t) && !STOP.has(t);
    const out = new Map();
    for (let k = 0; k < toks.length; k++) {
      const a = toks[k], b = toks[k + 1], gap = b ? text.slice(a.e, b.i) : '';
      const near = b && /^[\s-]?$/.test(gap);
      let cand = '';
      if (near && caps(a.t) && caps(b.t)) cand = a.t + ' ' + b.t;                                  // JADE SPEEDER
      else if (near && /^[A-Z]{2,5}$/.test(a.t) && !STOP.has(a.t) && !CLUBABBR.test(a.t) && /^\d{2,3}[A-Z]{0,2}$/.test(b.t)) cand = a.t + ' ' + b.t; // MCI 90S
      else if (near && /^[A-Z]{3,}$/.test(a.t) && !STOP.has(a.t) && /^(Pro|Max|Plus|Tour|Forged|Black|Blue|Red|White|Orange|Lite|Ti|Hybrid|Wood)$/.test(b.t)) cand = a.t + ' ' + b.t; // SMS Pro
      else if (mixed(a.t) && !/^[A-E]\d(\.\d)?$/i.test(a.t) && !CLUBABBR.test(a.t.replace(/\d+/g, '')) && !/^\d+(mm|g|cm|도|kg)$/i.test(a.t) && !/^[\d.]+[a-z]{1,2}$/i.test(a.t)) cand = a.t; // MODB-1, T100, i95
      if (!cand || STOP.has(cand.toUpperCase())) continue;
      out.set(cand, (out.get(cand) || 0) + 1);
    }
    const list = [...out.entries()].sort((x, y) => y[1] - x[1]).map(x => x[0]);
    return list.filter(m => !list.some(o => o !== m && o.includes(m) && out.get(o) >= out.get(m))).slice(0, 3);
  }

  function analyze(title, body) {
    const text = (title + '\n' + body).replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\(photo:[^)]*\)/g, ' ');
    const pick = list => list.map(([tag, ...rest]) => [tag, count(text, rest[rest.length - 1]), rest.length > 1 ? rest[0] : null])
      .filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    const brands = pick(BRANDS), works = pick(WORKS), clubs = pick(CLUBS);
    const jobs = works.filter(w => /교체|조정|피팅|수리|매칭|커스텀/.test(w[0]));
    const mods = models(text);
    const tags = [];
    const add = t => { if (t && !tags.includes(t)) tags.push(t); };
    clubs.slice(0, 1).forEach(c => add(c[0]));
    works.slice(0, 3).forEach(w => add(w[0]));
    brands.slice(0, 3).forEach(b => add(b[0]));
    mods.slice(0, 2).forEach(add);
    if (clubs[0] && works[0] && /교체|조정|피팅/.test(works[0][0])) add(clubs[0][0] + ' ' + works[0][0].replace(/(교체|조정)$/, ' $1'));
    BASE.forEach(add);
    return {
      tags: tags.slice(0, 8),
      clubType: clubs.length > 1 && clubs[1][1] >= clubs[0][1] ? 'mixed' : (clubs[0] ? clubs[0][2] : ''),
      brands: brands.map(b => b[0]), works: works.map(w => w[0]), jobs: jobs.map(w => w[0]), clubs: clubs.map(c => c[0]), models: mods,
    };
  }
  // 제목 추천: [브랜드 모델] [클럽] [작업]｜[다른 모델] — 본문에 있는 말만 조합
  const BRAND_EN = Object.fromEntries(BRANDS.map(([k, p]) => [k, new RegExp(p, 'i')]));
  function suggestTitles(title, body) {
    const a = analyze(title, body);
    const sp = w => (w || '').replace(/(교체|조정|매칭)$/, ' $1');
    const model = a.models[0] || '';
    const brand = (a.brands.find(b => !(model && BRAND_EN[b].test(model))) || '');
    const club = a.clubs[0] || '', job = sp(a.jobs[0]), job2 = sp(a.jobs[1]);
    const second = a.models.find(m => m !== model && !(BRAND_EN[brand] && BRAND_EN[brand].test(m))) || '';
    const kind = (title.match(/신제품|입고|리뷰|시타|출시/) || [])[0] || '';
    const j = (...p) => p.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const out = [];
    if (club && job) out.push(j(brand, model, club, job) + (second ? '｜' + second : ''));
    if (!job && (brand || model)) out.push(j(brand, model, club, kind));
    if (model && job) out.push(j(model, job, '—', club ? club + ' 작업 사례' : '작업 사례'));
    if (club && job && job2) out.push(j(club, job, '·', job2) + '｜양재 골프채공작소');
    return [...new Set(out)].filter(t => t.length >= 8).slice(0, 3);
  }

  // 양식 (본문 뼈대 — 제목과 빈 표만, 문장은 넣지 않음)
  const T = (rows, cols = ['항목', '작업 전', '작업 후']) =>
    ['| ' + cols.join(' | ') + ' |', '|' + '---|'.repeat(cols.length), ...rows.map(r => '| ' + [r, ...Array(cols.length - 1).fill('')].join(' | ') + ' |')].join('\n');
  const SPEC = T(['헤드', '샤프트', '길이', '로프트 / 라이', '스윙웨이트', '총무게', 'CPM', '그립']);
  const TEMPLATES = {
    reshaft: { name: '리샤프팅', cat: 'log', body: ['## 손님 이야기', '', '## 기존 클럽', '', '## 샤프트를 고른 이유', '', '## 작업 사양', SPEC, '', '## 작업 후 확인', '', '## 공작소장 메모', ''] },
    fitting: { name: '피팅 사례 (증상→측정→진단→처방)', cat: 'log', body: ['## 증상', '', '## 측정', T(['헤드스피드', '볼스피드', '발사각', '스핀량', '캐리', '좌우 편차'], ['항목', '기존 클럽', '테스트 1', '테스트 2']), '', '## 진단', '', '## 처방', SPEC, '', '## 재측정', ''] },
    grip: { name: '그립 교체', cat: 'log', body: ['## 교체 이유', '', '## 그립 사양', T(['모델', '무게', '두께(테이프)', '스윙웨이트 변화']), '', '## 작업 메모', ''] },
    liefit: { name: '라이·로프트 조정', cat: 'log', body: ['## 조정 이유', '', '## 측정과 조정', T(['4', '5', '6', '7', '8', '9', 'P', 'A'], ['번호', '로프트 전→후', '라이 전→후', '메모']), '', '## 작업 후 확인', ''] },
    repair: { name: '수리', cat: 'log', body: ['## 들어온 상태', '', '## 원인', '', '## 작업 과정', '', '## 마무리 사양', SPEC, ''] },
    review: { name: '샤프트·헤드 리뷰', cat: 'review', body: ['## 제품 소개', '', '## 실측', T(['무게', 'CPM', '토크', '킥포인트', '팁 / 버트 지름'], ['항목', '표기', '실측']), '', '## 시타', '', '## 이런 골퍼에게', '', '## 공작소장 메모', ''] },
    newprod: { name: '신제품 안내', cat: 'review', body: ['## 어떤 제품인가', '', '## 사양', T(['무게', '플렉스', '토크', '킥포인트', '가격'], ['항목', '내용']), '', '## 공작소에서 본 점', '', '## 문의', ''] },
    data: { name: '측정 데이터', cat: 'data', body: ['## 측정 조건', '', '## 측정표', T(['', '', ''], ['모델', '무게', 'CPM', '토크', '메모']), '', '## 읽는 법', ''] },
    column: { name: '컬럼', cat: 'column', body: ['## ', '', '## ', '', '## 정리', ''] },
    trend: { name: '장비 트렌드', cat: 'trends', body: ['## 무엇이 바뀌었나', '', '## 현장에서 보는 점', '', '## 정리', ''] },
  };

  root.AutoTag = { analyze, suggestTitles, TEMPLATES, templateText: k => TEMPLATES[k] ? TEMPLATES[k].body.join('\n') + '\n' : '' };
})(window);
