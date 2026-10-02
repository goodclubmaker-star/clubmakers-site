(() => {
  const STORAGE_KEY = 'blue-christmas-storyboard-edits-v1';
  const STRUCTURAL_ACTION_MIGRATIONS = new Set(['S20-C10', 'S20-C11']);
  const originalScenes = JSON.parse(JSON.stringify(scenes));
  let editMode = false;

  const style = document.createElement('style');
  style.textContent = `
    .editOnly[hidden]{display:none!important}
    .editNotice{margin:0 0 18px;padding:13px 16px;border:1px solid #5a6574;border-radius:8px;background:#151b25;color:#e9edf3;font-size:14px;line-height:1.55}
    .cutEditTools{display:flex;gap:7px;flex-wrap:wrap;margin:-2px 0 13px;padding-bottom:12px;border-bottom:1px dashed #b8ad9b}
    .cutEditTools button{border:1px solid #8e8371;border-radius:999px;background:#fffaf0;color:#25221d;padding:6px 10px;cursor:pointer;font-weight:700}
    .cutEditTools button:disabled{opacity:.35;cursor:not-allowed}
    .spread.cutHidden{outline:2px dashed #a44249;outline-offset:-2px;opacity:.58}
    .spread.cutHidden .cutEditTools:after{content:'콘티북에서 숨김';margin-left:auto;align-self:center;color:#a44249;font-size:12px;font-weight:800}
    .cutEditTools .hideCutBtn{border-color:#a44249;color:#8c343a}
    .cutEditTools .restoreCutBtn{border-color:#47705c;color:#356149}
    .action[contenteditable="true"]{min-height:92px;padding:12px 13px;border:2px solid #c89a52;border-radius:6px;background:#fffdf7;outline:none;white-space:pre-wrap}
    .action[contenteditable="true"]:focus{border-color:#b84348;box-shadow:0 0 0 3px #b8434820}
    .action[contenteditable="true"]:empty:before{content:attr(data-placeholder);color:#9c9488}
    .scriptLine{display:block}
    .directionLine{margin:.22em 0;color:#6e675e;font-style:italic;text-align:left}
    .speakerLine{margin:1.05em auto .28em;color:#a44249;font-weight:800;letter-spacing:.08em;text-align:center}
    .dialogueLine{max-width:760px;margin:.18em auto;color:#263f59;font-style:normal;text-align:center}
    .dialogueAside{color:#82766a;font-size:.9em;font-style:italic}
    .narrationCue{color:#45637f}
    .narrationLine{color:#4c6176}
    .captionCue{color:#775c86}
    .captionLine{color:#614d6d}
    .scriptGap{display:block;height:.72em}
    .cinematicCaption{position:absolute;left:50%;bottom:8%;z-index:3;max-width:88%;transform:translateX(-50%);padding:.48em .88em;border-radius:4px;background:#0a0d12a6;color:#fff5df;font-family:"Noto Sans KR","Malgun Gothic",sans-serif;font-size:clamp(15px,2.1vw,28px);font-weight:600;letter-spacing:.045em;line-height:1.45;text-align:center;text-shadow:0 2px 8px #000,0 1px 2px #000;white-space:nowrap}
    .tools .editorBtn.active{border-color:#d9b779;background:#d9b779;color:#13161b}
    @media(max-width:700px){.editNotice{border-radius:0;margin-bottom:12px}.cutEditTools{margin-top:0}.action[contenteditable="true"]{min-height:120px}}
    @media print{.editNotice,.cutEditTools,.editorBtn,.editOnly{display:none!important}}
  `;
  document.head.appendChild(style);

  function findScene(sceneNo) {
    return scenes.find((scene) => scene.n === Number(sceneNo));
  }

  function findCut(sceneNo, cutId) {
    return findScene(sceneNo)?.cuts.find((cut) => cut.id === cutId);
  }

  function saveEdits() {
    const payload = {
      version: 2,
      savedAt: new Date().toISOString(),
      scenes: Object.fromEntries(scenes.map((scene) => [scene.n, {
        order: scene.cuts.map((cut) => cut.id),
        actions: Object.fromEntries(scene.cuts.map((cut) => [cut.id, cut.action || ''])),
        hidden: scene.cuts.filter((cut) => cut.hidden).map((cut) => cut.id)
      }]))
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
  }

  function applySavedEdits() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return; }
    if (!saved?.scenes) return;
    const savedVersion = Number(saved.version || 1);
    for (const scene of scenes) {
      const sceneSaved = saved.scenes[String(scene.n)];
      if (!sceneSaved) continue;
      if (sceneSaved.actions) {
        for (const cut of scene.cuts) {
          const isMigratedEndingCut = savedVersion < 2 && STRUCTURAL_ACTION_MIGRATIONS.has(cut.id);
          if (!isMigratedEndingCut && Object.prototype.hasOwnProperty.call(sceneSaved.actions, cut.id)) {
            cut.action = sceneSaved.actions[cut.id];
          }
        }
      }
      const hidden = new Set(Array.isArray(sceneSaved.hidden) ? sceneSaved.hidden : []);
      for (const cut of scene.cuts) cut.hidden = hidden.has(cut.id);
      if (Array.isArray(sceneSaved.order)) {
        const rank = new Map(sceneSaved.order.map((id, index) => [id, index]));
        scene.cuts.sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999));
      }
    }
    if (savedVersion < 2) saveEdits();
  }

  function makeButton(label, onClick, disabled = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener('click', onClick);
    return button;
  }

  function cueType(line) {
    const text = line.trim();
    if (/^(산타|루돌프|혁|지민)$/.test(text)) return 'dialogue';
    if (text === '짧은 자막') return 'caption';
    if ((text.includes('나레이션') || text.includes('목소리')) && text.length < 48) return 'narration';
    return '';
  }

  function appendLine(container, className, text) {
    const line = document.createElement('span');
    line.className = `scriptLine ${className}`;
    line.textContent = text;
    container.appendChild(line);
    return line;
  }

  function formatScriptText(element, text) {
    if (!element) return;
    element.replaceChildren();
    let mode = '';
    for (const rawLine of String(text || '').split('\n')) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        const gap = document.createElement('span');
        gap.className = 'scriptGap';
        element.appendChild(gap);
        mode = '';
        continue;
      }
      const nextMode = cueType(trimmed);
      if (nextMode) {
        mode = nextMode;
        const cueClass = nextMode === 'narration' ? 'speakerLine narrationCue' : nextMode === 'caption' ? 'speakerLine captionCue' : 'speakerLine';
        appendLine(element, cueClass, trimmed);
        continue;
      }
      if (mode) {
        const lineClass = mode === 'narration' ? 'dialogueLine narrationLine' : mode === 'caption' ? 'dialogueLine captionLine' : 'dialogueLine';
        const line = appendLine(element, lineClass, '');
        const aside = trimmed.match(/^\(([^)]+)\)\s*(.*)$/);
        if (aside) {
          const direction = document.createElement('span');
          direction.className = 'dialogueAside';
          direction.textContent = `(${aside[1]})`;
          line.appendChild(direction);
          if (aside[2]) line.append(` ${aside[2]}`);
        } else {
          line.textContent = trimmed;
        }
      } else {
        appendLine(element, 'directionLine', rawLine);
      }
    }
  }

  function moveCut(sceneNo, cutId, delta) {
    const scene = findScene(sceneNo);
    if (!scene) return;
    const index = scene.cuts.findIndex((cut) => cut.id === cutId);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= scene.cuts.length) return;
    const [cut] = scene.cuts.splice(index, 1);
    scene.cuts.splice(next, 0, cut);
    saveEdits();
    rerender(cutId);
  }

  function toggleCutHidden(sceneNo, cutId) {
    const cut = findCut(sceneNo, cutId);
    if (!cut) return;
    cut.hidden = !cut.hidden;
    saveEdits();
    rerender(cutId);
  }

  function decorateEditor() {
    const editButton = document.getElementById('editStoryboardBtn');
    const exportButton = document.getElementById('exportStoryboardBtn');
    const resetButton = document.getElementById('resetS07Btn');
    if (editButton) {
      editButton.textContent = editMode ? '편집 완료' : '편집';
      editButton.classList.toggle('active', editMode);
      editButton.setAttribute('aria-pressed', String(editMode));
    }
    if (exportButton) exportButton.hidden = !editMode;
    if (resetButton) resetButton.hidden = !editMode;

    if (editMode) {
      const book = document.getElementById('book');
      const notice = document.createElement('div');
      notice.className = 'editNotice';
      notice.innerHTML = '<b>온라인 편집 모드</b><br>지문은 직접 눌러 수정하고, 각 컷의 버튼으로 순서를 바꾸세요. 변경 내용은 이 브라우저에 자동 저장됩니다.';
      book.prepend(notice);
    }

    for (const spread of document.querySelectorAll('.spread')) {
      const id = spread.querySelector('.visualTag')?.textContent?.trim();
      const eyebrow = spread.querySelector('.eyebrow')?.textContent || '';
      const sceneNo = Number(eyebrow.match(/SCENE\s+(\d+)/)?.[1]);
      const scene = findScene(sceneNo);
      const cut = findCut(sceneNo, id);
      if (!scene || !cut) continue;
      spread.dataset.cut = id;
      spread.hidden = Boolean(cut.hidden && !editMode);
      spread.classList.toggle('cutHidden', Boolean(cut.hidden));
      const visual = spread.querySelector('.visual');
      visual?.querySelector('.cinematicCaption')?.remove();
      if (cut.overlayCaption && visual) {
        const caption = document.createElement('div');
        caption.className = 'cinematicCaption';
        caption.textContent = cut.overlayCaption;
        visual.appendChild(caption);
      }
      const page = spread.querySelector('.page');
      const formattedAction = page.querySelector('.action');
      if (!editMode) {
        formatScriptText(formattedAction, cut.action || '');
        continue;
      }
      const index = scene.cuts.findIndex((item) => item.id === id);
      const controls = document.createElement('div');
      controls.className = 'cutEditTools';
      const hideButton = makeButton(cut.hidden ? '컷 복원' : '컷 숨기기', () => toggleCutHidden(sceneNo, id));
      hideButton.classList.add(cut.hidden ? 'restoreCutBtn' : 'hideCutBtn');
      controls.append(
        makeButton('↑ 앞 컷으로', () => moveCut(sceneNo, id, -1), index === 0),
        makeButton('↓ 뒤 컷으로', () => moveCut(sceneNo, id, 1), index === scene.cuts.length - 1),
        hideButton
      );
      page.prepend(controls);

      let label = page.querySelector('.label');
      let action = page.querySelector('.action');
      if (!label) {
        label = document.createElement('div');
        label.className = 'label';
        page.insertBefore(label, page.querySelector('.folio'));
      }
      label.textContent = '편집 지문';
      if (!action) {
        action = document.createElement('p');
        action.className = 'action';
        page.insertBefore(action, page.querySelector('.folio'));
      }
      action.textContent = cut.action || '';
      action.contentEditable = 'true';
      action.spellcheck = false;
      action.dataset.placeholder = '이 컷의 지문이나 대사를 입력하세요.';
      action.addEventListener('input', () => {
        cut.action = action.innerText.replace(/\n+$/, '');
        saveEdits();
      });
    }
  }

  function rerender(focusId) {
    render();
    document.querySelectorAll('.sceneIntro').forEach((node) => io.observe(node));
    decorateEditor();
    if (focusId) requestAnimationFrame(() => document.querySelector(`[data-cut="${CSS.escape(focusId)}"]`)?.scrollIntoView({ block: 'center' }));
  }

  window.toggleStoryboardEdit = () => {
    editMode = !editMode;
    rerender();
  };

  window.exportStoryboardEdits = () => {
    const payload = saveEdits();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `우울폭주_콘티북_편집_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  window.resetSceneSeven = () => {
    if (!confirm('S07의 컷 순서와 지문을 공개 원본 상태로 되돌릴까요?')) return;
    const original = originalScenes.find((scene) => scene.n === 7);
    const current = findScene(7);
    if (!original || !current) return;
    current.cuts = JSON.parse(JSON.stringify(original.cuts));
    saveEdits();
    rerender('S07-I01');
  };

  applySavedEdits();
  rerender();
})();
