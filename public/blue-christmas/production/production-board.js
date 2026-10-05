(() => {
  'use strict';

  const STORAGE_KEY = 'blue-christmas-production-board-v1';
  const STORY_STORAGE_KEY = 'blue-christmas-storyboard-edits-v1';
  const DB_NAME = 'blue-christmas-production-board-files-v1';
  const STORE_NAME = 'samples';
  const STATUSES = [
    ['ready', '준비'],
    ['keyframe', '키프레임 확정'],
    ['generating', '영상 제작중'],
    ['video', '영상 완료'],
    ['approved', '최종 승인']
  ];
  const LOCATION_DEFS = [
    { id: 'dept-front', name: '백화점 전면 · 도심 광장', hint: 'S03 · S11 · S16 · S19 / 전광판·연말 군중·백화점 정면' },
    { id: 'stall', name: '지하도 입구 · 혁의 가판대', hint: 'S05 · S07 · S13 / 가판대·기둥·보행 동선' },
    { id: 'alley', name: '막다른 골목 · 주택가', hint: 'S08 · S13 · S14 / 추격·대치·한적한 골목' },
    { id: 'underpass', name: '잠수교 지하통로', hint: 'S15 · S16 / 기둥 사이 트래킹·울리는 대화' },
    { id: 'terrace', name: '백화점 뒤 서비스 테라스 · 벤치', hint: 'S10 · S20 · S21 · S23 / 같은 벤치와 거리 관계 유지' },
    { id: 'hanriver', name: '한강 조망 언덕', hint: 'S06 · S09 / 18mm 원경·서울과 한강 조망' },
    { id: 'breakroom', name: '백화점 휴게실', hint: 'S12 / 눈부신 창문·실루엣·실내' },
    { id: 'playground', name: '놀이터', hint: 'S18 / 카메라와 출력물의 시대별 행렬' },
    { id: 'rooftop', name: '빌딩 옥상', hint: 'S01 · S22 · S24 / 첫 장면과 엔딩의 공간 연결' },
    { id: 'city', name: '서울 도심 몽타주 · 이동', hint: 'S01 · S04 · S16 · S17 / 명동·광화문·강남역의 빽빽한 흐름' },
    { id: 'space', name: '우주 · 타이틀 · 엔딩', hint: 'S02 · S24 · S25 / 별·소행성·타이틀·엔딩크레딧' }
  ];
  const PRODUCTION_LOCATION_ORDER = [
    'dept-front', 'terrace', 'breakroom',
    'stall', 'alley', 'underpass',
    'playground', 'hanriver', 'rooftop',
    'city', 'space'
  ];
  const LOCATION_MAP = Object.fromEntries(LOCATION_DEFS.map((item) => [item.id, item]));
  const STATUS_MAP = Object.fromEntries(STATUSES);
  const GENERATED_CLIPS = {
    'S03-C01': 'clips/S03-C01_generated_v001.mp4'
  };
  const PROMPT_OVERRIDES = {
    'S16-C02': `IMAGE-TO-VIDEO PROMPT
Create a 6-second cinematic image-to-video shot in winter Seoul, 2023, directly in front of the established Christmas department-store exterior from the location reference. Rudolf must keep exactly the same cute, round-bodied character design, face, aviator headgear, bulky winter outfit, colors, and proportions shown in the character reference.

Rudolf stands alone near the edge of the busy department-store plaza, holding the same old, worn, repeatedly folded paper street map with both hands. Christmas crowds stream past him without paying attention. He studies the map, turns it slightly as if the orientation is wrong, looks up toward the light-polluted sky but cannot see any stars, compares the department-store facade with the map, tilts his head in confusion, then takes two hesitant steps toward screen-left and stops because he is still lost.

Camera: begin in a medium-wide shot and make a slow lateral tracking move through soft foreground pedestrians while keeping Rudolf visually isolated near the center. Preserve screen direction. The department-store display, Christmas lights, wet pavement reflections, and distant traffic move only subtly. Continuous single shot, restrained limited animation, warm Christmas lights against a cold blue night, gently comic but lonely.

NEGATIVE PROMPT
No traffic island, no palace gate, no road-center staging, no cars passing close to Rudolf, no location change, no new character, no character redesign, no thin body, no altered costume, no clean or modern map, no map text becoming readable, no extra fingers, no morphing hands, no duplicated pedestrians, no melting architecture, no camera shake, no fast zoom, no fisheye distortion, no subtitles, no generated letters, no logo, no watermark, no style shift, no photorealistic or 3D CGI conversion.`
  };
  const objectUrls = new Set();
  let dbPromise;
  let state = loadState();
  let locationFilter = 'all';
  let searchText = '';

  function pad(value) { return String(value).padStart(2, '0'); }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function sceneId(sceneNo) { return `S${pad(sceneNo)}`; }

  function shotProfile(cut) {
    const text = `${cut.id} ${cut.img || ''} ${cut.title || ''} ${cut.action || ''}`.toLowerCase();
    if (/(final|bridge|pullback|sky|star|impact|title|ending|엔딩|타이틀|날아가는 풍선|하늘로)/.test(text)) return { rank: 60, id: 'transition', label: '전환·엔딩' };
    if (/(insert|detail|hands|feet|boots|suitcase|album|photo|camera|output|balloon|지도|사진|카메라|출력물|손|발|라이터|풍선)/.test(text)) return { rank: 50, id: 'insert', label: '인서트·디테일' };
    if (/(ots|reverse|question|conversation|reaction|closeup|close_up|대화|말한다|묻는다|소리친다|목소리)/.test(text)) return { rank: 40, id: 'performance', label: '연기·대화' };
    if (/(two.shot|rear_two|나란히|두 사람|둘이|함께|뒤따르는|따라가는)/.test(text)) return { rank: 30, id: 'two-shot', label: '투샷·동선' };
    if (/(master|wide|establishing|panorama|location|전경|원경|거리의 풍경|넓게 트인|한적한 공간|빌딩의 모습)/.test(text)) return { rank: 10, id: 'anchor', label: '공간 앵커' };
    return { rank: 20, id: 'action', label: '액션·연결' };
  }

  function environmentDirection(locationId) {
    return {
      'dept-front': 'Use the established Christmas department-store exterior. Keep the LED facade, seasonal trees, pedestrian density, wet-pavement reflections, and spatial geography stable.',
      terrace: 'Use the established quiet service terrace and bench. Keep the distance between the benches and the department-store service wall consistent.',
      breakroom: 'Use the established department-store break room. Preserve the bright window backlight and the simple staff-room geography.',
      stall: 'Use the established modest street stall by the underpass entrance. Preserve the pillars, stall bag, small accessories, and pedestrian route.',
      alley: 'Use the established separated residential alley or dead end. Keep it ordinary and slightly isolated, never a slum.',
      underpass: 'Use the established pedestrian underpass with repeating concrete pillars and warm practical lights. No cars inside the passage.',
      playground: 'Use the established nighttime playground and bench with restrained distant city lights.',
      hanriver: 'Use the established hillside view toward the Han River and Seoul skyline. Preserve the exact river and city geography.',
      rooftop: 'Use the established building rooftop and the same Seoul skyline. Preserve roof edges, access structures, and character scale.',
      city: 'Use a dense, bright Seoul night street with Christmas-season crowds and layered traffic, while keeping the featured character clearly readable.',
      space: 'Use the established deep-blue illustrated space, asteroid, star-field, and title-sequence visual language.'
    }[locationId] || 'Preserve the exact established location and spatial geography from the keyframe.';
  }

  function actionDirection(cut) {
    const text = `${cut.id} ${cut.action || ''}`;
    if (/지도/.test(text)) return 'Keep the paper map physically consistent. Let the character adjust or unfold it once, compare it with the surroundings, and react with restrained confusion; fingers and map folds must remain stable.';
    if (/풍선/.test(text)) return 'Animate the balloon with believable buoyancy, a gentle string delay, and light winter wind; keep its color, size, and position continuity exact.';
    if (/담배|라이터|불을 붙/.test(text)) return 'Use small, precise hand acting around the cigarette or lighter. Preserve bare-hand continuity where established and keep the flame brief and physically believable.';
    if (/쫓|도망|달려|뛰쳐/.test(text)) return 'Prioritize clear screen direction and readable pursuit action. Use one controlled tracking move; preserve every character and carried prop without deformation.';
    if (/걷|걸어|종종/.test(text)) return 'Animate a natural restrained walk with stable clothing, body proportions, carried props, and screen direction.';
    if (/말한다|묻|대화|목소리|\n산타|\n루돌프|\n혁|\n지민/.test(text)) return 'Treat dialogue as performance timing only: subtle eye-line, breath, and one small facial reaction. Do not generate subtitles or visible dialogue text.';
    if (/자동차|차가|전동차|오토바이/.test(text)) return 'Move vehicles on fixed paths with stable shapes and restrained motion blur; reflections may glide across the wet ground.';
    if (/별|우주|소행성|꽝/.test(text)) return 'Animate depth through layered star parallax and one clearly staged impact or transition while keeping silhouettes crisp.';
    return 'Animate only the action explicitly visible or described for this cut. Keep motion economical and readable, with no invented event.';
  }

  function videoPrompt(cut) {
    if (PROMPT_OVERRIDES[cut.id]) return PROMPT_OVERRIDES[cut.id];
    const shot = shotProfile(cut);
    const locationId = state?.cuts?.[cut.id]?.locationId || inferLocation(cut.sceneNo, cut.id);
    const locationName = LOCATION_MAP[locationId]?.name || cut.sceneTitle;
    const camera = {
      anchor: 'A very slow cinematic push-in with subtle natural parallax and a stable horizon.',
      action: 'A controlled cinematic tracking move that follows the action without camera shake.',
      'two-shot': 'A restrained lateral tracking move that preserves both characters and their screen direction.',
      performance: 'A stable medium close shot with only a subtle breathing push-in for the performance.',
      insert: 'A precise detail shot with a very slow macro push-in and shallow depth separation.',
      transition: 'A smooth, deliberate transition move with no sudden acceleration or camera shake.'
    }[shot.id];
    return `IMAGE-TO-VIDEO PROMPT\nCreate a 6-second cinematic image-to-video shot for ${cut.id}, set in winter Seoul, 2023. Use the provided keyframe as the absolute first-frame reference. Preserve the exact characters, faces, body proportions, costumes, props, architecture, composition, color palette, and hand-painted cinematic animation style.\n\nLOCATION\n${locationName}. ${environmentDirection(locationId)}\n\nSTORY ACTION\n${cut.action || 'Hold the scene with restrained natural environmental motion.'}\n\nMOTION DIRECTION\n${actionDirection(cut)} Add only subtle secondary motion appropriate to the image: breathing, gentle fabric or hair movement, soft practical-light variation, restrained background movement, and atmospheric depth.\n\nCAMERA\n${camera} Continuous single shot, no cut, no scene change. Keep the first-frame identity stable throughout.\n\nNEGATIVE PROMPT\nNo character redesign, no face change, no body-type change, no costume change, no missing or extra props, no extra limbs or fingers, no duplicated people, no morphing, no melting architecture, no new signs or readable text, no camera shake, no fast zoom, no fisheye distortion, no style shift, no photorealistic conversion, no 3D CGI conversion, no flicker, no watermark, no logo, no subtitles.`;
  }

  function sortStateForProduction(target) {
    const cuts = visibleStoryCuts();
    const byId = new Map(cuts.map((cut) => [cut.id, cut]));
    const storyOrder = new Map(cuts.map((cut, index) => [cut.id, index]));
    target.locationOrder = PRODUCTION_LOCATION_ORDER.filter((id) => LOCATION_MAP[id]);
    LOCATION_DEFS.forEach((location) => {
      if (!target.locationOrder.includes(location.id)) target.locationOrder.push(location.id);
      const ids = Object.keys(target.cuts).filter((cutId) => target.cuts[cutId]?.locationId === location.id && byId.has(cutId));
      ids.sort((leftId, rightId) => {
        const left = byId.get(leftId);
        const right = byId.get(rightId);
        const shotDiff = shotProfile(left).rank - shotProfile(right).rank;
        if (shotDiff) return shotDiff;
        if (left.sceneNo !== right.sceneNo) return left.sceneNo - right.sceneNo;
        return (storyOrder.get(leftId) || 0) - (storyOrder.get(rightId) || 0);
      });
      target.cutOrders[location.id] = ids;
    });
    target.version = 3;
    return target;
  }

  function inferLocation(sceneNo, cutId) {
    const numeric = Number((cutId.match(/(?:C|KF|I)(\d+)/i) || [])[1] || 1);
    if (cutId === 'S16-C02') return 'dept-front';
    if (sceneNo === 1) return numeric <= 3 ? 'rooftop' : 'city';
    if (sceneNo === 2 || sceneNo === 25) return 'space';
    if ([3, 11, 19].includes(sceneNo)) return 'dept-front';
    if (sceneNo === 4 || sceneNo === 17) return 'city';
    if ([5, 7].includes(sceneNo)) return 'stall';
    if ([6, 9].includes(sceneNo)) return 'hanriver';
    if (sceneNo === 8 || sceneNo === 14) return 'alley';
    if (sceneNo === 10 || [20, 21, 23].includes(sceneNo)) return 'terrace';
    if (sceneNo === 12) return 'breakroom';
    if (sceneNo === 13) return numeric <= 4 ? 'alley' : 'stall';
    if (sceneNo === 15) return 'underpass';
    if (sceneNo === 16) return /^(S16-C0[13]|S16-C04[ABC]?)$/i.test(cutId) ? 'city' : 'underpass';
    if (sceneNo === 18) return 'playground';
    if (sceneNo === 22) return 'rooftop';
    if (sceneNo === 24) return numeric <= 4 ? 'rooftop' : 'space';
    return 'city';
  }

  function visibleStoryCuts() {
    let storySaved = null;
    try { storySaved = JSON.parse(localStorage.getItem(STORY_STORAGE_KEY) || 'null'); } catch {}
    const savedScenes = storySaved?.scenes;
    const sceneSavedMap = new Map(
      Array.isArray(savedScenes)
        ? savedScenes.map((item) => [Number(item.n), item])
        : Object.entries(savedScenes || {}).map(([sceneNo, item]) => [Number(sceneNo), item])
    );
    return scenes.flatMap((scene) => {
      const saved = sceneSavedMap.get(scene.n);
      const hidden = new Set(saved?.hidden || []);
      const produced = new Set(saved?.videoProduced || []);
      const savedOrder = Array.isArray(saved?.visualOrder) ? saved.visualOrder : saved?.order;
      const source = Array.isArray(savedOrder)
        ? [...savedOrder.map((id) => scene.cuts.find((cut) => cut.id === id)).filter(Boolean), ...scene.cuts.filter((cut) => !savedOrder.includes(cut.id))]
        : scene.cuts;
      return source.filter((cut) => !hidden.has(cut.id)).map((cut) => ({
        ...cut,
        action: saved?.actions && Object.prototype.hasOwnProperty.call(saved.actions, cut.id) ? saved.actions[cut.id] : cut.action,
        videoProduced: produced.has(cut.id),
        sceneNo: scene.n,
        sceneTitle: scene.title
      }));
    });
  }

  function defaultState() {
    const cuts = {};
    const cutOrders = Object.fromEntries(LOCATION_DEFS.map((location) => [location.id, []]));
    visibleStoryCuts().forEach((cut) => {
      const locationId = inferLocation(cut.sceneNo, cut.id);
      cuts[cut.id] = { locationId, status: cut.videoProduced ? 'video' : 'ready', note: '' };
      cutOrders[locationId].push(cut.id);
    });
    return sortStateForProduction({ version: 3, locationOrder: PRODUCTION_LOCATION_ORDER.slice(), cutOrders, cuts });
  }

  function normalizeState(candidate) {
    const fresh = defaultState();
    if (!candidate || typeof candidate !== 'object') return fresh;
    const validLocations = new Set(LOCATION_DEFS.map((item) => item.id));
    fresh.locationOrder = Array.isArray(candidate.locationOrder)
      ? candidate.locationOrder.filter((id, index, list) => validLocations.has(id) && list.indexOf(id) === index)
      : fresh.locationOrder;
    LOCATION_DEFS.forEach((item) => { if (!fresh.locationOrder.includes(item.id)) fresh.locationOrder.push(item.id); });
    for (const [cutId, cutState] of Object.entries(candidate.cuts || {})) {
      if (!fresh.cuts[cutId]) continue;
      if (validLocations.has(cutState.locationId)) fresh.cuts[cutId].locationId = cutState.locationId;
      if (STATUS_MAP[cutState.status]) fresh.cuts[cutId].status = cutState.status;
      fresh.cuts[cutId].note = String(cutState.note || '');
    }
    fresh.cutOrders = Object.fromEntries(LOCATION_DEFS.map((item) => [item.id, []]));
    for (const location of LOCATION_DEFS) {
      const saved = Array.isArray(candidate.cutOrders?.[location.id]) ? candidate.cutOrders[location.id] : [];
      fresh.cutOrders[location.id] = saved.filter((id, index, list) => fresh.cuts[id]?.locationId === location.id && list.indexOf(id) === index);
    }
    for (const cut of visibleStoryCuts()) {
      const locationId = fresh.cuts[cut.id].locationId;
      if (!fresh.cutOrders[locationId].includes(cut.id)) fresh.cutOrders[locationId].push(cut.id);
    }
    fresh.version = Number(candidate.version || 1);
    if (fresh.version < 3) {
      if (fresh.cuts['S16-C02']?.locationId === 'city') fresh.cuts['S16-C02'].locationId = 'dept-front';
      return sortStateForProduction(fresh);
    }
    return fresh;
  }

  function loadState() {
    try { return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
    catch { return defaultState(); }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const flag = document.getElementById('saveFlag');
    if (flag) {
      flag.textContent = '저장됨';
      flag.classList.add('saved');
      clearTimeout(saveState.timer);
      saveState.timer = setTimeout(() => flag.classList.remove('saved'), 900);
    }
  }

  function allCutsById() { return new Map(visibleStoryCuts().map((cut) => [cut.id, cut])); }
  function orderedCuts(locationId) {
    const byId = allCutsById();
    return (state.cutOrders[locationId] || []).map((id) => byId.get(id)).filter(Boolean);
  }

  function locationProgress(locationId) {
    const ids = state.cutOrders[locationId] || [];
    const done = ids.filter((id) => ['video', 'approved'].includes(state.cuts[id]?.status)).length;
    const approved = ids.filter((id) => state.cuts[id]?.status === 'approved').length;
    return { total: ids.length, done, approved, percent: ids.length ? Math.round(done / ids.length * 100) : 0 };
  }

  function overallProgress() {
    const ids = Object.keys(state.cuts);
    const done = ids.filter((id) => ['video', 'approved'].includes(state.cuts[id]?.status)).length;
    const approved = ids.filter((id) => state.cuts[id]?.status === 'approved').length;
    return { total: ids.length, done, approved, percent: ids.length ? Math.round(done / ids.length * 100) : 0 };
  }

  function injectShell() {
    const storyHref = location.protocol === 'file:' ? '우울폭주_전체_콘티북_S01-S25.html' : '../';
    document.title = '우울폭주 성탄절 · 로케이션별 제작 콘티';
    document.body.className = 'productionBody';
    document.body.innerHTML = `
      <header class="prodTop">
        <div class="prodBrand"><b>우울폭주 성탄절 · 제작 콘티</b><span>LOCATION-BASED PRODUCTION BOARD</span></div>
        <div class="prodActions">
          <span id="saveFlag" class="saveFlag">자동 저장</span>
          <button type="button" onclick="productionBoard.applyRecommendedOrder()">추천 제작순서</button>
          <button type="button" onclick="productionBoard.exportData()">백업</button>
          <button type="button" onclick="productionBoard.importData()">불러오기</button>
          <a href="${storyHref}">스토리 콘티북</a>
        </div>
        <div class="progressHeader" id="progressHeader"></div>
        <div class="filterRow">
          <select id="locationFilter" aria-label="로케이션 필터"></select>
          <input id="productionSearch" type="search" placeholder="씬·컷·지문 검색" aria-label="제작 컷 검색">
          <button type="button" onclick="productionBoard.resetFilters()">전체 보기</button>
        </div>
      </header>
      <main class="productionBook" id="productionBook"></main>
      <div class="prodModal" id="prodModal" onclick="this.classList.remove('open')"><button type="button">×</button><img id="prodModalImg" alt="확대 이미지"></div>
      <input id="productionImport" type="file" accept="application/json" hidden>
    `;
    const style = document.createElement('style');
    style.textContent = `
      :root{--bg:#090d13;--panel:#121923;--panel2:#18212d;--ink:#eef2f6;--muted:#97a5b6;--line:#334151;--paper:#f4efe6;--paperInk:#1d2025;--amber:#ddb76d;--red:#c05b62;--green:#65a982;--blue:#6f9fcd}
      *{box-sizing:border-box}html{scroll-behavior:smooth}.productionBody{margin:0;background:var(--bg);color:var(--ink);font-family:"Noto Sans KR","Malgun Gothic",system-ui,sans-serif}.prodTop{position:sticky;top:0;z-index:40;padding:13px 18px 12px;background:#0d131ceF;border-bottom:1px solid var(--line);backdrop-filter:blur(14px)}.prodBrand{display:inline-flex;flex-direction:column;vertical-align:middle}.prodBrand b{font-size:18px}.prodBrand span{margin-top:3px;color:var(--muted);font:10px ui-monospace,monospace;letter-spacing:.12em}.prodActions{float:right;display:flex;align-items:center;gap:7px}.prodActions button,.prodActions a,.filterRow button{border:1px solid #4b5a6c;border-radius:999px;background:#182231;color:#eff3f7;padding:7px 11px;text-decoration:none;cursor:pointer;font-size:12px}.saveFlag{color:#8f9baa;font-size:11px}.saveFlag.saved{color:#8ed0a9}.progressHeader{clear:both;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding-top:12px;font-size:12px}.progressRail,.locationRail{height:7px;border-radius:99px;background:#283341;overflow:hidden}.progressRail i,.locationRail i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--amber),var(--green))}.filterRow{display:grid;grid-template-columns:minmax(200px,320px) minmax(180px,1fr) auto;gap:8px;margin-top:10px}.filterRow select,.filterRow input{min-width:0;border:1px solid #405064;border-radius:7px;background:#111923;color:#e8edf3;padding:8px 10px}.productionBook{max-width:1320px;margin:0 auto;padding:24px 18px 90px}.locationSection{margin-bottom:34px;scroll-margin-top:170px}.locationHead{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;margin-bottom:12px;padding:13px 14px;background:var(--panel);border:1px solid var(--line);border-radius:10px}.locationNo{color:var(--amber);font:800 20px ui-monospace,monospace}.locationHead h2{margin:0 0 3px;font-size:21px}.locationHint{color:var(--muted);font-size:12px}.locationStats{min-width:210px;text-align:right}.locationStats b{display:block;margin-bottom:6px;font:800 12px ui-monospace,monospace}.locationControls{display:flex;gap:5px;margin-top:8px;justify-content:flex-end}.iconBtn{width:29px;height:29px;padding:0;border:1px solid #48586a;border-radius:7px;background:#1b2634;color:#fff;cursor:pointer}.iconBtn:disabled{opacity:.25}.cutGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.productionCard{overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--panel);box-shadow:0 10px 28px #0004}.productionCard[data-status="video"],.productionCard[data-status="approved"]{border-color:#4e8367}.keyframe{position:relative;display:flex;align-items:center;justify-content:center;min-height:210px;background:#05080c}.keyframe img{display:block;width:100%;max-height:440px;object-fit:contain;cursor:zoom-in}.keyframe .missing{padding:80px 20px;color:#8491a1}.orderBadge,.statusBadge{position:absolute;top:10px;z-index:2;padding:6px 9px;border-radius:999px;font:800 10px ui-monospace,monospace;box-shadow:0 3px 10px #0008}.orderBadge{left:10px;background:#090d13dd;color:#fff}.statusBadge{right:10px;background:#263444e8;color:#dce4ed}.shotBadge{display:inline-flex;margin-top:6px;padding:4px 7px;border:1px solid #3b4a5d;border-radius:999px;color:#aebccc;background:#101720;font:800 9px ui-monospace,monospace;letter-spacing:.04em}.productionCard[data-status="keyframe"] .statusBadge{background:#7a5d2d}.productionCard[data-status="generating"] .statusBadge{background:#385e82}.productionCard[data-status="video"] .statusBadge{background:#397052}.productionCard[data-status="approved"] .statusBadge{background:#256746}.cardBody{padding:14px}.cardTop{display:flex;justify-content:space-between;gap:10px}.cutIdentity{font:800 13px ui-monospace,monospace;color:var(--amber)}.sceneTitle{margin-top:3px;color:var(--muted);font-size:12px}.moveTools{display:flex;gap:4px}.generatorTools{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.generatorTools a,.generatorTools button{border:1px solid #4a5b6e;border-radius:999px;background:#14202d;color:#edf3f8;padding:6px 9px;text-decoration:none;cursor:pointer;font:800 10px inherit}.generatedClip{margin-top:10px;border:1px solid #35465a;border-radius:7px;overflow:hidden;background:#05080c}.generatedClip video{display:block;width:100%;max-height:360px;background:#000}.generatedClip b{display:block;padding:7px 9px;color:#8ed0a9;font-size:11px}.scenario{margin:13px 0 0;padding:12px 13px;border-radius:7px;background:var(--paper);color:var(--paperInk);white-space:pre-line;font-size:13px;line-height:1.65;max-height:180px;overflow:auto}.scenario:empty{display:none}.productionFields{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.field{display:flex;flex-direction:column;gap:5px}.field.full{grid-column:1/-1}.field label{color:#9eabba;font-size:10px;font-weight:800;letter-spacing:.06em}.field select,.field textarea{width:100%;border:1px solid #3b4a5b;border-radius:6px;background:#0e151e;color:#edf1f5;padding:8px;font:12px inherit}.field textarea{min-height:66px;resize:vertical}.sampleSection{padding:0 14px 14px}.sampleTop{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.sampleTop b{font-size:12px}.sampleUpload{border:1px solid #53657a;border-radius:999px;background:#1a2634;color:#fff;padding:6px 9px;cursor:pointer;font-size:11px}.sampleTrack{display:flex;gap:8px;overflow-x:auto;padding-bottom:3px}.sampleCard{position:relative;flex:0 0 170px;overflow:hidden;border:1px solid #3b4959;border-radius:7px;background:#080c11}.sampleCard img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;cursor:zoom-in}.sampleIndex{position:absolute;top:5px;left:5px;padding:3px 6px;border-radius:99px;background:#080c11dd;font:800 9px ui-monospace,monospace}.sampleName{padding:6px 7px;color:#9da9b7;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sampleBtns{display:flex;gap:3px;padding:0 5px 6px}.sampleBtns button{flex:1;border:1px solid #405063;border-radius:5px;background:#17212d;color:#fff;padding:4px;cursor:pointer;font-size:10px}.sampleEmpty{width:100%;padding:14px;border:1px dashed #3f4d5d;border-radius:6px;color:#7f8c9c;text-align:center;font-size:11px}.prodModal{position:fixed;inset:0;z-index:90;display:none;align-items:center;justify-content:center;padding:22px;background:#030507f2}.prodModal.open{display:flex}.prodModal img{max-width:96vw;max-height:94vh;object-fit:contain}.prodModal button{position:absolute;right:16px;top:10px;border:0;background:none;color:#fff;font-size:36px}.emptyResult{padding:80px 20px;text-align:center;color:#8c99a8}
      .promptDetails{margin-top:8px;border:1px solid #33465a;border-radius:7px;background:#0b1119}.promptDetails summary{padding:8px 10px;color:#b8c6d5;cursor:pointer;font-size:11px;font-weight:800}.promptDetails pre{max-height:310px;margin:0;padding:11px;border-top:1px solid #2d3b4a;color:#dce6ef;white-space:pre-wrap;overflow:auto;font:11px/1.55 ui-monospace,"Malgun Gothic",monospace}
      @media(max-width:820px){.prodTop{padding:10px}.prodBrand b{font-size:15px}.prodActions{float:none;margin-top:9px;overflow-x:auto}.progressHeader{grid-template-columns:auto 1fr}.progressHeader .progressDetail{grid-column:1/-1}.filterRow{grid-template-columns:1fr auto}.filterRow select{grid-column:1/-1}.productionBook{padding:15px 0 60px}.locationSection{margin-bottom:22px}.locationHead{border-radius:0;border-left:0;border-right:0;grid-template-columns:auto 1fr;padding:12px 11px}.locationHead h2{font-size:17px}.locationStats{grid-column:1/-1;min-width:0;text-align:left}.locationControls{justify-content:flex-start}.cutGrid{display:block}.productionCard{border-radius:0;border-left:0;border-right:0;margin-bottom:12px}.keyframe{min-height:0}.keyframe img{max-height:none}.productionFields{grid-template-columns:1fr}.field.full{grid-column:auto}.scenario{max-height:none}.sampleCard{flex-basis:150px}}
      @media print{.prodTop{position:static}.prodActions,.filterRow,.locationControls,.moveTools,.productionFields,.sampleUpload,.sampleBtns{display:none!important}.productionBook{max-width:none;padding:0}.locationSection{break-before:page}.productionCard{break-inside:avoid}.cutGrid{display:block}.productionCard{margin-bottom:10mm}.keyframe img{max-height:120mm}.sampleSection{display:none}}
    `;
    document.head.appendChild(style);
  }

  function renderHeader() {
    const overall = overallProgress();
    document.getElementById('progressHeader').innerHTML = `<b>전체 영상 ${overall.done}/${overall.total}</b><div class="progressRail"><i style="width:${overall.percent}%"></i></div><span class="progressDetail">${overall.percent}% · 최종 승인 ${overall.approved}</span>`;
    const filter = document.getElementById('locationFilter');
    filter.innerHTML = `<option value="all">모든 로케이션</option>${state.locationOrder.map((id, index) => `<option value="${id}">${index + 1}. ${esc(LOCATION_MAP[id].name)}</option>`).join('')}`;
    filter.value = locationFilter;
  }

  function renderCard(cut, locationId, orderIndex) {
    const cutState = state.cuts[cut.id];
    const shot = shotProfile(cut);
    const locationOptions = state.locationOrder.map((id) => `<option value="${id}"${id === locationId ? ' selected' : ''}>${esc(LOCATION_MAP[id].name)}</option>`).join('');
    const statusOptions = STATUSES.map(([id, name]) => `<option value="${id}"${id === cutState.status ? ' selected' : ''}>${name}</option>`).join('');
    const clip = GENERATED_CLIPS[cut.id];
    const extension = (cut.img || '').split('.').pop() || 'png';
    const prompt = videoPrompt(cut);
    return `<article class="productionCard" id="production-${esc(cut.id)}" data-cut="${esc(cut.id)}" data-status="${esc(cutState.status)}">
      <div class="keyframe">
        <span class="orderBadge">${String(orderIndex + 1).padStart(2, '0')} · ${esc(cut.id)}</span>
        <span class="statusBadge">${esc(STATUS_MAP[cutState.status])}</span>
        ${cut.img ? `<img loading="lazy" src="${encodeURI(cut.img)}" alt="${esc(cut.id)} 키프레임" onclick="productionBoard.openImage(this.src)">` : '<div class="missing">키프레임 미제작</div>'}
      </div>
      <div class="cardBody">
        <div class="cardTop"><div><div class="cutIdentity">${sceneId(cut.sceneNo)} · ${esc(cut.id)}</div><div class="sceneTitle">${esc(cut.sceneTitle)}</div><span class="shotBadge">${esc(shot.label)}</span></div><div class="moveTools"><button class="iconBtn" type="button" title="앞으로" onclick="productionBoard.moveCut('${esc(locationId)}','${esc(cut.id)}',-1)"${orderIndex === 0 ? ' disabled' : ''}>↑</button><button class="iconBtn" type="button" title="뒤로" onclick="productionBoard.moveCut('${esc(locationId)}','${esc(cut.id)}',1)"${orderIndex === state.cutOrders[locationId].length - 1 ? ' disabled' : ''}>↓</button></div></div>
        <div class="generatorTools">${cut.img ? `<a href="${encodeURI(cut.img)}" download="${esc(cut.id)}_keyframe.${esc(extension)}">키프레임 다운로드</a>` : ''}<button type="button" onclick="productionBoard.copyPrompt('${esc(cut.id)}')">영상 프롬프트 복사</button>${clip ? `<a href="${encodeURI(clip)}" download>생성 영상 다운로드</a>` : ''}</div>
        <details class="promptDetails"><summary>이 컷의 영상 프롬프트 보기</summary><pre>${esc(prompt)}</pre></details>
        ${clip ? `<div class="generatedClip"><b>AI 생성 영상 · ${esc(cut.id)}</b><video controls playsinline preload="metadata" src="${encodeURI(clip)}"></video></div>` : ''}
        <div class="scenario">${esc(cut.action || '')}</div>
        <div class="productionFields">
          <div class="field"><label>제작 단계</label><select onchange="productionBoard.setStatus('${esc(cut.id)}',this.value)">${statusOptions}</select></div>
          <div class="field"><label>로케이션 이동</label><select onchange="productionBoard.changeLocation('${esc(cut.id)}',this.value)">${locationOptions}</select></div>
          <div class="field full"><label>제작 메모</label><textarea placeholder="모델, 프롬프트, 모션, 재생성 사유 등" oninput="productionBoard.setNote('${esc(cut.id)}',this.value)">${esc(cutState.note)}</textarea></div>
        </div>
      </div>
      <div class="sampleSection" data-samples-for="${esc(cut.id)}"><div class="sampleTop"><b>제작 샘플 · 순서대로</b><button class="sampleUpload" type="button" onclick="productionBoard.uploadSamples('${esc(cut.id)}')">+ 이미지 올리기</button></div><div class="sampleTrack"><div class="sampleEmpty">샘플 이미지를 올리면 이곳에 순서대로 표시됩니다.</div></div></div>
    </article>`;
  }

  function render() {
    renderHeader();
    const query = searchText.trim().toLowerCase();
    let shown = 0;
    const html = state.locationOrder.map((locationId, locationIndex) => {
      if (locationFilter !== 'all' && locationFilter !== locationId) return '';
      let cuts = orderedCuts(locationId);
      if (query) cuts = cuts.filter((cut) => `${cut.id} ${cut.sceneTitle} ${cut.action}`.toLowerCase().includes(query));
      if (!cuts.length && (query || locationFilter !== 'all')) return '';
      shown += cuts.length;
      const progress = locationProgress(locationId);
      const location = LOCATION_MAP[locationId];
      return `<section class="locationSection" id="location-${locationId}">
        <div class="locationHead"><div class="locationNo">${String(locationIndex + 1).padStart(2, '0')}</div><div><h2>${esc(location.name)}</h2><div class="locationHint">${esc(location.hint)}</div></div><div class="locationStats"><b>영상 ${progress.done}/${progress.total} · 승인 ${progress.approved}</b><div class="locationRail"><i style="width:${progress.percent}%"></i></div><div class="locationControls"><button class="iconBtn" type="button" title="로케이션 순서 위로" onclick="productionBoard.moveLocation('${locationId}',-1)"${locationIndex === 0 ? ' disabled' : ''}>↑</button><button class="iconBtn" type="button" title="로케이션 순서 아래로" onclick="productionBoard.moveLocation('${locationId}',1)"${locationIndex === state.locationOrder.length - 1 ? ' disabled' : ''}>↓</button></div></div></div>
        <div class="cutGrid">${cuts.map((cut) => renderCard(cut, locationId, state.cutOrders[locationId].indexOf(cut.id))).join('')}</div>
      </section>`;
    }).join('');
    document.getElementById('productionBook').innerHTML = shown ? html : '<div class="emptyResult">검색 결과가 없습니다.</div>';
    hydrateAllSamples();
  }

  function moveLocation(locationId, delta) {
    const index = state.locationOrder.indexOf(locationId);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= state.locationOrder.length) return;
    [state.locationOrder[index], state.locationOrder[next]] = [state.locationOrder[next], state.locationOrder[index]];
    saveState(); render();
  }

  function applyRecommendedOrder() {
    sortStateForProduction(state);
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function moveCut(locationId, cutId, delta) {
    const order = state.cutOrders[locationId];
    const index = order.indexOf(cutId);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    saveState(); render();
    document.getElementById(`production-${cutId}`)?.scrollIntoView({ block: 'center' });
  }

  function changeLocation(cutId, nextLocation) {
    const previous = state.cuts[cutId]?.locationId;
    if (!previous || !LOCATION_MAP[nextLocation] || previous === nextLocation) return;
    state.cutOrders[previous] = state.cutOrders[previous].filter((id) => id !== cutId);
    state.cutOrders[nextLocation].push(cutId);
    state.cuts[cutId].locationId = nextLocation;
    saveState(); render();
    document.getElementById(`production-${cutId}`)?.scrollIntoView({ block: 'center' });
  }

  function setStatus(cutId, status) {
    if (!state.cuts[cutId] || !STATUS_MAP[status]) return;
    state.cuts[cutId].status = status;
    saveState();
    const card = document.querySelector(`[data-cut="${CSS.escape(cutId)}"]`);
    if (card) {
      card.dataset.status = status;
      const badge = card.querySelector('.statusBadge');
      if (badge) badge.textContent = STATUS_MAP[status];
    }
    renderHeader();
    document.querySelectorAll('.locationSection').forEach((section) => {
      const id = section.id.replace('location-', '');
      const progress = locationProgress(id);
      const stat = section.querySelector('.locationStats');
      if (stat) stat.querySelector('b').textContent = `영상 ${progress.done}/${progress.total} · 승인 ${progress.approved}`;
      const rail = stat?.querySelector('.locationRail i');
      if (rail) rail.style.width = `${progress.percent}%`;
    });
  }

  function setNote(cutId, note) {
    if (!state.cuts[cutId]) return;
    state.cuts[cutId].note = note;
    clearTimeout(setNote.timer);
    setNote.timer = setTimeout(saveState, 250);
  }

  function resetFilters() {
    locationFilter = 'all'; searchText = '';
    document.getElementById('productionSearch').value = '';
    render();
  }

  function openDb() {
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('cutId', 'cutId');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function sampleRows(cutId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).index('cutId').getAll(cutId);
      request.onsuccess = () => resolve(request.result.sort((a, b) => a.order - b.order || a.id - b.id));
      request.onerror = () => reject(request.error);
    });
  }

  async function putSample(row) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(row);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteSampleRow(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function hydrateSamples(cutId) {
    const section = document.querySelector(`[data-samples-for="${CSS.escape(cutId)}"]`);
    if (!section) return;
    const track = section.querySelector('.sampleTrack');
    try {
      const rows = await sampleRows(cutId);
      if (!rows.length) { track.innerHTML = '<div class="sampleEmpty">샘플 이미지를 올리면 이곳에 순서대로 표시됩니다.</div>'; return; }
      track.innerHTML = rows.map((row, index) => {
        const url = URL.createObjectURL(row.file);
        objectUrls.add(url);
        return `<div class="sampleCard"><span class="sampleIndex">${String(index + 1).padStart(2, '0')}</span><img src="${url}" alt="${esc(row.name)}" onclick="productionBoard.openImage(this.src)"><div class="sampleName">${esc(row.name)}</div><div class="sampleBtns"><button type="button" onclick="productionBoard.moveSample('${esc(cutId)}',${row.id},-1)"${index === 0 ? ' disabled' : ''}>←</button><button type="button" onclick="productionBoard.moveSample('${esc(cutId)}',${row.id},1)"${index === rows.length - 1 ? ' disabled' : ''}>→</button><button type="button" onclick="productionBoard.deleteSample('${esc(cutId)}',${row.id})">삭제</button></div></div>`;
      }).join('');
    } catch { track.innerHTML = '<div class="sampleEmpty">이 브라우저에서는 샘플 저장소를 열 수 없습니다.</div>'; }
  }

  function hydrateAllSamples() {
    document.querySelectorAll('[data-samples-for]').forEach((element) => hydrateSamples(element.dataset.samplesFor));
  }

  function uploadSamples(cutId) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
    input.onchange = async () => {
      const files = [...input.files];
      if (!files.length) return;
      const rows = await sampleRows(cutId);
      let order = rows.length;
      for (const file of files) await putSample({ cutId, order: order++, name: file.name, file, createdAt: Date.now() });
      await hydrateSamples(cutId);
    };
    input.click();
  }

  async function moveSample(cutId, id, delta) {
    const rows = await sampleRows(cutId);
    const index = rows.findIndex((row) => row.id === id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= rows.length) return;
    const order = rows[index].order;
    rows[index].order = rows[next].order;
    rows[next].order = order;
    await putSample(rows[index]); await putSample(rows[next]); await hydrateSamples(cutId);
  }

  async function deleteSample(cutId, id) {
    await deleteSampleRow(id);
    const rows = await sampleRows(cutId);
    for (let index = 0; index < rows.length; index++) { rows[index].order = index; await putSample(rows[index]); }
    await hydrateSamples(cutId);
  }

  function openImage(src) {
    document.getElementById('prodModalImg').src = src;
    document.getElementById('prodModal').classList.add('open');
  }

  async function copyPrompt(cutId) {
    const cut = visibleStoryCuts().find((item) => item.id === cutId);
    if (!cut) return;
    const prompt = videoPrompt(cut);
    try { await navigator.clipboard.writeText(prompt); }
    catch {
      const area = document.createElement('textarea');
      area.value = prompt; area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
    }
    const flag = document.getElementById('saveFlag');
    flag.textContent = `${cutId} 프롬프트 복사됨`; flag.classList.add('saved');
    setTimeout(() => { flag.textContent = '자동 저장'; flag.classList.remove('saved'); }, 1800);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), state }, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `우울폭주_제작진행_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  }

  function importData() { document.getElementById('productionImport').click(); }

  injectShell();
  document.getElementById('locationFilter').addEventListener('change', (event) => { locationFilter = event.target.value; render(); });
  document.getElementById('productionSearch').addEventListener('input', (event) => { searchText = event.target.value; clearTimeout(render.searchTimer); render.searchTimer = setTimeout(render, 160); });
  document.getElementById('productionImport').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try { const parsed = JSON.parse(await file.text()); state = normalizeState(parsed.state || parsed); saveState(); render(); }
    catch { alert('제작 콘티 백업 파일을 읽지 못했습니다.'); }
    event.target.value = '';
  });
  window.addEventListener('beforeunload', () => objectUrls.forEach((url) => URL.revokeObjectURL(url)));
  window.productionBoard = { moveLocation, moveCut, applyRecommendedOrder, changeLocation, setStatus, setNote, resetFilters, uploadSamples, moveSample, deleteSample, openImage, copyPrompt, exportData, importData };
  render();
})();
