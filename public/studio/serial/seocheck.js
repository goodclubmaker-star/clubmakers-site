// 작업일지 SEO 자동 검수 — 작업대 편집 화면과 'SEO 점검' 화면이 같이 쓴다
(function (root) {
  const strip = md => String(md || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\|?\s*:?-{3,}.*$/gm, ' ').replace(/[#>*_`|]/g, ' ');
  const len = s => String(s || '').replace(/\s/g, '').length;
  const BRAND_START = /^(골프채\s*공작소|클럽메이커스|골프채공작소\s*클럽메이커스)/;
  const GLUED = /(작업\s*스케치|신제품\s*안내|입고\s*안내|작업\s*일지)(?=[^\s\-—:｜|·,)\]])/;

  // a: {title, description, tags[], body(md), slug?, published?}, ctx: {titles: 다른 글 제목들}
  function check(a, ctx = {}) {
    const title = String(a.title || '').trim();
    const desc = String(a.description || '').trim();
    const tags = (a.tags || []).filter(Boolean);
    const body = String(a.body || '');
    const text = strip(body);
    const imgs = [...body.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
    const noAlt = imgs.filter(m => !m[1].trim() || m[1].trim() === '사진').length;
    const heads = (body.match(/^#{2,3}\s+\S/gm) || []).length;
    const tables = (body.match(/^\|(\s*:?-{3,}:?\s*\|)+\s*$/gm) || []).length;
    const words = (root.AutoTag ? root.AutoTag.analyze(title, body) : { tags: [] });
    // 핵심어: 모델명 → 브랜드 → 작업 이름 순 (태그에 있으면 그것부터)
    const specific = [...(words.models || []), ...(words.brands || [])];
    const key = specific.find(k => tags.includes(k)) || specific[0] || (words.jobs || [])[0] || '';
    const SYN = { '샤프트교체': ['샤프트교체', '리샤프팅', '샤프트교환', 'reshaft'], '그립교체': ['그립교체', '그립교환', '리그립'], '라이각조정': ['라이각', '라이조정'], '로프트조정': ['로프트'] };
    const flat = title.replace(/\s/g, '').toLowerCase();
    const keyInTitle = key ? (SYN[key] || [key]).some(k => flat.includes(k.replace(/\s/g, '').toLowerCase())) : true;
    const dup = (ctx.titles || []).filter(t => t && t.trim() === title).length > 0;
    const items = [];
    const add = (ok, w, msg, fix) => items.push({ ok: !!ok, w, msg, fix: ok ? '' : fix });

    add(title.length >= 10 && title.length <= 45, 15, `제목 ${title.length}자`, title.length < 10 ? '10자 이상으로 — 클럽·모델·작업 이름을 넣어 주세요' : '45자 안쪽으로 — 검색 결과에서 뒤가 잘립니다');
    add(!BRAND_START.test(title), 10, '제목이 검색어로 시작', '「골프채공작소」로 시작하면 검색어가 뒤로 밀립니다. 상호는 빼거나 뒤로');
    add(!GLUED.test(title), 5, '제목 띄어쓰기', '「작업스케치」 같은 말머리 뒤에 띄어쓰기나 ｜를 넣어 주세요');
    add(keyInTitle, 10, key ? `제목에 핵심어 「${key}」` : '제목에 핵심어', `제목에 「${key}」를 넣으면 그 말로 검색될 때 걸립니다`);
    add(desc.length >= 40 && desc.length <= 120, 15, desc ? `요약 ${desc.length}자` : '요약 없음', desc ? (desc.length < 40 ? '40자 이상 — 무엇을 왜 했는지 한두 문장' : '120자 안쪽으로') : '검색 결과 밑에 나갈 한두 문장을 써 주세요');
    add(!desc || (desc.replace(/\s/g, '') !== title.replace(/\s/g, '') && !title.includes(desc)), 5, '요약이 제목과 다름', '요약이 제목을 되풀이합니다. 내용을 한 줄로 풀어 주세요');
    add(tags.length >= 3 && tags.length <= 8, 10, `태그 ${tags.length}개`, tags.length < 3 ? '3~8개 — 본문을 쓰면 자동 추천됩니다' : '8개 이하로');
    add(len(text) >= 600, 10, `본문 ${len(text)}자`, '공백 빼고 600자 이상이면 검색에 유리합니다');
    add(heads >= 2 || len(text) < 600, 5, `소제목 ${heads}개`, '## 소제목을 2개 이상 — 양식을 쓰면 자동으로 들어갑니다');
    add(imgs.length >= 1, 5, `사진 ${imgs.length}장`, '사진 한 장 이상 (첫 사진이 썸네일)');
    add(imgs.length === 0 || noAlt === 0 || a.published === false, 5, noAlt ? `설명 없는 사진 ${noAlt}장` : '사진 설명', '![사진] 대신 무엇을 찍었는지 — 비워 두면 등록할 때 제목으로 채웁니다');
    add(!dup, 5, '제목 중복 없음', '같은 제목의 글이 이미 있습니다');

    const total = items.reduce((s, i) => s + i.w, 0);
    const got = items.reduce((s, i) => s + (i.ok ? i.w : 0), 0);
    const score = Math.round(got / total * 100);
    return { score, grade: score >= 85 ? '좋음' : score >= 65 ? '보통' : '보완 필요', items, stats: { chars: len(text), imgs: imgs.length, noAlt, heads, tables, key } };
  }
  root.SeoCheck = { check };
})(window);
