// 낭만엽서 받은 엽서 재생기
// 계약: docs/nangman-postcard-share.md · 재생 규칙: stroke-playback-20261012-a.js
import { CANVAS_W, CANVAS_H, isSupported, adaptiveTimeline } from "./stroke-playback-20261013-b.js";

const $ = (id) => document.getElementById(id);
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;
const PRE_ROLL = 0.5; // seconds of empty card before the first stroke
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ERRORS = {
  not_found: ["엽서를 찾을 수 없어요", "링크 주소가 끝까지 복사됐는지 확인해 주세요."],
  expired: ["보관 기간이 지난 엽서예요", "엽서는 보낸 날부터 30일 동안 볼 수 있어요. 보낸 분께 다시 보내 달라고 해 주세요."],
  revoked: ["보낸 분이 공유를 취소한 엽서예요", "이 링크로는 더 이상 엽서를 볼 수 없어요."],
  unsupported: ["새 버전 앱으로 쓴 엽서예요", "이 페이지가 아직 이 엽서를 재생하지 못해요. 잠시 후 다시 열어 주세요."],
  network: ["엽서를 불러오지 못했어요", "인터넷 연결을 확인하고 다시 불러와 주세요."],
  unavailable: ["엽서를 불러오지 못했어요", "엽서 보관소가 잠시 응답하지 않아요. 잠시 후 다시 불러와 주세요."],
};
const RETRYABLE = new Set(["network", "unavailable"]);

const view = (name) => { document.body.dataset.view = name; };

function showError(code) {
  const [title, body] = ERRORS[code] || ERRORS.unavailable;
  $("errorTitle").textContent = title;
  $("errorBody").textContent = body;
  $("retryButton").hidden = !RETRYABLE.has(code);
  document.title = "낭만엽서";
  view("error");
}

// ---------- loading ----------

const token = new URLSearchParams(window.location.search).get("p") || "";
let postcard = null; // { from, expiresAt, image, doc, tl, segments }
let playbackPreset = "auto";

async function load() {
  if (!TOKEN_RE.test(token)) return showError("not_found");
  view("loading");

  let response;
  try {
    response = await fetch(`/api/nangman/postcard/${token}`, {
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
  } catch {
    return showError("network");
  }
  let data = null;
  try { data = await response.json(); } catch { /* handled below */ }
  if (!response.ok || !data) {
    return showError(data?.code || (response.status === 404 ? "not_found" : "unavailable"));
  }
  if (data.format !== "nangman-postcard" || !isSupported(data.strokes)) return showError("unsupported");

  const image = new Image();
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.src = data.background;
  try {
    await image.decode();
  } catch {
    return showError("network");
  }

  playbackPreset = "auto";
  $("speedSelect").value = playbackPreset;
  const tl = adaptiveTimeline(data.strokes, playbackPreset);
  postcard = {
    from: typeof data.from === "string" && data.from.trim() ? data.from.trim() : null,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    image,
    doc: data.strokes,
    tl,
    segments: buildSegments(tl),
  };

  $("greeting").textContent = postcard.from ? `${postcard.from}님이 낭만엽서를 보냈어요` : "낭만엽서가 도착했어요";
  view("envelope");
}

// ---------- envelope ----------

let opened = false;
function openEnvelope() {
  if (opened || !postcard) return;
  opened = true;
  $("openEnvelope").classList.add("is-open");
  window.setTimeout(startPlayer, reduceMotion ? 0 : 1150);
}

// ---------- drawing ----------

/** Every visible piece of ink, ordered by the time it appears (rule P). */
function buildSegments(tl) {
  const segments = [];
  for (const stroke of tl.strokes) {
    const pts = stroke.points;
    if (pts.length === 1) {
      segments.push({ at: pts[0].at, color: stroke.color, dot: pts[0] });
      continue;
    }
    for (let i = 1; i < pts.length; i += 1) {
      segments.push({ at: pts[i].at, color: stroke.color, a: pts[i - 1], b: pts[i] });
    }
  }
  // Stable sort keeps writing order for equal times.
  return segments.map((s, i) => [s, i]).sort((x, y) => x[0].at - y[0].at || x[1] - y[1]).map((x) => x[0]);
}

const canvas = $("card");
const ctx = canvas.getContext("2d");
const ink = document.createElement("canvas");
const inkCtx = ink.getContext("2d");
let scale = 1; // device pixels per postcard unit

function sizeCanvas() {
  const cssWidth = canvas.getBoundingClientRect().width || 320;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = ink.width = Math.round(cssWidth * dpr);
  canvas.height = ink.height = Math.round(cssWidth * 1.25 * dpr);
  // The canvas is exactly 4:5, so rule F gives one scale and no offset.
  scale = canvas.width / CANVAS_W;
}

function drawSegment(seg) {
  inkCtx.strokeStyle = seg.color;
  inkCtx.fillStyle = seg.color;
  if (seg.dot) {
    const r = Math.max(seg.dot.w, 0.5) / 2;
    inkCtx.beginPath();
    inkCtx.arc(seg.dot.x, seg.dot.y, r, 0, Math.PI * 2);
    inkCtx.fill();
    return;
  }
  inkCtx.lineWidth = Math.max((seg.a.w + seg.b.w) / 2, 0.5);
  inkCtx.beginPath();
  inkCtx.moveTo(seg.a.x, seg.a.y);
  inkCtx.lineTo(seg.b.x, seg.b.y);
  inkCtx.stroke();
}

let drawnIndex = 0;

function resetInk() {
  inkCtx.setTransform(1, 0, 0, 1, 0, 0);
  inkCtx.clearRect(0, 0, ink.width, ink.height);
  inkCtx.setTransform(scale, 0, 0, scale, 0, 0);
  inkCtx.lineCap = "round";
  inkCtx.lineJoin = "round";
  drawnIndex = 0;
}

/** Draws ink up to time t (incremental while time moves forward). */
function render(t) {
  const segs = postcard.segments;
  while (drawnIndex < segs.length && segs[drawnIndex].at <= t) {
    drawSegment(segs[drawnIndex]);
    drawnIndex += 1;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(postcard.image, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(ink, 0, 0);
  const duration = postcard.tl.duration;
  $("progressBar").style.width = `${duration > 0 ? Math.min(Math.max(t / duration, 0), 1) * 100 : 100}%`;
}

// ---------- playback ----------

let time = -PRE_ROLL;
let playing = false;
let lastFrame = 0;

const ended = () => time >= postcard.tl.duration;

function updateButtons() {
  const play = $("playButton");
  play.textContent = ended() ? "다시 보기" : playing ? "일시정지" : "이어 보기";
  $("finishButton").disabled = ended();
  $("speedSelect").value = playbackPreset;
}

function frame(now) {
  if (!playing) return;
  const dt = Math.min((now - lastFrame) / 1000, 0.1); // no jump after a background tab
  lastFrame = now;
  time = Math.min(time + dt, postcard.tl.duration);
  render(time);
  if (ended()) {
    playing = false;
    updateButtons();
    return;
  }
  window.requestAnimationFrame(frame);
}

function play() {
  if (playing) return;
  playing = true;
  lastFrame = performance.now();
  updateButtons();
  window.requestAnimationFrame(frame);
}

function pause() {
  playing = false;
  updateButtons();
}

function restart() {
  time = -PRE_ROLL;
  resetInk();
  render(time);
  play();
}

function finish() {
  time = postcard.tl.duration;
  render(time);
  pause();
}

function startPlayer() {
  $("fromLine").textContent = postcard.from ? `${postcard.from}님의 손글씨` : "";
  if (postcard.expiresAt && !Number.isNaN(postcard.expiresAt.getTime())) {
    const day = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(postcard.expiresAt);
    $("note").textContent = `이 엽서는 ${day}까지 볼 수 있어요.`;
  }
  view("player");
  sizeCanvas();
  resetInk();

  if (postcard.segments.length === 0) {
    time = 0;
    render(0);
    for (const id of ["playButton", "restartButton", "speedSelect", "finishButton"]) $(id).disabled = true;
    $("note").textContent = "손글씨 없이 보낸 엽서예요.";
    return;
  }
  if (reduceMotion) {
    // Still let people watch, but start paused with the empty card.
    render(time);
    updateButtons();
    return;
  }
  restart();
}

// ---------- events ----------

$("openEnvelope").addEventListener("click", openEnvelope);
$("replyButton").addEventListener("click", () => {
  const message = $("replyNotice");
  message.hidden = !message.hidden;
  $("replyButton").setAttribute("aria-expanded", String(!message.hidden));
});
$("retryButton").addEventListener("click", load);
$("playButton").addEventListener("click", () => {
  if (ended()) restart();
  else if (playing) pause();
  else play();
});
$("restartButton").addEventListener("click", restart);
$("finishButton").addEventListener("click", finish);
$("speedSelect").addEventListener("change", (event) => {
  if (!postcard) return;
  const before = postcard.tl.duration;
  const elapsed = time;
  playbackPreset = event.target.value;
  postcard.tl = adaptiveTimeline(postcard.doc, playbackPreset);
  postcard.segments = buildSegments(postcard.tl);
  // Keep playback near the same relative position when changing speed.
  time = elapsed < 0 ? elapsed
    : before > 0 ? Math.min(postcard.tl.duration, elapsed / before * postcard.tl.duration)
    : 0;
  lastFrame = performance.now();
  resetInk();
  render(time);
  updateButtons();
});

let resizeTimer = 0;
window.addEventListener("resize", () => {
  if (document.body.dataset.view !== "player" || !postcard) return;
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    sizeCanvas();
    resetInk();
    render(time);
  }, 120);
});

load();
