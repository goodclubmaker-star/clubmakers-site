// 『실제적인 클럽피팅』 원고(docx) → 연재 단위 분할기
// 브라우저에서 docx의 word/document.xml을 읽어 절 단위로 나눈다.
// 원고 전문은 이 파일에도 저장소에도 들어가지 않는다 (작업대에서 파일을 고를 때만 읽음).
(function (root) {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const kids = (el, name) => {
    const out = [];
    for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && n.namespaceURI === W && n.localName === name) out.push(n);
    return out;
  };
  const kid = (el, name) => kids(el, name)[0] || null;
  const attr = (el, name) => (el ? el.getAttributeNS(W, name) || el.getAttribute('w:' + name) : null);
  const onOff = el => { if (!el) return false; const v = attr(el, 'val'); return !(v === '0' || v === 'false' || v === 'off'); };

  function runText(r) {
    let t = '';
    for (let n = r.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== 1 || n.namespaceURI !== W) continue;
      if (n.localName === 't') t += n.textContent;
      else if (n.localName === 'tab') t += '\t';
      else if (n.localName === 'br' || n.localName === 'cr') t += '\n';
      else if (n.localName === 'noBreakHyphen') t += '-';
    }
    return t;
  }
  function paraText(p) {
    let t = '';
    for (let n = p.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== 1 || n.namespaceURI !== W) continue;
      if (n.localName === 'r') t += runText(n);
      else if (n.localName === 'hyperlink') kids(n, 'r').forEach(r => t += runText(r));
    }
    return t;
  }
  function paraItem(p) {
    let bold = false, size = 0;
    for (const r of kids(p, 'r')) {
      const rPr = kid(r, 'rPr');
      const txt = runText(r);
      if (txt.trim() && rPr && onOff(kid(rPr, 'b'))) bold = true;
      const sz = rPr && kid(rPr, 'sz');
      if (sz) size = Math.max(size, Number(attr(sz, 'val')) / 2);
    }
    const img = p.getElementsByTagNameNS(A, 'blip').length;
    return { k: 'p', t: paraText(p).trim(), b: bold, s: size, img };
  }
  function cellText(tc) { return kids(tc, 'p').map(paraText).join('\n'); }
  function tableItem(tbl) {
    const grid = []; // grid[row] = [{start, span, tc}]
    const rows = [];
    kids(tbl, 'tr').forEach((tr, ri) => {
      const trPr = kid(tr, 'trPr');
      let col = Number(attr(trPr && kid(trPr, 'gridBefore'), 'val')) || 0;
      const placed = [];
      const cells = []; let prev = null;
      for (const tc of kids(tr, 'tc')) {
        const tcPr = kid(tc, 'tcPr');
        const span = Number(attr(tcPr && kid(tcPr, 'gridSpan'), 'val')) || 1;
        const vm = tcPr && kid(tcPr, 'vMerge');
        let src = tc;
        if (vm && attr(vm, 'val') !== 'restart') {
          for (let up = ri - 1; up >= 0; up--) {
            const hit = (grid[up] || []).find(c => c.start === col);
            if (!hit) break;
            src = hit.src;
            break;
          }
        }
        placed.push({ start: col, span, src });
        if (src !== prev) { cells.push(cellText(src).trim().replace(/\n/g, ' / ').replace(/\|/g, '｜')); prev = src; }
        col += span;
      }
      grid[ri] = placed;
      rows.push(cells);
    });
    return { k: 't', rows };
  }
  function parseDocumentXml(xml, DOMParserCtor) {
    const doc = new (DOMParserCtor || DOMParser)().parseFromString(xml, 'application/xml');
    const body = doc.getElementsByTagNameNS(W, 'body')[0];
    const items = [];
    for (let n = body.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== 1 || n.namespaceURI !== W) continue;
      if (n.localName === 'p') items.push(paraItem(n));
      else if (n.localName === 'tbl') items.push(tableItem(n));
    }
    return items;
  }

  const HEAD = /^(서문|PART \d+|\d+절\.|부록 [A-Z]|색인|현장작업표준서|WS-?\d+)/;
  function toUnits(items) {
    // 본문 시작 = 큰 글씨의 '서문' (목차 뒤)
    let start = items.findIndex(it => it.k === 'p' && it.t === '서문' && it.b && it.s >= 20);
    if (start < 0) start = 0;
    const units = []; let cur = null, part = '';
    for (let i = start; i < items.length; i++) {
      const it = items[i];
      if (it.k === 'p' && it.b && it.s >= 11 && HEAD.test(it.t) && it.t.length < 90) {
        const t = it.t;
        if (/^PART \d+$/.test(t) || (/^PART \d+ /.test(t) && !t.includes('마무리'))) part = t;
        if (/^부록 [A-Z]/.test(t)) part = t.slice(0, 4);
        cur = { part, title: t, lines: [] }; units.push(cur); continue;
      }
      if (!cur) continue;
      if (it.k === 'p') { if (it.img) cur.lines.push('[그림]'); if (it.t) cur.lines.push(it.t); }
      else {
        const rows = it.rows; if (!rows.length) continue;
        const n = Math.max(...rows.map(r => r.length));
        if (n === 1) { cur.lines.push(rows.filter(r => r[0]).map(r => '> ' + r[0]).join('\n')); continue; }
        const pad = r => r.concat(Array(n - r.length).fill(''));
        const md = ['| ' + pad(rows[0]).join(' | ') + ' |', '|' + '---|'.repeat(n)];
        rows.slice(1).forEach(r => md.push('| ' + pad(r).join(' | ') + ' |'));
        cur.lines.push(md.join('\n'));
      }
    }
    units.forEach(u => { u.text = u.lines.join('\n\n'); delete u.lines; });
    return units;
  }

  function splitBy(text, re) {
    const chunks = [[null, []]];
    for (const p of text.split('\n\n')) {
      if (re.test(p) && p.length < 80) chunks.push([p, []]); else chunks[chunks.length - 1][1].push(p);
    }
    return chunks.map(([h, b]) => [h, b.join('\n\n')]);
  }
  const APPX = { A: '피팅 실행 도구', D: '용어·수치 참조표' };

  function toSections(units) {
    const out = [];
    const add = (group, title, text) => { text = (text || '').trim(); if (text || title) out.push({ group, title, text }); };
    let p11b = false, p12 = '웨지', p12seen = 0, afterD = false, appx = '';
    for (const x of units) {
      const t = x.title, txt = x.text;
      if (t === '서문') continue;
      if (/^서문/.test(t)) { add('서문', t, txt); continue; }
      const ap = t.match(/^부록 ([A-Z])/);
      if (ap) {
        if (/마무리/.test(t)) { add(appx, appx + ' 마무리 · 참고 자료', txt); continue; }
        if (!txt.trim()) continue;              // 빈 부록 제목 (예: 부록 E 표제)
        appx = '부록 ' + ap[1];
        if (ap[1] === 'D') afterD = true;
        const bare = /^부록 [A-Z]$/.test(t);
        add(appx, bare ? `${appx} ${APPX[ap[1]] || '들어가며'}` : t, txt); continue;
      }
      if (t === '색인' || /^색인/.test(t)) { add('색인', t, txt); continue; }
      if (afterD && /^PART \d+/.test(t)) {          // 부록 E 확인 문제 해설
        const cut = txt.indexOf('\n\n현장 작업표준서');
        if (cut < 0) { add('부록 E', '확인 문제 해설 · ' + t, txt); continue; }
        add('부록 E', '확인 문제 해설 · ' + t, txt.slice(0, cut));
        for (const [h, b] of splitBy(txt.slice(cut + 2), /^(작업표준서 WI-\d+|현장 작업표준서$)/)) {
          if (h && h.startsWith('작업표준서')) {
            const ps = b.split('\n\n');
            add('현장작업표준서', h + ' ' + ps[0], ps.slice(1).join('\n\n'));
          } else if (b.trim()) add('현장작업표준서', '현장 작업표준서 들어가며', b);
        }
        continue;
      }
      if (appx && !/^PART/.test(x.part)) { add(appx, t, txt); continue; }
      const gm = (x.part || '').match(/^PART \d+/);
      const g = gm ? gm[0] : (x.part || '기타');
      if (g === 'PART 13' && t === 'PART 13') { for (const [h, b] of splitBy(txt, /^케이스 \d+ —/)) add(g, h || 'PART 13 들어가며', b); continue; }
      if (g === 'PART 14' && t === 'PART 14') { for (const [h, b] of splitBy(txt, /^[123]부\. /)) add(g, h || 'PART 14 들어가며', b); continue; }
      let tt = /^PART \d+$/.test(t) ? t + ' 들어가며' : t;
      if (g === 'PART 11') { if (/^PART 11 마무리/.test(t)) { add(g, t, txt); p11b = true; continue; } if (p11b) tt = '문제 해결 · ' + t; }
      if (g === 'PART 12' && /^\d+절\./.test(t)) { if (/^1절\./.test(t)) { p12seen++; if (p12seen === 2) p12 = '퍼터'; } tt = p12 + ' · ' + t; }
      add(g, tt, txt);
    }
    out.forEach((s, i) => s.id = 's' + String(i + 1).padStart(3, '0'));
    return out;
  }

  root.SerialSplitter = { parseDocumentXml, toUnits, toSections, split: (xml, D) => toSections(toUnits(parseDocumentXml(xml, D))) };
})(typeof window !== 'undefined' ? window : globalThis);
