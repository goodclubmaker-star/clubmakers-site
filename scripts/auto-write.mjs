#!/usr/bin/env node
/**
 * 공작소 일지 자동 발행
 *
 * GitHub Actions가 정해진 시각에 실행합니다. 브라우저도 컴퓨터도 필요 없습니다.
 *
 *   node scripts/auto-write.mjs [줄기] [--dry]
 *
 * 줄기를 안 주면 요일에 따라 자동으로 정합니다.
 *   book        책 연재 — 저서 133개 절을 블로그용으로 다시 쓰고 책 페이지로 링크
 *   product     신제품·장비 — 실제 기사에서만 사실을 가져옴
 *   news        골프 뉴스 — 위와 같음
 *   witb        우승자 클럽·샤프트 — 위와 같음
 *   commentary  해외 블로그 논평 — 원문 요약은 짧게, 본문은 공작소 관점
 *
 * 작업일지(log)는 소장님 메모가 필요하므로 여기에 없습니다.
 * 그건 «공작소일지 초안생성기»에서 만듭니다.
 *
 * 환경변수
 *   OPENAI_API_KEY  필수
 *   OPENAI_MODEL    선택 (기본 gpt-4o)
 *   PUBLISH_OFFSET  선택 (기본 0 — 며칠 뒤로 예약할지)
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  VOICE, ask, gather, loadGlossary, linkGlossary, vocabHint, buildMarkdown, slugify,
  ymd, existingPosts, readJSON, log, JOURNAL_DIR, DATA_DIR,
} from './lib.mjs';

const ARGS = process.argv.slice(2);
const DRY = ARGS.includes('--dry');
const WANT = ARGS.find((a) => !a.startsWith('--'));
const OFFSET = Number(process.env.PUBLISH_OFFSET) || 0;

// 요일별 편성 (0=일). 일요일은 쉽니다.
const WEEK = ['', 'book', 'product', 'news', 'book', 'witb', 'commentary'];

/* ══ 1. 책 연재 ═════════════════════════════════════════════
   저서 원문이 있으므로 AI가 사실을 지어낼 여지가 없습니다.
   원문을 그대로 옮기지 않고 블로그 독자용으로 다시 씁니다.
   PART 1~14는 이미 /book/part-N 에 있으므로 중복을 피하고 그쪽으로 링크합니다. */

async function sourceBook(vocab) {
  const book = await readJSON(path.join(DATA_DIR, 'book.json'), []);
  if (!book.length) throw new Error('data/book.json이 없습니다. 책 추출을 먼저 하십시오.');

  const state = await readJSON(path.join(DATA_DIR, 'state.json'), { book: [] });
  const done = new Set(state.book || []);

  const flat = [];
  for (const p of book)
    for (const s of p.sections)
      flat.push({ id: `${p.num}#${s.no}`, part: p.num, partTitle: p.title, ...s });

  const next = flat.find((s) => !done.has(s.id)) || flat[0];
  const partNo = (next.part.match(/\d+/) || [])[0];
  const bookLink = partNo && Number(partNo) <= 14 ? `/book/part-${partNo}/` : null;

  log(`  ${next.part} ${next.no}절 · ${next.title} (${next.text.length}자)`);
  log(`  진행: ${done.size}/${flat.length}`);

  const r = await ask(
    `${VOICE}

아래는 공작소장의 저서 «실제적인 클럽피팅» 한 절의 원문입니다.
이 원문을 근거로 **블로그 글 한 편을 새로 씁니다.**

반드시 지킬 것
- 원문을 그대로 옮기거나 문장을 복사하지 마십시오. 같은 내용을 다른 글로 씁니다.
  (책 본문은 이미 사이트에 있어서, 복사하면 검색에서 서로 깎아먹습니다.)
- 책은 피팅 전문가용이라 조밀합니다. 블로그 글은 아마추어 골퍼가 실제로 겪는
  질문에서 출발해 쉽게 풀어 쓰십시오.
- 원문에 없는 수치나 주장을 더하지 마십시오.
- 원문의 표가 유용하면 더 단순한 형태로 재구성해도 됩니다.

구성
- 도입 2~3문장 (소제목 없이). 골퍼가 겪는 상황이나 흔한 오해에서 시작.
- '## 소제목' 3~4개. 라벨형("정의","결론") 말고 내용을 담은 문장형으로.
- 마지막 '## 정리' 2~3문장. 측정 없이 단정할 수 없다는 점을 담담히.
- 900~1400자. 중요한 어구 2~3곳만 **굵게**.
- 제목 28자 이내, 낚시성 표현 금지.

용어 표기
아래는 이 사이트 용어사전의 표제어입니다. 해당 개념을 쓸 때는 **이 표기를 그대로** 쓰십시오.
표기가 맞아야 본문에서 용어사전으로 자동 링크가 걸립니다.
${vocab}

JSON만 출력:
{"title":"...","description":"90자 이내","tags":["2~6자 3~5개"],"body":"마크다운 본문"}`,
    `[${next.part} ${next.no}절] ${next.title}\n\n${next.text.slice(0, 9000)}`
  );

  let body = r.body.trim();
  if (bookLink) {
    body += `\n\n---\n\n이 내용의 전체 논의는 저서 «실제적인 클럽피팅» [${next.part}](${bookLink})에 정리해 두었습니다.`;
  }

  state.book = [...done, next.id];
  return {
    post: { ...r, body, category: 'data', tags: [...(r.tags || []), '책 연재'] },
    state,
    skipTerms: [],
  };
}

/* ══ 2~5. 바깥 소식 ═════════════════════════════════════════
   공통 규칙: 실제로 가져온 기사 안에서만 씁니다.
   가져오지 못하면 글을 만들지 않고 그냥 종료합니다. 지어내지 않습니다. */

const EXTERNAL = {
  product: {
    category: 'review',
    take: 3,
    brief: `아래는 최근 해외 골프 매체에서 가져온 신제품·장비 기사 요약입니다.
이 자료에 담긴 사실만 써서 «요즘 나온 장비» 소식 한 편을 작성하십시오.

- 제품명, 출시 시기, 가격, 스펙은 자료에 있는 것만 쓰십시오. 없으면 쓰지 마십시오.
- 단순 소개로 끝내지 말고, 각 제품에 대해 **공작소 관점의 짧은 논평**을 붙이십시오.
  (이 구조가 어떤 골퍼에게 의미가 있는지, 피팅에서 무엇을 봐야 하는지)
- 논평에서도 측정하지 않은 것을 단정하지 마십시오.
- 광고처럼 읽히지 않게 하십시오. 사거나 말라는 말은 하지 마십시오.`,
  },
  news: {
    category: 'trends',
    take: 4,
    brief: `아래는 최근 골프 뉴스 기사 요약입니다.
이 자료에 담긴 사실만 써서 «요즘 골프계» 소식 한 편을 작성하십시오.

- 선수 이름, 대회명, 순위, 날짜, 기록은 자료에 있는 것만 쓰십시오.
- 자료에 없는 성적이나 발언을 절대 지어내지 마십시오.
- 장비·피팅과 연결되는 지점이 있으면 짧게 짚어 주십시오. 억지로 연결하지는 마십시오.`,
  },
  witb: {
    category: 'review',
    take: 2,
    brief: `아래는 최근 대회 우승자의 클럽 구성(WITB) 관련 기사 요약입니다.
이 자료에 담긴 사실만 써서 «우승자의 클럽» 한 편을 작성하십시오.

- 선수 이름, 대회명, 클럽 모델명, 샤프트 모델명, 스펙은 자료에 있는 것만 쓰십시오.
  하나라도 자료에 없으면 그 항목은 언급하지 마십시오. 추측 금지.
- 클럽 목록을 마크다운 표로 정리하십시오 (자료에 있는 것만).
- 그 뒤에 **샤프트와 스펙 선택이 무엇을 뜻하는지** 공작소 관점으로 해설하십시오.
- 아마추어가 같은 스펙을 쓰면 된다는 식으로 유도하지 마십시오.
  오히려 왜 그대로 따라 하면 안 되는지를 담담히 설명하십시오.`,
  },
  commentary: {
    category: 'trends',
    take: 1,
    brief: `아래는 해외 골프 블로그·매체의 글 요약입니다.
이 글을 소재로 «해외에서는 이렇게 말합니다» 한 편을 작성하십시오.

저작권 규칙 — 반드시 지키십시오
- 원문을 번역해 옮기지 마십시오. 전문 번역은 저작권 침해입니다.
- 원문 소개는 3~4문장 이내의 요약으로 짧게 끝내십시오.
- 직접 인용은 한 문장 이내로 하고 따옴표와 출처를 함께 표시하십시오.
- 글의 대부분(70% 이상)은 **공작소장의 관점**이어야 합니다.
  한국 골퍼·한국 코스·한국에서 유통되는 장비 기준으로 어떻게 다른지,
  현장에서 측정해 보면 어떤 점이 다르게 보이는지를 쓰십시오.
- 원문 주장에 동의하지 않으면 그렇게 쓰십시오. 근거를 함께 적으십시오.`,
  },
};

async function sourceExternal(kind, vocab) {
  const cfg = EXTERNAL[kind];
  const feeds = await readJSON(path.join(DATA_DIR, 'feeds.json'), {});
  const conf = feeds[kind];
  if (!conf) throw new Error(`feeds.json에 ${kind} 항목이 없습니다.`);

  log(`  피드 확인 중…`);
  let items = await gather(conf.urls, { days: kind === 'witb' ? 21 : 14 });

  // 키워드로 걸러내기 (지정된 경우에만)
  const kw = (conf['키워드'] || []).map((k) => k.toLowerCase());
  if (kw.length) {
    const hit = items.filter((i) => {
      const t = (i.title + ' ' + i.summary).toLowerCase();
      return kw.some((k) => t.includes(k));
    });
    if (hit.length) items = hit;
  }

  // 이미 다룬 링크 제외
  const state = await readJSON(path.join(DATA_DIR, 'state.json'), {});
  const used = new Set(state[kind] || []);
  items = items.filter((i) => !used.has(i.link));

  if (!items.length) {
    log(`  가져올 새 기사가 없습니다. 오늘은 건너뜁니다.`);
    return null;
  }

  const picked = items.slice(0, cfg.take);
  picked.forEach((i) => log(`  · ${i.title.slice(0, 70)}`));

  const material = picked
    .map((i, n) => `[자료 ${n + 1}]\n제목: ${i.title}\n날짜: ${i.date || '미상'}\n출처: ${i.link}\n내용: ${i.summary}`)
    .join('\n\n');

  const r = await ask(
    `${VOICE}

${cfg.brief}

구성
- 도입 2~3문장 (소제목 없이).
- '## 소제목' 2~4개.
- 마지막 '## 정리' 2~3문장.
- 900~1400자. 중요한 어구 2~3곳만 **굵게**.
- 제목 28자 이내, 낚시성 표현 금지.
- 외국 제품명·인명은 원어를 괄호로 병기하십시오. 예: 테일러메이드(TaylorMade)

용어 표기
아래는 이 사이트 용어사전의 표제어입니다. 해당 개념을 쓸 때는 **이 표기를 그대로** 쓰십시오.
표기가 맞아야 본문에서 용어사전으로 자동 링크가 걸립니다.
${vocab}

JSON만 출력:
{"title":"...","description":"90자 이내","tags":["2~6자 3~5개"],"body":"마크다운 본문"}`,
    material
  );

  state[kind] = [...used, ...picked.map((i) => i.link)].slice(-200);
  return {
    post: { ...r, category: cfg.category, sources: picked.map((i) => ({ title: i.title, link: i.link })) },
    state,
    skipTerms: [],
  };
}

/* ══ 본체 ══════════════════════════════════════════════════ */

async function main() {
  const kind = WANT || WEEK[new Date(Date.now() + 9 * 3600 * 1000).getUTCDay()];
  if (!kind) {
    log('오늘은 쉬는 날입니다.');
    return;
  }
  log(`줄기: ${kind}${DRY ? ' (연습 — 파일을 쓰지 않습니다)' : ''}\n`);

  const terms = await loadGlossary();
  const vocab = vocabHint(terms);

  const out = kind === 'book' ? await sourceBook(vocab) : await sourceExternal(kind, vocab);
  if (!out) return;

  const { post, state } = out;
  const posts = await existingPosts();

  // 같은 제목이 이미 있으면 중단
  if (posts.some((p) => p.title === post.title)) {
    log(`  같은 제목의 글이 이미 있습니다. 건너뜁니다: ${post.title}`);
    return;
  }

  const date = ymd(new Date(Date.now() + OFFSET * 86400000));
  const body = linkGlossary(post.body, terms, out.skipTerms);
  const md = buildMarkdown({
    title: post.title,
    description: post.description,
    tags: post.tags,
    body,
    pubDate: date,
    category: post.category,
    sources: post.sources,
  });

  const file = `${slugify(post.title, date)}.md`;
  const links = (body.match(/\/glossary\//g) || []).length;

  log(`\n  제목: ${post.title}`);
  log(`  ${md.length}자 · 용어 링크 ${links}개 · 발행일 ${date}`);

  if (DRY) {
    log('\n──────── 미리보기 ────────\n');
    log(md.slice(0, 1600));
    log('\n──────── 여기까지 ────────');
    return;
  }

  await mkdir(JOURNAL_DIR, { recursive: true });
  await writeFile(path.join(JOURNAL_DIR, file), md, 'utf8');
  await writeFile(path.join(DATA_DIR, 'state.json'), JSON.stringify(state, null, 1), 'utf8');
  log(`  → src/content/journal/${file}`);
}

main().catch((e) => {
  console.error('\n실패:', e.message);
  process.exit(1);
});
