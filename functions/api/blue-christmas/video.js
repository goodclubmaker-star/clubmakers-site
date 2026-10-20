const RUNWAY_API = 'https://api.dev.runwayml.com/v1';
const RUNWAY_VERSION = '2024-11-06';

const MODELS = {
  gen4_turbo: { duration: 5, ratio: '1280:720' },
  'gen4.5': { duration: 5, ratio: '1280:720' }
};

const PILOT_CUTS = {
  'S16-C02': {
    imagePath: '/blue-christmas/storyboard-assets/S16/S16-C02_gwanghwamun_traffic_island_v004.webp',
    defaultPrompt: `Create a 5-second cinematic image-to-video shot from this exact first frame: a crowded Gwanghwamun intersection in winter Seoul, 2023. Preserve the high oblique wide composition, small traffic island, palace frontage, dense crowds, buses and cars, wet-road reflections, and every established light and color. Rudolf is the same human Korean man in the approved keyframe: large round sturdy body, innocent face, brown vintage aviator trapper cap with goggles resting on top, olive bulky parka, faded red scarf, dark trousers, winter boots, old backpack, and the same worn folded paper map. He stays safely planted at the center of the island, looks down at the map, turns only its top edge slightly, glances once toward the flowing city, then returns his eyes to the map with restrained confusion. Traffic and pedestrians flow around him in clear lanes without touching him. Headlights and reflections move naturally. Use a very slow, nearly imperceptible push toward Rudolf while keeping the original high-angle geometry locked. One continuous shot, restrained limited animation, lonely gentle comedy inside an overwhelming city. Preserve both hands, map folds, face, costume, and body proportions. No location change, no collision, no character redesign, no thin body, no antlers, no animal ears, no red nose, no mascot face, no extra fingers, no morphing, no melting architecture, no subtitles, no letters, no logo, no watermark, no style conversion.`
  }
};

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: RESPONSE_HEADERS });
}

function safeEqual(left, right) {
  const a = new TextEncoder().encode(String(left || ''));
  const b = new TextEncoder().encode(String(right || ''));
  let different = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) different |= (a[index] || 0) ^ (b[index] || 0);
  return different === 0;
}

function authenticate(context) {
  const apiSecret = context.env.RUNWAYML_API_SECRET;
  const studioToken = context.env.BLUE_CHRISTMAS_STUDIO_TOKEN;
  if (!apiSecret || !studioToken) {
    return {
      response: json({
        code: 'CONFIG_REQUIRED',
        message: 'Cloudflare에 RUNWAYML_API_SECRET와 BLUE_CHRISTMAS_STUDIO_TOKEN을 암호화된 비밀 값으로 등록한 뒤 다시 배포해야 합니다.'
      }, 503)
    };
  }
  const supplied = context.request.headers.get('X-Blue-Christmas-Token') || '';
  if (!safeEqual(supplied, studioToken)) {
    return { response: json({ code: 'UNAUTHORIZED', message: '제작 암호가 맞지 않습니다.' }, 401) };
  }
  return { apiSecret };
}

async function runwayRequest(apiSecret, path, init = {}) {
  const response = await fetch(`${RUNWAY_API}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${apiSecret}`,
      'X-Runway-Version': RUNWAY_VERSION,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; }
  catch { payload = { message: text || 'Runway 응답을 읽지 못했습니다.' }; }
  if (!response.ok) {
    const message = payload.message || payload.error || payload.detail || `Runway 요청 실패 (${response.status})`;
    throw Object.assign(new Error(typeof message === 'string' ? message : JSON.stringify(message)), { status: response.status });
  }
  return payload;
}

export async function onRequestPost(context) {
  const auth = authenticate(context);
  if (auth.response) return auth.response;
  let body;
  try { body = await context.request.json(); }
  catch { return json({ code: 'INVALID_JSON', message: '요청 내용을 읽지 못했습니다.' }, 400); }

  const cutId = String(body.cutId || '');
  const pilot = PILOT_CUTS[cutId];
  if (!pilot) return json({ code: 'CUT_NOT_ALLOWED', message: '현재는 S16-C02 파일럿만 생성할 수 있습니다.' }, 400);

  const model = String(body.model || 'gen4_turbo');
  const modelConfig = MODELS[model];
  if (!modelConfig) return json({ code: 'MODEL_NOT_ALLOWED', message: '허용되지 않은 영상 모델입니다.' }, 400);

  const prompt = String(body.prompt || pilot.defaultPrompt).trim();
  if (!prompt || prompt.length > 5000) return json({ code: 'INVALID_PROMPT', message: '프롬프트는 1–5000자여야 합니다.' }, 400);

  const origin = new URL(context.request.url).origin;
  const promptImage = new URL(pilot.imagePath, origin).href;
  try {
    const task = await runwayRequest(auth.apiSecret, '/image_to_video', {
      method: 'POST',
      body: JSON.stringify({
        model,
        promptImage,
        promptText: prompt,
        ratio: modelConfig.ratio,
        duration: modelConfig.duration
      })
    });
    return json({ taskId: task.id, status: task.status || 'PENDING', cutId, model, promptImage });
  } catch (error) {
    return json({ code: 'RUNWAY_START_FAILED', message: error.message }, error.status >= 400 && error.status < 600 ? error.status : 502);
  }
}

export async function onRequestGet(context) {
  const auth = authenticate(context);
  if (auth.response) return auth.response;
  const url = new URL(context.request.url);
  const cutId = url.searchParams.get('cutId') || '';
  const taskId = url.searchParams.get('id') || '';
  if (!PILOT_CUTS[cutId]) return json({ code: 'CUT_NOT_ALLOWED', message: '허용되지 않은 파일럿 컷입니다.' }, 400);
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(taskId)) return json({ code: 'INVALID_TASK', message: 'Runway 작업 ID가 올바르지 않습니다.' }, 400);
  try {
    const task = await runwayRequest(auth.apiSecret, `/tasks/${encodeURIComponent(taskId)}`);
    const output = Array.isArray(task.output)
      ? task.output.filter((item) => typeof item === 'string' && item.startsWith('https://'))
      : [];
    return json({
      taskId: task.id || taskId,
      status: task.status || 'PENDING',
      progress: task.progress,
      output,
      error: task.failure || task.failureCode || ''
    });
  } catch (error) {
    return json({ code: 'RUNWAY_STATUS_FAILED', message: error.message }, error.status >= 400 && error.status < 600 ? error.status : 502);
  }
}
