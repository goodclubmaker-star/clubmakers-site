// 붙여넣은 HTML(네이버 블로그 스마트에디터 포함) → 일지 마크다운
// 표는 | 표 |, 소제목은 ##, 굵게는 **, 사진은 자리표시 [[img:N]] 로 바꾸고 사진 주소 목록을 함께 돌려준다.
(function (root) {
  const BLOCK = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'FIGURE', 'FIGCAPTION', 'PRE', 'DL', 'DT', 'DD']);
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'BUTTON', 'svg', 'SVG', 'IFRAME', 'VIDEO', 'AUDIO', 'TEMPLATE', 'HEAD', 'META', 'LINK']);
  const clean = t => t.replace(/[​‌‍﻿]/g, '').replace(/ /g, ' ');

  function imgSrc(img) {
    let s = img.getAttribute('data-lazy-src') || img.getAttribute('data-src') || img.getAttribute('src') || '';
    if (!/^https?:\/\//.test(s)) return '';
    // 네이버 사진: 흐린 미리보기·작은 크기 대신 큰 사진으로
    if (/pstatic\.net|naver\.net/.test(s)) {
      if (/storep-phinf|sticker|static\.blog\.naver|\/imgs\/|blogpfthumb|ssl\.pstatic\.net\/static/.test(s)) return '';
      s = s.replace(/([?&])type=[^&]*/, '$1type=w966');
      if (!/[?&]type=/.test(s)) s += (s.includes('?') ? '&' : '?') + 'type=w966';
    }
    return s;
  }
  function isBold(el) {
    if (el.tagName === 'B' || el.tagName === 'STRONG') return true;
    const fw = (el.style && el.style.fontWeight) || '';
    if (fw === 'bold' || Number(fw) >= 600) return true;
    return /\bse-(weight-)?bold\b|se-fw-bold/.test(el.className || '');
  }
  function headingLevel(el) {
    const t = el.tagName;
    if (/^H[1-3]$/.test(t)) return 2;
    if (/^H[4-6]$/.test(t)) return 3;
    const c = el.className || '';
    if (/se-section-sectionTitle|se-sectionTitle/.test(c)) return 2;
    return 0;
  }

  function convert(rootEl) {
    const images = [];
    const out = [];          // 블록 단위 결과
    let line = '';           // 현재 쌓는 인라인 텍스트

    const flush = () => { const t = clean(line).replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/[ \t]{2,}/g, ' ').trim(); if (t) out.push(t); line = ''; };

    function inline(node) {
      if (node.nodeType === 3) { line += node.nodeValue.replace(/\s*\n\s*/g, ' '); return; }
      if (node.nodeType !== 1) return;
      const el = node, tag = el.tagName;
      if (SKIP.has(tag) || el.getAttribute('aria-hidden') === 'true' && tag !== 'IMG') return;
      if (tag === 'BR') { line += '\n'; return; }
      if (tag === 'IMG') { const s = imgSrc(el); if (s) { flush(); images.push(s); out.push(`[[img:${images.length - 1}]]`); } return; }
      if (tag === 'TABLE') { flush(); const t = table(el); if (t) out.push(t); return; }
      const h = headingLevel(el);
      if (h) { flush(); const t = clean(el.textContent).replace(/\s+/g, ' ').trim(); if (t) out.push('#'.repeat(h) + ' ' + t); return; }
      if (tag === 'HR') { flush(); out.push('---'); return; }
      if (tag === 'UL' || tag === 'OL') { flush(); list(el, tag === 'OL'); return; }
      if ((tag === 'BLOCKQUOTE' || /se-quotation/.test(el.className || '')) && !(el.parentElement && el.parentElement.closest('blockquote, .se-quotation'))) {
        flush(); const start = out.length; [...el.childNodes].forEach(inline); flush();
        for (let i = start; i < out.length; i++) if (!out[i].startsWith('[[img')) out[i] = out[i].split('\n').map(l => '> ' + l).join('\n');
        return;
      }
      if (tag === 'A') {
        const href = el.getAttribute('href') || '';
        const before = line; [...el.childNodes].forEach(inline);
        const txt = clean(line.slice(before.length)).trim();
        if (/^https?:\/\//.test(href) && txt && !/^https?:\/\//.test(txt) && !el.querySelector('img')) line = before + `[${txt}](${href})`;
        return;
      }
      const block = BLOCK.has(tag);
      if (block) flush();
      if (isBold(el) && !block) {
        const before = line; [...el.childNodes].forEach(inline);
        const inner = line.slice(before.length);
        const t = inner.trim();
        line = before + (t ? inner.replace(t, `**${t}**`) : inner);
        return;
      }
      [...el.childNodes].forEach(inline);
      if (block) flush();
    }
    function list(el, ordered) {
      let n = 1;
      const items = [];
      for (const li of el.children) {
        if (li.tagName !== 'LI') continue;
        const t = clean(li.textContent).replace(/\s+/g, ' ').trim();
        if (t) items.push((ordered ? `${n++}. ` : '- ') + t);
      }
      if (items.length) out.push(items.join('\n'));
    }
    function cellText(td) {
      const parts = [];
      td.querySelectorAll('img').forEach(im => { const s = imgSrc(im); if (s) { images.push(s); parts.push(`[[img:${images.length - 1}]]`); } });
      const leaves = [...td.querySelectorAll('p, li, div')].filter(x => !x.querySelector('p, li, div'));
      const t = (leaves.length ? leaves.map(x => clean(x.textContent)) : clean(td.textContent).split(/\n+/)).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' / ');
      return (t + (parts.length ? ' ' + parts.join(' ') : '')).replace(/\|/g, '｜').trim();
    }
    function table(tb) {
      const rows = [...tb.querySelectorAll('tr')].filter(tr => tr.closest('table') === tb)
        .map(tr => [...tr.children].filter(c => c.tagName === 'TD' || c.tagName === 'TH').flatMap(c => {
          const span = Math.min(Number(c.getAttribute('colspan')) || 1, 12);
          return [cellText(c), ...Array(span - 1).fill('')];
        })).filter(r => r.some(Boolean));
      if (!rows.length) return '';
      const n = Math.max(...rows.map(r => r.length));
      if (n === 1) return rows.map(r => '> ' + r[0]).join('\n');
      const pad = r => r.concat(Array(n - r.length).fill(''));
      return ['| ' + pad(rows[0]).join(' | ') + ' |', '|' + '---|'.repeat(n), ...rows.slice(1).map(r => '| ' + pad(r).join(' | ') + ' |')].join('\n');
    }

    [...rootEl.childNodes].forEach(inline);
    flush();
    // 같은 줄이 연달아 반복되는 것(에디터 잔여물) 정리
    const md = out.filter((b, i) => !(b === out[i - 1] && !b.startsWith('[[img'))).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
    return { md, images };
  }

  // 네이버 블로그 글 본문만 골라낸다 (붙여넣기·주소 가져오기 공통)
  function pickNaver(doc) {
    const main = doc.querySelector('.se-main-container') || doc.querySelector('#postViewArea') || doc.querySelector('.post-view') || doc.body;
    const titleEl = doc.querySelector('.se-title-text, .se_title .se_textarea, .pcol1, .htitle');
    // 본문 앞의 제목 영역은 빼고
    main.querySelectorAll('.se-documentTitle, .se-component.se-documentTitle').forEach(n => n.remove());
    return { el: main, title: titleEl ? clean(titleEl.textContent).replace(/\s+/g, ' ').trim() : '' };
  }

  root.Html2Md = {
    fromHtml(html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const p = pickNaver(doc);
      const r = convert(p.el);
      return { ...r, title: p.title };
    },
    convert,
  };
})(window);
