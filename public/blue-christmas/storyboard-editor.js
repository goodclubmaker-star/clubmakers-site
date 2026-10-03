(() => {
  const STORAGE_KEY = 'blue-christmas-storyboard-edits-v1';
  const PRODUCTION_DB = 'blue-christmas-production-v1';
  const SAMPLE_STORE = 'samples';
  const STRUCTURAL_ACTION_MIGRATIONS = new Set(['S20-C10', 'S20-C11']);
  const originalScenes = JSON.parse(JSON.stringify(scenes));
  let editMode = false;
  let showHiddenCuts = false;
  let saveStatus = '';
  let productionDbPromise;
  const sampleObjectUrls = new Set();

  const style = document.createElement('style');
  style.textContent = `
    .editOnly[hidden]{display:none!important}
    .editNotice{margin:0 0 18px;padding:13px 16px;border:1px solid #5a6574;border-radius:8px;background:#151b25;color:#e9edf3;font-size:14px;line-height:1.55}
    .cutEditTools{display:flex;gap:7px;flex-wrap:wrap;margin:-2px 0 13px;padding-bottom:12px;border-bottom:1px dashed #b8ad9b}
    .cutEditTools button{border:1px solid #8e8371;border-radius:999px;background:#fffaf0;color:#25221d;padding:6px 10px;cursor:pointer;font-weight:700}
    .cutEditTools button:disabled{opacity:.35;cursor:not-allowed}
    .spread.cutHidden{outline:2px dashed #a44249;outline-offset:-2px;opacity:.58}
    .spread[hidden]{display:none!important}
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
    .tools .saveState{border-color:#47705c;color:#dff5e6}
    .tools .saveState.saved{background:#47705c;color:#fff}
    .videoStatusBadge{position:absolute;top:12px;right:12px;z-index:4;padding:7px 10px;border-radius:999px;background:#2f7658e8;color:#fff;font:800 11px ui-monospace,monospace;letter-spacing:.04em;box-shadow:0 3px 12px #0007}
    .sceneProgress{display:inline-flex;margin-top:9px;padding:5px 9px;border:1px solid #566170;border-radius:999px;color:#cfd7e2;font:700 11px ui-monospace,monospace}
    .sceneProgress.complete{border-color:#69a884;background:#2f765844;color:#dcf8e8}
    .sampleSection{padding:14px 18px 16px;background:#11161e;color:#eef2f7;border-top:1px solid #303947}
    .sampleHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
    .sampleHeader b{font-size:13px;letter-spacing:.04em}
    .sampleHeader span{color:#98a5b5;font-size:11px}
    .sampleTrack{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}
    .sampleCard{position:relative;flex:0 0 min(270px,72vw);border:1px solid #485363;border-radius:7px;overflow:hidden;background:#090d12}
    .sampleCard img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#05070a;cursor:zoom-in}
    .sampleNo{position:absolute;top:6px;left:6px;padding:4px 7px;border-radius:999px;background:#090d12d9;color:#fff;font:800 10px ui-monospace,monospace}
    .sampleName{padding:7px 9px;color:#b8c2cf;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sampleTools{display:flex;gap:5px;padding:0 7px 8px}
    .sampleTools button,.sampleUploadBtn{border:1px solid #536071;border-radius:999px;background:#1c2430;color:#edf1f6;padding:5px 8px;cursor:pointer;font-size:11px}
    .sampleTools button:disabled{opacity:.3;cursor:not-allowed}
    .sampleEmpty{padding:18px;border:1px dashed #46515f;border-radius:6px;color:#8794a5;text-align:center;font-size:12px}
    .cutEditTools .videoDoneBtn{border-color:#4c8063;color:#356149}
    .cutEditTools .videoDoneBtn.active{background:#356149;color:#fff}
    @media(max-width:700px){.editNotice{border-radius:0;margin-bottom:12px}.cutEditTools{margin-top:0}.action[contenteditable="true"]{min-height:120px}.videoStatusBadge{top:8px;right:8px}.sampleSection{padding:12px 11px}.sceneProgress{margin-top:6px}}
    @media print{.editNotice,.cutEditTools,.editorBtn,.editOnly{display:none!important}}
  `;
  document.head.appendChild(style);

  function findScene(sceneNo) {
    return scenes.find((scene) => scene.n === Number(sceneNo));
  }

  function findCut(sceneNo, cutId) {
    return findScene(sceneNo)?.cuts.find((cut) => cut.id === cutId);
  }

  function normalizedVisualOrder(scene, savedOrder) {
    const validIds = new Set(scene.cuts.map((cut) => cut.id));
    const order = Array.isArray(savedOrder)
      ? savedOrder.filter((id, index, items) => validIds.has(id) && items.indexOf(id) === index)
      : [];
    for (const cut of scene.cuts) {
      if (!order.includes(cut.id)) order.push(cut.id);
    }
    return order;
  }

  function ensureVisualOrder(scene) {
    scene.visualOrder = normalizedVisualOrder(scene, scene.visualOrder);
    return scene.visualOrder;
  }

  function visualCutAt(scene, index) {
    const visualId = ensureVisualOrder(scene)[index];
    return scene.cuts.find((cut) => cut.id === visualId) || scene.cuts[index];
  }

  function writeSavedPayload(payload) {
    const serialized = JSON.stringify(payload);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      if (localStorage.getItem(STORAGE_KEY) === serialized) return 'browser';
    } catch {}
    try {
      sessionStorage.setItem(STORAGE_KEY, serialized);
      if (sessionStorage.getItem(STORAGE_KEY) === serialized) return 'session';
    } catch {}
    return '';
  }

  function readSavedPayload() {
    const storages = [];
    try { storages.push(localStorage); } catch {}
    try { storages.push(sessionStorage); } catch {}
    for (const storage of storages) {
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  function openProductionDb() {
    if (productionDbPromise) return productionDbPromise;
    productionDbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open(PRODUCTION_DB, 1);
      request.addEventListener('upgradeneeded', () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SAMPLE_STORE)) {
          const store = db.createObjectStore(SAMPLE_STORE, { keyPath: 'id' });
          store.createIndex('cutId', 'cutId', { unique: false });
        }
      });
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error));
    });
    return productionDbPromise;
  }

  async function listSamples(cutId) {
    const db = await openProductionDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SAMPLE_STORE, 'readonly');
      const request = tx.objectStore(SAMPLE_STORE).index('cutId').getAll(cutId);
      request.addEventListener('success', () => resolve(request.result.sort((a, b) => a.order - b.order)));
      request.addEventListener('error', () => reject(request.error));
    });
  }

  async function addSampleFiles(cutId, files) {
    const accepted = [...files].filter((file) => file.type.startsWith('image/'));
    if (!accepted.length) return;
    const current = await listSamples(cutId);
    const db = await openProductionDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SAMPLE_STORE, 'readwrite');
      const store = tx.objectStore(SAMPLE_STORE);
      accepted.forEach((file, index) => store.put({
        id: `${cutId}-${Date.now()}-${index}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
        cutId,
        order: current.length + index,
        name: file.name,
        type: file.type,
        blob: file,
        createdAt: new Date().toISOString(),
      }));
      tx.addEventListener('complete', resolve);
      tx.addEventListener('error', () => reject(tx.error));
    });
  }

  async function saveSampleOrder(samples) {
    const db = await openProductionDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SAMPLE_STORE, 'readwrite');
      const store = tx.objectStore(SAMPLE_STORE);
      samples.forEach((sample, order) => store.put({ ...sample, order }));
      tx.addEventListener('complete', resolve);
      tx.addEventListener('error', () => reject(tx.error));
    });
  }

  async function deleteSample(sampleId) {
    const db = await openProductionDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SAMPLE_STORE, 'readwrite');
      tx.objectStore(SAMPLE_STORE).delete(sampleId);
      tx.addEventListener('complete', resolve);
      tx.addEventListener('error', () => reject(tx.error));
    });
  }

  function releaseSampleObjectUrls() {
    for (const url of sampleObjectUrls) URL.revokeObjectURL(url);
    sampleObjectUrls.clear();
  }

  function saveEdits(announce = false) {
    const payload = {
      version: 5,
      savedAt: new Date().toISOString(),
      scenes: Object.fromEntries(scenes.map((scene) => [scene.n, {
        visualOrder: ensureVisualOrder(scene),
        actions: Object.fromEntries(scene.cuts.map((cut) => [cut.id, cut.action || ''])),
        hidden: scene.cuts.filter((cut) => cut.hidden).map((cut) => cut.id),
        videoProduced: scene.cuts.filter((cut) => cut.videoProduced).map((cut) => cut.id)
      }]))
    };
    const storage = writeSavedPayload(payload);
    if (announce) {
      saveStatus = storage === 'browser' ? '저장됨' : storage === 'session' ? '세션 저장됨' : '저장 실패 · 백업 필요';
      updateSaveButton();
    }
    return payload;
  }

  function applySavedEdits() {
    const saved = readSavedPayload();
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
      const produced = new Set(Array.isArray(sceneSaved.videoProduced) ? sceneSaved.videoProduced : []);
      for (const cut of scene.cuts) cut.videoProduced = produced.has(cut.id);
      // v1-v3 stored the order of whole cards.  Migrate that order into an
      // image-only sequence so the original scenario slots never move.
      scene.visualOrder = normalizedVisualOrder(
        scene,
        Array.isArray(sceneSaved.visualOrder) ? sceneSaved.visualOrder : sceneSaved.order
      );
    }
    if (savedVersion < 4) saveEdits();
  }

  function updateSaveButton() {
    const button = document.getElementById('saveStoryboardBtn');
    if (!button) return;
    button.textContent = saveStatus || '저장';
    button.classList.toggle('saved', saveStatus === '저장됨' || saveStatus === '세션 저장됨');
  }

  function importStoryboardEdits(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      try {
        const imported = JSON.parse(String(reader.result || ''));
        if (!imported?.scenes) throw new Error('invalid storyboard backup');
        const storage = writeSavedPayload(imported);
        if (!storage) throw new Error('storage unavailable');
        location.reload();
      } catch {
        alert('백업 파일을 읽지 못했습니다. 콘티북에서 내려받은 JSON 파일인지 확인해 주세요.');
      }
    });
    reader.readAsText(file);
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
    const visualOrder = ensureVisualOrder(scene);
    [visualOrder[index], visualOrder[next]] = [visualOrder[next], visualOrder[index]];
    saveEdits();
    rerender(scene.cuts[next].id);
  }

  function renderVisualForSlot(visual, slotCut, visualCut) {
    if (!visual || !visualCut) return;
    let image = visual.querySelector('img');
    let missing = visual.querySelector('.missing');
    if (visualCut.img) {
      if (!image) {
        image = document.createElement('img');
        image.loading = 'lazy';
        image.addEventListener('click', () => openImage(image.src));
        visual.appendChild(image);
      }
      image.setAttribute('src', encodeURI(visualCut.img));
      image.alt = slotCut.id;
      missing?.remove();
    } else {
      image?.remove();
      if (!missing) {
        missing = document.createElement('div');
        missing.className = 'missing';
        visual.appendChild(missing);
      }
      missing.textContent = '이미지 미제작';
    }
    visual.dataset.visualSource = visualCut.id;
  }

  function toggleCutHidden(sceneNo, cutId) {
    const cut = findCut(sceneNo, cutId);
    if (!cut) return;
    cut.hidden = !cut.hidden;
    saveEdits();
    rerender(cutId);
  }

  function toggleVideoProduced(sceneNo, cutId) {
    const cut = findCut(sceneNo, cutId);
    if (!cut) return;
    cut.videoProduced = !cut.videoProduced;
    saveEdits();
    rerender(cutId);
  }

  async function moveSample(cutId, index, delta) {
    const samples = await listSamples(cutId);
    const next = index + delta;
    if (next < 0 || next >= samples.length) return;
    [samples[index], samples[next]] = [samples[next], samples[index]];
    await saveSampleOrder(samples);
    rerender(cutId);
  }

  async function renderSamplesForCut(spread, cut) {
    const page = spread.querySelector('.page');
    if (!page) return;
    const section = document.createElement('section');
    section.className = 'sampleSection';
    section.innerHTML = '<div class="sampleHeader"><b>영상 제작 샘플</b><span>불러오는 중…</span></div>';
    spread.insertBefore(section, page);
    try {
      const samples = await listSamples(cut.id);
      if (!section.isConnected) return;
      if (!samples.length && !editMode) {
        section.remove();
        return;
      }
      section.replaceChildren();
      const header = document.createElement('div');
      header.className = 'sampleHeader';
      const title = document.createElement('b');
      title.textContent = '영상 제작 샘플';
      const count = document.createElement('span');
      count.textContent = `${samples.length}장 · 표시 순서대로`;
      header.append(title, count);
      if (editMode) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.hidden = true;
        input.addEventListener('change', async () => {
          try {
            await addSampleFiles(cut.id, input.files || []);
            rerender(cut.id);
          } catch {
            alert('샘플 이미지를 저장하지 못했습니다. 파일 크기나 브라우저 저장 공간을 확인해 주세요.');
          }
        });
        const upload = document.createElement('button');
        upload.type = 'button';
        upload.className = 'sampleUploadBtn';
        upload.textContent = '＋ 샘플 이미지 올리기';
        upload.addEventListener('click', () => input.click());
        header.append(input, upload);
      }
      section.appendChild(header);
      if (!samples.length) {
        const empty = document.createElement('div');
        empty.className = 'sampleEmpty';
        empty.textContent = '아직 등록된 영상 제작 샘플이 없습니다.';
        section.appendChild(empty);
        return;
      }
      const track = document.createElement('div');
      track.className = 'sampleTrack';
      samples.forEach((sample, index) => {
        const card = document.createElement('article');
        card.className = 'sampleCard';
        const url = URL.createObjectURL(sample.blob);
        sampleObjectUrls.add(url);
        const image = document.createElement('img');
        image.src = url;
        image.alt = `${cut.id} 샘플 ${index + 1}`;
        image.addEventListener('click', () => openImage(url));
        const number = document.createElement('span');
        number.className = 'sampleNo';
        number.textContent = `SAMPLE ${String(index + 1).padStart(2, '0')}`;
        const name = document.createElement('div');
        name.className = 'sampleName';
        name.textContent = sample.name;
        card.append(image, number, name);
        if (editMode) {
          const tools = document.createElement('div');
          tools.className = 'sampleTools';
          tools.append(
            makeButton('←', () => moveSample(cut.id, index, -1), index === 0),
            makeButton('→', () => moveSample(cut.id, index, 1), index === samples.length - 1),
            makeButton('삭제', async () => {
              if (!confirm('이 샘플 이미지를 목록에서 삭제할까요?')) return;
              await deleteSample(sample.id);
              rerender(cut.id);
            })
          );
          card.appendChild(tools);
        }
        track.appendChild(card);
      });
      section.appendChild(track);
    } catch {
      if (!section.isConnected) return;
      section.querySelector('span').textContent = '브라우저 저장소 사용 불가';
    }
  }

  function decorateEditor() {
    const editButton = document.getElementById('editStoryboardBtn');
    const exportButton = document.getElementById('exportStoryboardBtn');
    const resetButton = document.getElementById('resetS07Btn');
    const tools = document.querySelector('.tools');
    let saveButton = document.getElementById('saveStoryboardBtn');
    if (!saveButton && tools) {
      saveButton = document.createElement('button');
      saveButton.id = 'saveStoryboardBtn';
      saveButton.className = 'editorBtn editOnly saveState';
      saveButton.type = 'button';
      saveButton.addEventListener('click', () => saveEdits(true));
      tools.insertBefore(saveButton, exportButton || tools.firstChild);
    }
    let importButton = document.getElementById('importStoryboardBtn');
    if (!importButton && tools) {
      importButton = document.createElement('button');
      importButton.id = 'importStoryboardBtn';
      importButton.className = 'editorBtn editOnly';
      importButton.type = 'button';
      importButton.textContent = '백업 불러오기';
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'application/json,.json';
      fileInput.hidden = true;
      fileInput.addEventListener('change', () => importStoryboardEdits(fileInput.files?.[0]));
      importButton.addEventListener('click', () => fileInput.click());
      tools.insertBefore(fileInput, exportButton || tools.firstChild);
      tools.insertBefore(importButton, exportButton || tools.firstChild);
    }
    let hiddenCutsButton = document.getElementById('showHiddenCutsBtn');
    if (!hiddenCutsButton && tools) {
      hiddenCutsButton = document.createElement('button');
      hiddenCutsButton.id = 'showHiddenCutsBtn';
      hiddenCutsButton.className = 'editorBtn editOnly';
      hiddenCutsButton.type = 'button';
      hiddenCutsButton.addEventListener('click', () => {
        showHiddenCuts = !showHiddenCuts;
        rerender();
      });
      tools.insertBefore(hiddenCutsButton, exportButton || tools.firstChild);
    }
    const hiddenCutCount = scenes.reduce(
      (count, scene) => count + scene.cuts.filter((cut) => cut.hidden).length,
      0
    );
    if (editButton) {
      editButton.textContent = editMode ? '편집 완료' : '편집';
      editButton.classList.toggle('active', editMode);
      editButton.setAttribute('aria-pressed', String(editMode));
    }
    if (exportButton) exportButton.hidden = !editMode;
    if (resetButton) resetButton.hidden = !editMode;
    if (saveButton) {
      saveButton.hidden = !editMode;
      updateSaveButton();
    }
    if (importButton) importButton.hidden = !editMode;
    if (hiddenCutsButton) {
      hiddenCutsButton.hidden = !editMode || hiddenCutCount === 0;
      hiddenCutsButton.textContent = showHiddenCuts
        ? `숨긴 컷 닫기 (${hiddenCutCount})`
        : `숨긴 컷 보기 (${hiddenCutCount})`;
      hiddenCutsButton.classList.toggle('active', showHiddenCuts);
    }

    if (editMode) {
      const book = document.getElementById('book');
      const notice = document.createElement('div');
      notice.className = 'editNotice';
      notice.innerHTML = '<b>온라인 제작 모드</b><br><b>앞/뒤 컷</b>은 이미지만 이동하며 원본 시나리오 순서는 고정됩니다. 영상 완료·지문·숨김은 자동 저장됩니다. <b>샘플 이미지</b>는 해당 브라우저에 저장되고 표시 순서를 바꿀 수 있습니다.';
      book.prepend(notice);
    }

    for (const scene of scenes) {
      const intro = document.getElementById(`scene-${scene.n}`);
      if (!intro) continue;
      const done = scene.cuts.filter((cut) => !cut.hidden && cut.videoProduced).length;
      const visible = scene.cuts.filter((cut) => !cut.hidden).length;
      const progress = document.createElement('span');
      progress.className = `sceneProgress${visible > 0 && done === visible ? ' complete' : ''}`;
      progress.textContent = `VIDEO ${done} / ${visible}`;
      intro.querySelector('div:last-child')?.appendChild(progress);
    }

    for (const spread of document.querySelectorAll('.spread')) {
      const id = spread.querySelector('.visualTag')?.textContent?.trim();
      const eyebrow = spread.querySelector('.eyebrow')?.textContent || '';
      const sceneNo = Number(eyebrow.match(/SCENE\s+(\d+)/)?.[1]);
      const scene = findScene(sceneNo);
      const cut = findCut(sceneNo, id);
      if (!scene || !cut) continue;
      spread.dataset.cut = id;
      const shouldHideCut = Boolean(cut.hidden && (!editMode || !showHiddenCuts));
      spread.hidden = shouldHideCut;
      spread.style.display = shouldHideCut ? 'none' : '';
      spread.classList.toggle('cutHidden', Boolean(cut.hidden));
      const visual = spread.querySelector('.visual');
      const index = scene.cuts.findIndex((item) => item.id === id);
      const visualCut = visualCutAt(scene, index);
      renderVisualForSlot(visual, cut, visualCut);
      visual?.querySelector('.videoStatusBadge')?.remove();
      if (cut.videoProduced && visual) {
        const badge = document.createElement('span');
        badge.className = 'videoStatusBadge';
        badge.textContent = 'VIDEO ✓';
        visual.appendChild(badge);
      }
      visual?.querySelector('.cinematicCaption')?.remove();
      if (visualCut?.overlayCaption && visual) {
        const caption = document.createElement('div');
        caption.className = 'cinematicCaption';
        caption.textContent = visualCut.overlayCaption;
        visual.appendChild(caption);
      }
      const page = spread.querySelector('.page');
      renderSamplesForCut(spread, cut);
      const formattedAction = page.querySelector('.action');
      if (!editMode) {
        formatScriptText(formattedAction, cut.action || '');
        continue;
      }
      const controls = document.createElement('div');
      controls.className = 'cutEditTools';
      const hideButton = makeButton(cut.hidden ? '컷 복원' : '컷 숨기기', () => toggleCutHidden(sceneNo, id));
      hideButton.classList.add(cut.hidden ? 'restoreCutBtn' : 'hideCutBtn');
      const videoButton = makeButton(cut.videoProduced ? '✓ 영상 제작됨' : '영상 제작 완료', () => toggleVideoProduced(sceneNo, id));
      videoButton.classList.add('videoDoneBtn');
      videoButton.classList.toggle('active', Boolean(cut.videoProduced));
      controls.append(
        makeButton('↑ 앞 컷으로', () => moveCut(sceneNo, id, -1), index === 0),
        makeButton('↓ 뒤 컷으로', () => moveCut(sceneNo, id, 1), index === scene.cuts.length - 1),
        videoButton,
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
    releaseSampleObjectUrls();
    render();
    document.querySelectorAll('.sceneIntro').forEach((node) => io.observe(node));
    decorateEditor();
    if (focusId) requestAnimationFrame(() => document.querySelector(`[data-cut="${CSS.escape(focusId)}"]`)?.scrollIntoView({ block: 'center' }));
  }

  window.toggleStoryboardEdit = () => {
    if (editMode) saveEdits(true);
    editMode = !editMode;
    if (!editMode) showHiddenCuts = false;
    rerender();
  };

  window.exportStoryboardEdits = () => {
    const payload = saveEdits(true);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `우울폭주_콘티북_편집_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  window.addEventListener('pagehide', () => saveEdits());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveEdits();
  });

  window.resetSceneSeven = () => {
    if (!confirm('S07의 컷 순서와 지문을 공개 원본 상태로 되돌릴까요?')) return;
    const original = originalScenes.find((scene) => scene.n === 7);
    const current = findScene(7);
    if (!original || !current) return;
    current.cuts = JSON.parse(JSON.stringify(original.cuts));
    current.visualOrder = current.cuts.map((cut) => cut.id);
    saveEdits();
    rerender('S07-I01');
  };

  applySavedEdits();
  rerender();
})();
