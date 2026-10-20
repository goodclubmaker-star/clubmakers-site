(() => {
  'use strict';

  const STORAGE_KEY = 'blue-christmas-production-board-v1';
  const STORY_STORAGE_KEY = 'blue-christmas-storyboard-edits-v1';
  const DB_NAME = 'blue-christmas-production-board-files-v1';
  const STORE_NAME = 'samples';
  const AI_JOB_STORAGE_KEY = 'blue-christmas-ai-video-jobs-v1';
  const AI_VIDEO_API = '/api/blue-christmas/video';
  const AI_PILOT_CUT_ID = 'S16-C02';
  const AI_PILOT_MODELS = {
    gen4_turbo: { name: 'Gen-4 Turbo · 빠른 시험', credits: 25 },
    'gen4.5': { name: 'Gen-4.5 · 품질 우선', credits: 60 }
  };
  const STATUSES = [
    ['ready', '준비'],
    ['keyframe', '키프레임 확정'],
    ['generating', '영상 제작중'],
    ['video', '영상 완료'],
    ['approved', '최종 승인']
  ];
  const LOCATION_DEFS = [
    { id: 'dept-front', name: '백화점 전면 · 도심 광장', hint: 'S03 · S11 · S19 / 전광판·연말 군중·백화점 정면' },
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
Create a 5-second cinematic image-to-video shot from this exact first frame: a crowded Gwanghwamun intersection in winter Seoul, 2023. Preserve the high oblique wide composition, the small traffic island, the palace frontage, dense Christmas-season crowds, buses and cars, wet-road reflections, and every established light and color.

Rudolf is the same human Korean man in the approved keyframe: large round sturdy body, innocent face, brown vintage aviator trapper cap with large goggles resting on top, olive bulky parka, faded red scarf, dark trousers, winter boots, old backpack, and the same worn folded paper map. He remains safely planted at the center of the small island. He looks down at the map, turns only the top edge a little, glances once toward the flowing city, then returns his eyes to the map with restrained confusion. Keep both hands, map folds, face, costume, and body proportions stable.

Traffic and pedestrians flow around him in clear lanes without touching him. Headlights and reflections slide naturally across the wet road. Camera movement is a very slow, nearly imperceptible push toward Rudolf while the original high-angle geometry stays locked. One continuous shot, restrained limited animation, lonely gentle comedy inside an overwhelming city.

NEGATIVE PROMPT
No location change, no empty street, no teleporting vehicles, no vehicle crossing through Rudolf, no collision, no new principal character, no character redesign, no thin body, no antlers, no animal ears, no red nose, no mascot face, no altered costume, no clean or modern map, no readable map text, no extra fingers, no morphing hands, no duplicated pedestrians, no melting palace or buildings, no camera shake, no fast zoom, no fisheye distortion, no subtitles, no generated letters, no logo, no watermark, no style conversion.`
  };
  const CHARACTER_REFERENCES = [
    { id: 'rudolf', name: '루돌프', version: 'FINAL LOCK v001', file: 'production-references/characters/rudolf_final_v001.webp', lock: '30대 초반의 인간 남성. 크고 둥글며 튼튼한 체형, 갈색 빈티지 귀덮개 항공모와 큰 고글, 올리브 패딩, 붉은 목도리, 낡은 지도와 배낭. 뿔·동물 귀·빨간 코 금지.' },
    { id: 'santa', name: '산타', version: 'FINAL LOCK v003', file: 'production-references/characters/santa_final_v003.webp', lock: '작고 슬림한 성인 체형과 순진한 어린 얼굴. 빨간 비니, 네이비 롱패딩, 청회색 목도리, 낡은 여행가방을 고정.' },
    { id: 'hyeok', name: '혁', version: 'FINAL LOCK v001', file: 'production-references/characters/hyeok_final_v001.webp', lock: '마른 체형, 헝클어진 검은 머리, 차콜 패딩과 회색 후디. 안경 없음. 담배·라이터 장면에서는 맨손 연속성 유지.' },
    { id: 'jimin', name: '지민', version: 'FINAL LOCK v003', file: 'production-references/characters/jimin_final_v003.webp', lock: '슬림한 체형과 긴 검은 머리, 검은 롱코트, 회색 목도리, 이어폰. S19 이후 당일 장면에서만 얇은 산타복 레이어 사용.' }
  ];
  const LOCATION_REFERENCES = [
    { id: 'seoul-master', name: '서울 2023 마스터', version: 'MASTER GUIDE v001', file: 'production-references/locations/seoul_2023_master_v001.webp', lock: '백화점 전면, 가판대, 골목, 지하통로, 놀이터, 한강과 서울 조망을 포함한 전체 공간·색감 기준.' },
    { id: 'backstreet', name: 'S20·S21 백화점 뒤편', version: 'FINAL LOCATION v003', file: 'production-references/locations/s20_s21_backstreet_v003.webp', lock: '혁·산타 구역과 지민 벤치 구역은 떨어져 있다. 세 인물을 한 프레임에 모으지 않으며 원 콘티 공간 관계를 우선.' },
    { id: 'bench', name: 'S20 벤치 디자인 앵커', version: 'BENCH ANCHOR v001', file: 'production-references/locations/s20_bench_anchor_v001.webp', lock: '벤치 재질과 디자인 참고용. 전체 공간 배치는 S20·S21 뒤편 v003을 우선.' }
  ];
  const CHARACTER_REFERENCE_MAP = Object.fromEntries(CHARACTER_REFERENCES.map((item) => [item.id, item]));
  const LOCATION_REFERENCE_MAP = Object.fromEntries(LOCATION_REFERENCES.map((item) => [item.id, item]));
  const LOCATION_REFERENCE_BY_PRODUCTION = {
    terrace: 'backstreet',
    'dept-front': 'seoul-master', stall: 'seoul-master', alley: 'seoul-master', underpass: 'seoul-master',
    playground: 'seoul-master', hanriver: 'seoul-master', rooftop: 'seoul-master', city: 'seoul-master', breakroom: 'seoul-master'
  };
  const objectUrls = new Set();
  let dbPromise;
  let state = loadState();
  let aiJobs = loadAiJobs();
  let activePilotCutId = '';
  const aiPollTimers = new Map();
  let locationFilter = 'all';
  let searchText = '';

  function pad(value) { return String(value).padStart(2, '0'); }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function sceneId(sceneNo) { return `S${pad(sceneNo)}`; }

  function loadAiJobs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(AI_JOB_STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  }

  function saveAiJobs() {
    localStorage.setItem(AI_JOB_STORAGE_KEY, JSON.stringify(aiJobs));
  }

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

  function characterIdsForCut(cut) {
    const text = `${cut.id} ${cut.img || ''} ${cut.sceneTitle || ''} ${cut.action || ''}`.toLowerCase();
    const ids = [];
    if (/루돌프|rudolf/.test(text)) ids.push('rudolf');
    if (/산타|santa/.test(text)) ids.push('santa');
    if (/혁|hyeok/.test(text)) ids.push('hyeok');
    if (/지민|jimin/.test(text)) ids.push('jimin');
    return ids;
  }

  function characterReferenceDirection(cut) {
    const ids = characterIdsForCut(cut);
    if (!ids.length) return 'No principal character turnaround is required for this environment or insert shot.';
    const lines = ids.map((id) => {
      const reference = CHARACTER_REFERENCE_MAP[id];
      return `${reference.name}: attach ${reference.file.split('/').pop()} as an additional identity reference. ${reference.lock}`;
    });
    if (ids.includes('rudolf')) {
      lines.push('Mandatory Rudolf identity phrase: human Korean man, no antlers, no animal ears, no red nose, brown vintage aviator trapper cap with large goggles resting on top. Do not rely on prompt text alone; the official Rudolf turnaround must be attached.');
    }
    return lines.join('\n');
  }

  function shortAction(cut) {
    const text = String(cut?.action || 'No additional scripted action.').replace(/\s+/g, ' ').trim();
    return text.length > 260 ? `${text.slice(0, 257)}...` : text;
  }

  function storyNeighbors(cut) {
    const sequence = visibleStoryCuts();
    const index = sequence.findIndex((item) => item.id === cut.id);
    return {
      previous: index > 0 ? sequence[index - 1] : null,
      next: index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : null
    };
  }

  function continuityContext(cut) {
    const { previous, next } = storyNeighbors(cut);
    const currentLocation = state?.cuts?.[cut.id]?.locationId || inferLocation(cut.sceneNo, cut.id);
    const previousLocation = previous ? (state?.cuts?.[previous.id]?.locationId || inferLocation(previous.sceneNo, previous.id)) : null;
    const nextLocation = next ? (state?.cuts?.[next.id]?.locationId || inferLocation(next.sceneNo, next.id)) : null;
    const previousSameScene = Boolean(previous && previous.sceneNo === cut.sceneNo);
    const nextSameScene = Boolean(next && next.sceneNo === cut.sceneNo);
    const previousConnected = Boolean(previous && (previousSameScene || previousLocation === currentLocation));
    const nextConnected = Boolean(next && (nextSameScene || nextLocation === currentLocation));

    let incoming = 'This is the opening production shot. Establish the location, light direction, screen geography, costume state, and prop positions clearly for the following cuts.';
    if (previous && previousSameScene && previousLocation === currentLocation) {
      incoming = `Direct continuation from ${previous.id}. Previous action: ${shortAction(previous)} Begin on the same character position, costume state, injury state, eyeline, hand-to-prop relationship, lighting direction, weather, and screen direction established at the end of that shot. Do not reset the performance.`;
    } else if (previous && previousSameScene) {
      incoming = `Intentional within-scene transition from ${previous.id}. Previous action: ${shortAction(previous)} Carry the dominant movement direction, emotional energy, and one visual bridge such as light, foreground motion, or a matching gesture into the new location, but do not import background objects from the previous place.`;
    } else if (previous && previousLocation === currentLocation) {
      incoming = `Same-location return after ${previous.id}. Reuse the exact architecture, spatial geography, lens character, weather, and light direction, while following the current scene's character and prop state.`;
    } else if (previous) {
      incoming = `Hard scene transition after ${previous.id}. Do not carry the previous location or unrelated characters into this shot; establish the current scene cleanly.`;
    }

    let outgoing = 'End on a stable readable composition with no morphing or sudden camera move.';
    if (next && nextSameScene && nextLocation === currentLocation) {
      outgoing = `Prepare a direct handoff to ${next.id}. Next action: ${shortAction(next)} Finish with the correct eyeline, screen direction, body orientation, prop position, and movement momentum so the next keyframe can cut seamlessly.`;
    } else if (next && nextSameScene) {
      outgoing = `Prepare the within-scene transition to ${next.id}. Next action: ${shortAction(next)} End on a clean directional movement, foreground wipe, light cue, or matching gesture that can bridge to the next location.`;
    } else if (next && nextLocation === currentLocation) {
      outgoing = `Preserve the location layout, weather, and light state for the later same-location shot ${next.id}; end without changing permanent background elements.`;
    } else if (next) {
      outgoing = `Finish cleanly before the hard cut to ${next.id}; do not begin the next scene inside this generation.`;
    }

    return { previous, next, previousConnected, nextConnected, incoming, outgoing };
  }

  function videoPrompt(cut) {
    const continuity = continuityContext(cut);
    if (PROMPT_OVERRIDES[cut.id]) {
      return PROMPT_OVERRIDES[cut.id].replace(
        '\n\nNEGATIVE PROMPT',
        `\n\nCHARACTER REFERENCE — REQUIRED\n${characterReferenceDirection(cut)}\n\nCONTINUITY IN\n${continuity.incoming}\n\nEND-FRAME HANDOFF\n${continuity.outgoing}\n\nNEGATIVE PROMPT`
      );
    }
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
    return `IMAGE-TO-VIDEO PROMPT\nCreate a 6-second cinematic image-to-video shot for ${cut.id}, set in winter Seoul, 2023. Use the provided keyframe as the absolute first-frame reference. Preserve the exact characters, faces, body proportions, costumes, props, architecture, composition, color palette, and hand-painted cinematic animation style.\n\nCHARACTER REFERENCE — REQUIRED\n${characterReferenceDirection(cut)}\n\nCONTINUITY IN\n${continuity.incoming}\n\nLOCATION\n${locationName}. ${environmentDirection(locationId)}\n\nSTORY ACTION\n${cut.action || 'Hold the scene with restrained natural environmental motion.'}\n\nMOTION DIRECTION\n${actionDirection(cut)} Add only subtle secondary motion appropriate to the image: breathing, gentle fabric or hair movement, soft practical-light variation, restrained background movement, and atmospheric depth.\n\nCAMERA\n${camera} Continuous single shot, no cut, no scene change. Keep the first-frame identity stable throughout.\n\nEND-FRAME HANDOFF\n${continuity.outgoing}\n\nNEGATIVE PROMPT\nNo character redesign, no face change, no body-type change, no costume change, no injury-state change, no screen-direction reversal, no costume or prop teleport, no missing or extra props, no extra limbs or fingers, no duplicated people, no morphing, no melting architecture, no new signs or readable text, no camera shake, no fast zoom, no fisheye distortion, no style shift, no photorealistic conversion, no 3D CGI conversion, no flicker, no watermark, no logo, no subtitles.`;
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
    target.version = 4;
    return target;
  }

  function inferLocation(sceneNo, cutId) {
    const numeric = Number((cutId.match(/(?:C|KF|I)(\d+)/i) || [])[1] || 1);
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
    if (sceneNo === 16) return /^(S16-C0[123]|S16-C04[ABC]?)$/i.test(cutId) ? 'city' : 'underpass';
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
    return sortStateForProduction({ version: 4, locationOrder: PRODUCTION_LOCATION_ORDER.slice(), cutOrders, cuts });
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
    if (fresh.version < 4) {
      if (fresh.cuts['S16-C02']?.locationId === 'dept-front') fresh.cuts['S16-C02'].locationId = 'city';
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

  function referenceCardMarkup(item, kind) {
    return `<article class="referenceCard" data-reference-kind="${kind}" data-reference-id="${esc(item.id)}">
      <button class="referencePreview" type="button" onclick="productionBoard.openImage('${encodeURI(item.file)}')"><img loading="lazy" src="${encodeURI(item.file)}" alt="${esc(item.name)}"></button>
      <div class="referenceCardBody"><b>${esc(item.name)}</b><span>${esc(item.version)}</span><p>${esc(item.lock)}</p><div><button type="button" onclick="productionBoard.openImage('${encodeURI(item.file)}')">크게 보기</button><a href="${encodeURI(item.file)}" download>다운로드</a></div></div>
    </article>`;
  }

  function referenceLibraryMarkup() {
    return `<div class="referenceModal" id="referenceModal" aria-hidden="true">
      <div class="referenceDialog">
        <header><div><b>제작 기준 시트</b><span>FINAL CHARACTER LOCK · LOCATION LOCK</span></div><button type="button" onclick="productionBoard.closeReferenceLibrary()">×</button></header>
        <nav><button type="button" onclick="productionBoard.filterReferences('all')">전체</button><button type="button" onclick="productionBoard.filterReferences('character')">캐릭터·턴어라운드</button><button type="button" onclick="productionBoard.filterReferences('location')">로케이션</button></nav>
        <section class="referenceWarning"><b>루돌프 생성 필수</b> 시작 키프레임만 넣지 말고 루돌프 FINAL 턴어라운드를 캐릭터 참조 슬롯에 함께 첨부할 것. 뿔·동물 귀·빨간 코·동물형 얼굴 금지.</section>
        <div class="referenceGrid">${CHARACTER_REFERENCES.map((item) => referenceCardMarkup(item, 'character')).join('')}${LOCATION_REFERENCES.map((item) => referenceCardMarkup(item, 'location')).join('')}</div>
      </div>
    </div>`;
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
          <button type="button" onclick="productionBoard.openReferenceLibrary('character')">캐릭터 시트</button>
          <button type="button" onclick="productionBoard.openReferenceLibrary('location')">로케이션 시트</button>
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
      <div class="aiPilotModal" id="aiPilotModal" aria-hidden="true">
        <div class="aiPilotDialog">
          <header><div><b>AI 영상 파일럿</b><span id="aiPilotCutLabel">S16-C02 · 5초 이미지 투 비디오</span></div><button type="button" onclick="productionBoard.closeVideoPilot()">×</button></header>
          <div class="aiPilotGrid">
            <div class="aiPilotPreview"><img id="aiPilotImage" alt="파일럿 첫 프레임"><div class="aiPilotLock">첫 프레임 절대 고정 · 루돌프 캐릭터락 유지</div></div>
            <div class="aiPilotForm">
              <label>모델<select id="aiPilotModel" onchange="productionBoard.updatePilotCost()"><option value="gen4_turbo">Gen-4 Turbo · 빠른 시험</option><option value="gen4.5">Gen-4.5 · 품질 우선</option></select></label>
              <div class="aiPilotCost" id="aiPilotCost">5초 · 예상 25 credits</div>
              <label>영상 프롬프트<textarea id="aiPilotPrompt" spellcheck="false"></textarea></label>
              <label>제작 암호<input id="aiPilotToken" type="password" autocomplete="current-password" placeholder="Cloudflare에 등록한 제작 암호"></label>
              <p class="aiPilotHelp">Runway API 키는 브라우저에 입력하지 않습니다. 제작 암호만 서버에 보내며, 결과 URL은 이 브라우저에 임시 저장됩니다.</p>
              <div class="aiPilotStatus" id="aiPilotStatus">아직 생성하지 않았습니다.</div>
              <div class="aiPilotActions"><button class="aiGenerateBtn" id="aiPilotGenerate" type="button" onclick="productionBoard.startVideoPilot()">5초 파일럿 생성</button><a id="aiPilotDownload" hidden target="_blank" rel="noopener">완성 영상 다운로드</a><button id="aiPilotApprove" hidden type="button" onclick="productionBoard.approveVideoPilot()">KEEP로 표시</button></div>
            </div>
          </div>
        </div>
      </div>
      ${referenceLibraryMarkup()}
      <input id="productionImport" type="file" accept="application/json" hidden>
    `;
    const style = document.createElement('style');
    style.textContent = `
      :root{--bg:#090d13;--panel:#121923;--panel2:#18212d;--ink:#eef2f6;--muted:#97a5b6;--line:#334151;--paper:#f4efe6;--paperInk:#1d2025;--amber:#ddb76d;--red:#c05b62;--green:#65a982;--blue:#6f9fcd}
      *{box-sizing:border-box}html{scroll-behavior:smooth}.productionBody{margin:0;background:var(--bg);color:var(--ink);font-family:"Noto Sans KR","Malgun Gothic",system-ui,sans-serif}.prodTop{position:sticky;top:0;z-index:40;padding:13px 18px 12px;background:#0d131ceF;border-bottom:1px solid var(--line);backdrop-filter:blur(14px)}.prodBrand{display:inline-flex;flex-direction:column;vertical-align:middle}.prodBrand b{font-size:18px}.prodBrand span{margin-top:3px;color:var(--muted);font:10px ui-monospace,monospace;letter-spacing:.12em}.prodActions{float:right;display:flex;align-items:center;gap:7px}.prodActions button,.prodActions a,.filterRow button{border:1px solid #4b5a6c;border-radius:999px;background:#182231;color:#eff3f7;padding:7px 11px;text-decoration:none;cursor:pointer;font-size:12px}.saveFlag{color:#8f9baa;font-size:11px}.saveFlag.saved{color:#8ed0a9}.progressHeader{clear:both;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding-top:12px;font-size:12px}.progressRail,.locationRail{height:7px;border-radius:99px;background:#283341;overflow:hidden}.progressRail i,.locationRail i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--amber),var(--green))}.filterRow{display:grid;grid-template-columns:minmax(200px,320px) minmax(180px,1fr) auto;gap:8px;margin-top:10px}.filterRow select,.filterRow input{min-width:0;border:1px solid #405064;border-radius:7px;background:#111923;color:#e8edf3;padding:8px 10px}.productionBook{max-width:1320px;margin:0 auto;padding:24px 18px 90px}.locationSection{margin-bottom:34px;scroll-margin-top:170px}.locationHead{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;margin-bottom:12px;padding:13px 14px;background:var(--panel);border:1px solid var(--line);border-radius:10px}.locationNo{color:var(--amber);font:800 20px ui-monospace,monospace}.locationHead h2{margin:0 0 3px;font-size:21px}.locationHint{color:var(--muted);font-size:12px}.locationStats{min-width:210px;text-align:right}.locationStats b{display:block;margin-bottom:6px;font:800 12px ui-monospace,monospace}.locationControls{display:flex;gap:5px;margin-top:8px;justify-content:flex-end}.iconBtn{width:29px;height:29px;padding:0;border:1px solid #48586a;border-radius:7px;background:#1b2634;color:#fff;cursor:pointer}.iconBtn:disabled{opacity:.25}.cutGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.productionCard{overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--panel);box-shadow:0 10px 28px #0004}.productionCard[data-status="video"],.productionCard[data-status="approved"]{border-color:#4e8367}.keyframe{position:relative;display:flex;align-items:center;justify-content:center;min-height:210px;background:#05080c}.keyframe img{display:block;width:100%;max-height:440px;object-fit:contain;cursor:zoom-in}.keyframe .missing{padding:80px 20px;color:#8491a1}.orderBadge,.statusBadge{position:absolute;top:10px;z-index:2;padding:6px 9px;border-radius:999px;font:800 10px ui-monospace,monospace;box-shadow:0 3px 10px #0008}.orderBadge{left:10px;background:#090d13dd;color:#fff}.statusBadge{right:10px;background:#263444e8;color:#dce4ed}.shotBadge{display:inline-flex;margin-top:6px;padding:4px 7px;border:1px solid #3b4a5d;border-radius:999px;color:#aebccc;background:#101720;font:800 9px ui-monospace,monospace;letter-spacing:.04em}.productionCard[data-status="keyframe"] .statusBadge{background:#7a5d2d}.productionCard[data-status="generating"] .statusBadge{background:#385e82}.productionCard[data-status="video"] .statusBadge{background:#397052}.productionCard[data-status="approved"] .statusBadge{background:#256746}.cardBody{padding:14px}.cardTop{display:flex;justify-content:space-between;gap:10px}.cutIdentity{font:800 13px ui-monospace,monospace;color:var(--amber)}.sceneTitle{margin-top:3px;color:var(--muted);font-size:12px}.moveTools{display:flex;gap:4px}.generatorTools{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.generatorTools a,.generatorTools button{border:1px solid #4a5b6e;border-radius:999px;background:#14202d;color:#edf3f8;padding:6px 9px;text-decoration:none;cursor:pointer;font:800 10px inherit}.generatedClip{margin-top:10px;border:1px solid #35465a;border-radius:7px;overflow:hidden;background:#05080c}.generatedClip video{display:block;width:100%;max-height:360px;background:#000}.generatedClip b{display:block;padding:7px 9px;color:#8ed0a9;font-size:11px}.scenario{margin:13px 0 0;padding:12px 13px;border-radius:7px;background:var(--paper);color:var(--paperInk);white-space:pre-line;font-size:13px;line-height:1.65;max-height:180px;overflow:auto}.scenario:empty{display:none}.productionFields{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.field{display:flex;flex-direction:column;gap:5px}.field.full{grid-column:1/-1}.field label{color:#9eabba;font-size:10px;font-weight:800;letter-spacing:.06em}.field select,.field textarea{width:100%;border:1px solid #3b4a5b;border-radius:6px;background:#0e151e;color:#edf1f5;padding:8px;font:12px inherit}.field textarea{min-height:66px;resize:vertical}.sampleSection{padding:0 14px 14px}.sampleTop{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.sampleTop b{font-size:12px}.sampleUpload{border:1px solid #53657a;border-radius:999px;background:#1a2634;color:#fff;padding:6px 9px;cursor:pointer;font-size:11px}.sampleTrack{display:flex;gap:8px;overflow-x:auto;padding-bottom:3px}.sampleCard{position:relative;flex:0 0 170px;overflow:hidden;border:1px solid #3b4959;border-radius:7px;background:#080c11}.sampleCard img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;cursor:zoom-in}.sampleIndex{position:absolute;top:5px;left:5px;padding:3px 6px;border-radius:99px;background:#080c11dd;font:800 9px ui-monospace,monospace}.sampleName{padding:6px 7px;color:#9da9b7;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sampleBtns{display:flex;gap:3px;padding:0 5px 6px}.sampleBtns button{flex:1;border:1px solid #405063;border-radius:5px;background:#17212d;color:#fff;padding:4px;cursor:pointer;font-size:10px}.sampleEmpty{width:100%;padding:14px;border:1px dashed #3f4d5d;border-radius:6px;color:#7f8c9c;text-align:center;font-size:11px}.prodModal{position:fixed;inset:0;z-index:90;display:none;align-items:center;justify-content:center;padding:22px;background:#030507f2}.prodModal.open{display:flex}.prodModal img{max-width:96vw;max-height:94vh;object-fit:contain}.prodModal button{position:absolute;right:16px;top:10px;border:0;background:none;color:#fff;font-size:36px}.emptyResult{padding:80px 20px;text-align:center;color:#8c99a8}
      .promptDetails{margin-top:8px;border:1px solid #33465a;border-radius:7px;background:#0b1119}.promptDetails summary{padding:8px 10px;color:#b8c6d5;cursor:pointer;font-size:11px;font-weight:800}.promptDetails pre{max-height:310px;margin:0;padding:11px;border-top:1px solid #2d3b4a;color:#dce6ef;white-space:pre-wrap;overflow:auto;font:11px/1.55 ui-monospace,"Malgun Gothic",monospace}
      .continuityLine{margin-top:8px;padding:7px 9px;border-left:3px solid #6f9fcd;background:#101923;color:#aebdcd;font:10px/1.45 ui-monospace,"Malgun Gothic",monospace}.continuityLine b{color:#dce8f3}
      .aiPilotLaunch{border-color:#d3a34b!important;background:#7b5720!important;color:#fff4d8!important}.aiPilotLaunch.running{border-color:#6f9fcd!important;background:#244b70!important}.aiPilotInline{margin-top:9px;padding:9px 10px;border:1px solid #5f4b2b;border-radius:7px;background:#19160f;color:#d8c7a6;font-size:11px;line-height:1.5}.aiPilotInline b{color:#ffd58d}.aiPilotInline.success{border-color:#3d7558;background:#101a15;color:#a9d4ba}
      .aiPilotModal{position:fixed;inset:0;z-index:100;display:none;padding:24px;background:#030609ed;overflow:auto}.aiPilotModal.open{display:flex;align-items:center;justify-content:center}.aiPilotDialog{width:min(1180px,100%);max-height:calc(100vh - 48px);overflow:auto;border:1px solid #45566a;border-radius:13px;background:#101823;box-shadow:0 24px 90px #000c}.aiPilotDialog>header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #344355;background:#111a25f2;backdrop-filter:blur(12px)}.aiPilotDialog>header b{display:block;font-size:19px}.aiPilotDialog>header span{display:block;margin-top:3px;color:#9aabba;font:10px ui-monospace,monospace}.aiPilotDialog>header button{border:0;background:none;color:#fff;font-size:30px;cursor:pointer}.aiPilotGrid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(360px,.9fr);gap:0}.aiPilotPreview{position:relative;display:flex;align-items:center;justify-content:center;min-height:390px;background:#05080c}.aiPilotPreview img{display:block;width:100%;height:100%;max-height:680px;object-fit:contain}.aiPilotLock{position:absolute;left:12px;bottom:12px;padding:7px 9px;border-radius:6px;background:#070a0edb;color:#f1d198;font-size:11px}.aiPilotForm{display:flex;flex-direction:column;gap:11px;padding:18px}.aiPilotForm label{display:flex;flex-direction:column;gap:6px;color:#b9c5d1;font-size:11px;font-weight:800}.aiPilotForm select,.aiPilotForm textarea,.aiPilotForm input{width:100%;border:1px solid #46576a;border-radius:7px;background:#0b121a;color:#f0f4f7;padding:9px;font:12px/1.5 inherit}.aiPilotForm textarea{min-height:270px;resize:vertical;font-family:ui-monospace,"Malgun Gothic",monospace}.aiPilotCost{padding:8px 10px;border-radius:6px;background:#182334;color:#e7c27a;font:800 11px ui-monospace,monospace}.aiPilotHelp{margin:0;color:#8e9dad;font-size:11px;line-height:1.55}.aiPilotStatus{padding:10px 11px;border:1px solid #3a4a5b;border-radius:7px;background:#0b1118;color:#bac7d4;font-size:12px;line-height:1.55}.aiPilotStatus.error{border-color:#8c4d52;color:#f0b3b6}.aiPilotStatus.success{border-color:#48775c;color:#b7dfc3}.aiPilotActions{display:flex;flex-wrap:wrap;gap:7px}.aiPilotActions button,.aiPilotActions a{border:1px solid #56677a;border-radius:999px;background:#1a2735;color:#f4f7f9;padding:9px 12px;text-decoration:none;cursor:pointer;font-size:12px;font-weight:800}.aiPilotActions .aiGenerateBtn{border-color:#d2a34f;background:#8a6021;color:#fff8e9}.aiPilotActions button:disabled{opacity:.5;cursor:wait}
      .referenceModal{position:fixed;inset:0;z-index:80;display:none;padding:24px;background:#05080deb;overflow:auto}.referenceModal.open{display:block}.referenceDialog{max-width:1280px;margin:auto;border:1px solid #3c4a5b;border-radius:12px;background:#0f1721;box-shadow:0 20px 80px #000b}.referenceDialog>header{position:sticky;top:-24px;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #344253;background:#101923f2;backdrop-filter:blur(12px)}.referenceDialog>header b{display:block;font-size:18px}.referenceDialog>header span{display:block;margin-top:3px;color:#92a2b4;font:10px ui-monospace,monospace;letter-spacing:.08em}.referenceDialog>header button{border:0;background:none;color:#fff;font-size:30px;cursor:pointer}.referenceDialog>nav{display:flex;gap:7px;padding:12px 14px 0}.referenceDialog>nav button,.referenceCardBody button,.referenceCardBody a{border:1px solid #506176;border-radius:999px;background:#172333;color:#f1f5f8;padding:7px 10px;text-decoration:none;cursor:pointer;font-size:11px}.referenceWarning{margin:12px 14px 0;padding:11px 13px;border:1px solid #8a5f45;border-radius:8px;background:#2a1d18;color:#f1d5bc;font-size:12px;line-height:1.6}.referenceWarning b{color:#ffbe83}.referenceGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:14px}.referenceCard{overflow:hidden;border:1px solid #334254;border-radius:9px;background:#131d29}.referenceCard.hidden{display:none}.referencePreview{display:block;width:100%;padding:0;border:0;background:#070b10;cursor:zoom-in}.referencePreview img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain}.referenceCardBody{padding:11px}.referenceCardBody>b{font-size:14px}.referenceCardBody>span{margin-left:8px;color:#d9b86f;font:10px ui-monospace,monospace}.referenceCardBody p{min-height:38px;margin:7px 0 10px;color:#aebaca;font-size:11px;line-height:1.55}.referenceCardBody div{display:flex;gap:6px}
      @media(max-width:820px){.prodTop{padding:10px}.prodBrand b{font-size:15px}.prodActions{float:none;margin-top:9px;overflow-x:auto}.progressHeader{grid-template-columns:auto 1fr}.progressHeader .progressDetail{grid-column:1/-1}.filterRow{grid-template-columns:1fr auto}.filterRow select{grid-column:1/-1}.productionBook{padding:15px 0 60px}.locationSection{margin-bottom:22px}.locationHead{border-radius:0;border-left:0;border-right:0;grid-template-columns:auto 1fr;padding:12px 11px}.locationHead h2{font-size:17px}.locationStats{grid-column:1/-1;min-width:0;text-align:left}.locationControls{justify-content:flex-start}.cutGrid{display:block}.productionCard{border-radius:0;border-left:0;border-right:0;margin-bottom:12px}.keyframe{min-height:0}.keyframe img{max-height:none}.productionFields{grid-template-columns:1fr}.field.full{grid-column:auto}.scenario{max-height:none}.sampleCard{flex-basis:150px}.referenceModal{padding:0}.referenceDialog{border:0;border-radius:0}.referenceDialog>header{top:0}.referenceGrid{grid-template-columns:1fr;padding:10px}.referenceDialog>nav{overflow-x:auto}.referenceWarning{margin:10px}.referenceCardBody p{min-height:0}.aiPilotModal{padding:0}.aiPilotDialog{min-height:100%;max-height:none;border:0;border-radius:0}.aiPilotGrid{display:block}.aiPilotPreview{min-height:0}.aiPilotPreview img{height:auto;max-height:none}.aiPilotForm{padding:14px}.aiPilotForm textarea{min-height:240px}}
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

  function pilotInlineStatus(job) {
    if (!job) return 'S16-C02에서 5초 이미지 투 비디오를 한 번 시험할 수 있습니다.';
    if (job.status === 'SUCCEEDED') return `완료 · ${job.model || 'Runway'} · 결과가 만료되기 전에 다운로드하세요.`;
    if (job.status === 'FAILED') return `실패 · ${job.error || '상세 오류를 확인하세요.'}`;
    if (job.status === 'SUBMITTING') return 'Runway에 생성 요청을 보내는 중입니다.';
    const progress = Number.isFinite(Number(job.progress)) ? ` · ${Math.round(Number(job.progress) * 100)}%` : '';
    return `${job.status || '대기'}${progress} · 창을 닫아도 이 브라우저에서 이어서 확인합니다.`;
  }

  function renderCard(cut, locationId, orderIndex) {
    const cutState = state.cuts[cut.id];
    const shot = shotProfile(cut);
    const locationOptions = state.locationOrder.map((id) => `<option value="${id}"${id === locationId ? ' selected' : ''}>${esc(LOCATION_MAP[id].name)}</option>`).join('');
    const statusOptions = STATUSES.map(([id, name]) => `<option value="${id}"${id === cutState.status ? ' selected' : ''}>${name}</option>`).join('');
    const aiJob = aiJobs[cut.id] || null;
    const clip = aiJob?.outputUrl || GENERATED_CLIPS[cut.id];
    const isPilotCut = cut.id === AI_PILOT_CUT_ID;
    const isPilotRunning = ['SUBMITTING', 'PENDING', 'THROTTLED', 'RUNNING'].includes(aiJob?.status);
    const pilotButton = isPilotCut
      ? `<button class="aiPilotLaunch${isPilotRunning ? ' running' : ''}" type="button" onclick="productionBoard.openVideoPilot('${esc(cut.id)}')">${isPilotRunning ? 'AI 생성 진행 확인' : aiJob?.outputUrl ? 'AI 영상 다시 생성' : 'AI 영상 파일럿'}</button>`
      : '';
    const pilotInline = isPilotCut
      ? `<div class="aiPilotInline${aiJob?.status === 'SUCCEEDED' ? ' success' : ''}"><b>파일럿</b> ${esc(pilotInlineStatus(aiJob))}</div>`
      : '';
    const extension = (cut.img || '').split('.').pop() || 'png';
    const prompt = videoPrompt(cut);
    const continuity = continuityContext(cut);
    const previousExtension = (continuity.previous?.img || '').split('.').pop() || 'png';
    const nextExtension = (continuity.next?.img || '').split('.').pop() || 'png';
    const previousReference = continuity.previousConnected && continuity.previous?.img
      ? `<a href="${encodeURI(continuity.previous.img)}" download="${esc(continuity.previous.id)}_previous-reference.${esc(previousExtension)}">이전컷 참고 다운로드</a>` : '';
    const nextReference = continuity.nextConnected && continuity.next?.img
      ? `<a href="${encodeURI(continuity.next.img)}" download="${esc(continuity.next.id)}_next-reference.${esc(nextExtension)}">다음컷 참고 다운로드</a>` : '';
    const continuityLabel = `${continuity.previousConnected ? continuity.previous.id : '새 장면'} → ${cut.id} → ${continuity.nextConnected ? continuity.next.id : '컷 종료'}`;
    const characterReferenceButtons = characterIdsForCut(cut).map((id) => `<button type="button" onclick="productionBoard.openReferenceLibrary('character','${id}')">${esc(CHARACTER_REFERENCE_MAP[id].name)} 시트</button>`).join('');
    const locationReferenceId = LOCATION_REFERENCE_BY_PRODUCTION[locationId];
    const locationReferenceButton = locationReferenceId ? `<button type="button" onclick="productionBoard.openReferenceLibrary('location','${locationReferenceId}')">로케이션 시트</button>` : '';
    return `<article class="productionCard" id="production-${esc(cut.id)}" data-cut="${esc(cut.id)}" data-status="${esc(cutState.status)}">
      <div class="keyframe">
        <span class="orderBadge">${String(orderIndex + 1).padStart(2, '0')} · ${esc(cut.id)}</span>
        <span class="statusBadge">${esc(STATUS_MAP[cutState.status])}</span>
        ${cut.img ? `<img loading="lazy" src="${encodeURI(cut.img)}" alt="${esc(cut.id)} 키프레임" onclick="productionBoard.openImage(this.src)">` : '<div class="missing">키프레임 미제작</div>'}
      </div>
      <div class="cardBody">
        <div class="cardTop"><div><div class="cutIdentity">${sceneId(cut.sceneNo)} · ${esc(cut.id)}</div><div class="sceneTitle">${esc(cut.sceneTitle)}</div><span class="shotBadge">${esc(shot.label)}</span></div><div class="moveTools"><button class="iconBtn" type="button" title="앞으로" onclick="productionBoard.moveCut('${esc(locationId)}','${esc(cut.id)}',-1)"${orderIndex === 0 ? ' disabled' : ''}>↑</button><button class="iconBtn" type="button" title="뒤로" onclick="productionBoard.moveCut('${esc(locationId)}','${esc(cut.id)}',1)"${orderIndex === state.cutOrders[locationId].length - 1 ? ' disabled' : ''}>↓</button></div></div>
        <div class="generatorTools">${pilotButton}${cut.img ? `<a href="${encodeURI(cut.img)}" download="${esc(cut.id)}_keyframe.${esc(extension)}">키프레임 다운로드</a>` : ''}${characterReferenceButtons}${locationReferenceButton}${previousReference}${nextReference}<button type="button" onclick="productionBoard.copyPrompt('${esc(cut.id)}')">영상 프롬프트 복사</button>${clip ? `<a href="${encodeURI(clip)}" download target="_blank" rel="noopener">생성 영상 다운로드</a>` : ''}</div>
        ${pilotInline}
        <div class="continuityLine"><b>연결 기준</b> ${esc(continuityLabel)}</div>
        <details class="promptDetails"><summary>이 컷의 영상 프롬프트 보기</summary><pre>${esc(prompt)}</pre></details>
        ${clip ? `<div class="generatedClip"><b>${aiJob?.outputUrl ? 'AI 파일럿 결과' : 'AI 생성 영상'} · ${esc(cut.id)}</b><video controls playsinline preload="metadata" src="${encodeURI(clip)}"></video></div>` : ''}
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

  function filterReferences(kind = 'all', focusId = '') {
    document.querySelectorAll('.referenceCard').forEach((card) => {
      card.classList.toggle('hidden', kind !== 'all' && card.dataset.referenceKind !== kind);
      card.style.outline = card.dataset.referenceId === focusId ? '2px solid #ddb76d' : '';
    });
    if (focusId) {
      requestAnimationFrame(() => document.querySelector(`[data-reference-id="${CSS.escape(focusId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
  }

  function openReferenceLibrary(kind = 'all', focusId = '') {
    const modal = document.getElementById('referenceModal');
    filterReferences(kind, focusId);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeReferenceLibrary() {
    const modal = document.getElementById('referenceModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
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

  function updatePilotCost() {
    const model = document.getElementById('aiPilotModel')?.value || 'gen4_turbo';
    const config = AI_PILOT_MODELS[model] || AI_PILOT_MODELS.gen4_turbo;
    const cost = document.getElementById('aiPilotCost');
    if (cost) cost.textContent = `5초 · 예상 ${config.credits} credits · 실제 과금은 Runway 기준`;
  }

  function pilotStatusMessage(job) {
    if (!job) return { text: '아직 생성하지 않았습니다.', kind: '' };
    if (job.status === 'SUCCEEDED') return { text: '생성이 완료되었습니다. 결과 URL은 영구 보관용이 아니므로 지금 다운로드하세요.', kind: 'success' };
    if (job.status === 'FAILED') return { text: `생성 실패: ${job.error || 'Runway 작업이 완료되지 않았습니다.'}`, kind: 'error' };
    if (job.status === 'SUBMITTING') return { text: 'Runway에 작업을 등록하는 중입니다…', kind: '' };
    const progress = Number.isFinite(Number(job.progress)) ? ` (${Math.round(Number(job.progress) * 100)}%)` : '';
    return { text: `${job.status || 'PENDING'}${progress} · 약 5초 후 자동으로 다시 확인합니다.`, kind: '' };
  }

  function updatePilotModal() {
    if (!activePilotCutId) return;
    const job = aiJobs[activePilotCutId] || null;
    const status = document.getElementById('aiPilotStatus');
    const generate = document.getElementById('aiPilotGenerate');
    const download = document.getElementById('aiPilotDownload');
    const approve = document.getElementById('aiPilotApprove');
    const message = pilotStatusMessage(job);
    if (status) {
      status.textContent = message.text;
      status.className = `aiPilotStatus${message.kind ? ` ${message.kind}` : ''}`;
    }
    const running = ['SUBMITTING', 'PENDING', 'THROTTLED', 'RUNNING'].includes(job?.status);
    if (generate) {
      generate.disabled = running;
      generate.textContent = running ? '생성 진행 중…' : job?.outputUrl ? '새 버전 다시 생성' : '5초 파일럿 생성';
    }
    if (download) {
      download.hidden = !job?.outputUrl;
      if (job?.outputUrl) download.href = job.outputUrl;
    }
    if (approve) approve.hidden = !job?.outputUrl || state.cuts[activePilotCutId]?.status === 'approved';
  }

  function openVideoPilot(cutId) {
    if (cutId !== AI_PILOT_CUT_ID) return;
    const cut = visibleStoryCuts().find((item) => item.id === cutId);
    if (!cut?.img) return;
    activePilotCutId = cutId;
    document.getElementById('aiPilotCutLabel').textContent = `${cutId} · 5초 이미지 투 비디오`;
    document.getElementById('aiPilotImage').src = new URL(cut.img, window.location.href).href;
    document.getElementById('aiPilotPrompt').value = PROMPT_OVERRIDES[cutId] || videoPrompt(cut);
    document.getElementById('aiPilotModel').value = aiJobs[cutId]?.model || 'gen4_turbo';
    document.getElementById('aiPilotToken').value = sessionStorage.getItem('blue-christmas-studio-token-v1') || '';
    updatePilotCost();
    updatePilotModal();
    const modal = document.getElementById('aiPilotModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (['PENDING', 'THROTTLED', 'RUNNING'].includes(aiJobs[cutId]?.status) && document.getElementById('aiPilotToken').value) schedulePilotPoll(cutId, 200);
  }

  function closeVideoPilot() {
    const modal = document.getElementById('aiPilotModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    activePilotCutId = '';
  }

  async function apiJson(response) {
    const text = await response.text();
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; }
    catch { payload = { message: text || '서버 응답을 읽지 못했습니다.' }; }
    if (!response.ok) {
      const error = new Error(payload.message || payload.error || `요청 실패 (${response.status})`);
      error.code = payload.code || '';
      throw error;
    }
    return payload;
  }

  async function startVideoPilot() {
    const cutId = activePilotCutId;
    const cut = visibleStoryCuts().find((item) => item.id === cutId);
    if (!cut || cutId !== AI_PILOT_CUT_ID) return;
    const token = document.getElementById('aiPilotToken').value.trim();
    const model = document.getElementById('aiPilotModel').value;
    const prompt = document.getElementById('aiPilotPrompt').value.trim();
    if (!token) {
      const status = document.getElementById('aiPilotStatus');
      status.textContent = '제작 암호를 입력해야 유료 API 호출을 시작할 수 있습니다.';
      status.className = 'aiPilotStatus error';
      return;
    }
    if (!prompt) return;
    const config = AI_PILOT_MODELS[model] || AI_PILOT_MODELS.gen4_turbo;
    if (!window.confirm(`${config.name}으로 5초 영상을 생성합니다. 예상 ${config.credits} credits를 사용할 수 있습니다. 계속할까요?`)) return;
    sessionStorage.setItem('blue-christmas-studio-token-v1', token);
    aiJobs[cutId] = { status: 'SUBMITTING', model, startedAt: new Date().toISOString(), prompt };
    saveAiJobs();
    state.cuts[cutId].status = 'generating';
    saveState();
    updatePilotModal();
    render();
    try {
      const payload = await apiJson(await fetch(AI_VIDEO_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Blue-Christmas-Token': token },
        body: JSON.stringify({ cutId, model, duration: 5, prompt })
      }));
      aiJobs[cutId] = { ...aiJobs[cutId], taskId: payload.taskId, status: payload.status || 'PENDING', submittedAt: new Date().toISOString() };
      saveAiJobs();
      updatePilotModal();
      render();
      schedulePilotPoll(cutId, 1500);
    } catch (error) {
      aiJobs[cutId] = { ...aiJobs[cutId], status: 'FAILED', error: error.message };
      state.cuts[cutId].status = 'keyframe';
      saveAiJobs(); saveState(); render(); updatePilotModal();
    }
  }

  function schedulePilotPoll(cutId, delay = 5000) {
    clearTimeout(aiPollTimers.get(cutId));
    aiPollTimers.set(cutId, setTimeout(() => pollVideoPilot(cutId), delay));
  }

  async function pollVideoPilot(cutId) {
    const job = aiJobs[cutId];
    if (!job?.taskId || !['PENDING', 'THROTTLED', 'RUNNING'].includes(job.status)) return;
    const token = sessionStorage.getItem('blue-christmas-studio-token-v1') || document.getElementById('aiPilotToken')?.value.trim();
    if (!token) return;
    try {
      const url = `${AI_VIDEO_API}?id=${encodeURIComponent(job.taskId)}&cutId=${encodeURIComponent(cutId)}`;
      const payload = await apiJson(await fetch(url, { headers: { 'X-Blue-Christmas-Token': token } }));
      const outputUrl = Array.isArray(payload.output) ? payload.output.find((item) => typeof item === 'string') : payload.outputUrl;
      aiJobs[cutId] = {
        ...job,
        status: payload.status || job.status,
        progress: payload.progress,
        outputUrl: outputUrl || job.outputUrl || '',
        error: payload.error || '',
        updatedAt: new Date().toISOString()
      };
      if (aiJobs[cutId].status === 'SUCCEEDED' && aiJobs[cutId].outputUrl) state.cuts[cutId].status = 'video';
      if (['FAILED', 'CANCELED'].includes(aiJobs[cutId].status)) {
        aiJobs[cutId].status = 'FAILED';
        state.cuts[cutId].status = 'keyframe';
      }
      saveAiJobs(); saveState(); render(); updatePilotModal();
      if (['PENDING', 'THROTTLED', 'RUNNING'].includes(aiJobs[cutId].status)) schedulePilotPoll(cutId, 5000);
    } catch (error) {
      aiJobs[cutId] = { ...job, lastPollError: error.message };
      saveAiJobs();
      if (activePilotCutId === cutId) {
        const status = document.getElementById('aiPilotStatus');
        const willRetry = !['UNAUTHORIZED', 'CONFIG_REQUIRED'].includes(error.code);
        status.textContent = `상태 확인 실패: ${error.message}${willRetry ? ' · 잠시 후 다시 확인합니다.' : ''}`;
        status.className = 'aiPilotStatus error';
      }
      if (!['UNAUTHORIZED', 'CONFIG_REQUIRED'].includes(error.code)) schedulePilotPoll(cutId, 8000);
    }
  }

  function approveVideoPilot() {
    const cutId = activePilotCutId;
    if (!cutId || !aiJobs[cutId]?.outputUrl) return;
    state.cuts[cutId].status = 'approved';
    saveState(); render(); updatePilotModal();
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
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && activePilotCutId) closeVideoPilot(); });
  window.addEventListener('beforeunload', () => {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    aiPollTimers.forEach((timer) => clearTimeout(timer));
  });
  window.productionBoard = { moveLocation, moveCut, applyRecommendedOrder, changeLocation, setStatus, setNote, resetFilters, uploadSamples, moveSample, deleteSample, openImage, openReferenceLibrary, closeReferenceLibrary, filterReferences, copyPrompt, openVideoPilot, closeVideoPilot, startVideoPilot, approveVideoPilot, updatePilotCost, exportData, importData };
  render();
  if (['PENDING', 'THROTTLED', 'RUNNING'].includes(aiJobs[AI_PILOT_CUT_ID]?.status) && sessionStorage.getItem('blue-christmas-studio-token-v1')) schedulePilotPoll(AI_PILOT_CUT_ID, 800);
})();
