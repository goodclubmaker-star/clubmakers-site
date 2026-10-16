// 낭만엽서 받은 엽서 재생기
// 계약: docs/nangman-postcard-share.md · 재생 규칙: stroke-playback-20261012-a.js
import { CANVAS_W, CANVAS_H, isSupported, adaptiveTimeline } from "./stroke-playback-20261013-c.js";

const $ = (id) => document.getElementById(id);
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;
const PRE_ROLL = 0.5; // seconds of empty card before the first stroke
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ERRORS = {
  not_found: ["엽서를 찾을 수 없어요", "링크 주소가 끝까지 복사됐는지 확인해 주세요."],
  expired: ["보관 기간이 종료된 엽서입니다", "엽서는 보낸 날부터 10일 동안 볼 수 있어요. 보낸 분께 다시 보내 달라고 해 주세요."],
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
const PLAYBACK_SPEED = "3"; // Fixed for all recipients, including existing share links.

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
  if (data.sealed) return showSealed(data);
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

  const tl = adaptiveTimeline(data.strokes, PLAYBACK_SPEED);
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

// ---------- sealed (special stamp: 시간을 담아 보내는 편지) ----------

let sealedTimer = 0;
const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric", month: "long", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit",
});

function remainingText(ms) {
  const min = Math.ceil(ms / 60000);
  const days = Math.floor(min / 1440);
  const hours = Math.floor((min % 1440) / 60);
  const mins = min % 60;
  if (days > 0) return `도착까지 ${days}일${hours ? ` ${hours}시간` : ""}`;
  if (hours > 0) return `도착까지 ${hours}시간${mins ? ` ${mins}분` : ""}`;
  return `도착까지 ${Math.max(mins, 1)}분`;
}

/** The server keeps the handwriting locked; this page only waits and counts down. */
function showSealed(data) {
  const opensAt = new Date(data.opensAt);
  const from = typeof data.from === "string" && data.from.trim() ? data.from.trim() : null;
  $("sealedFrom").textContent = from ? `${from}님이 보낸 엽서가 오고 있어요` : "엽서가 오고 있어요";
  $("sealedDate").textContent = dateFormat.format(opensAt);
  $("sealedCalendar").href = data.calendar;
  document.title = "낭만엽서 · 시간을 담아 보내는 편지";
  view("sealed");

  window.clearInterval(sealedTimer);
  const tick = () => {
    const left = opensAt.getTime() - Date.now();
    if (left <= 0) {
      window.clearInterval(sealedTimer);
      $("sealedCountdown").textContent = "엽서가 도착했어요";
      // A few seconds of slack in case this device's clock runs ahead.
      window.setTimeout(load, 3000);
      return;
    }
    $("sealedCountdown").textContent = remainingText(left);
  };
  tick();
  sealedTimer = window.setInterval(tick, 15000);
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
    for (const id of ["playButton", "restartButton", "finishButton"]) $(id).disabled = true;
    $("note").textContent = "손글씨 없이 보낸 엽서예요.";
    return;
  }
  // The envelope itself must be opened by the recipient. After that
  // intentional tap, always start the 3x handwriting replay automatically.
  // Reduce Motion only shortens the envelope animation (see openEnvelope);
  // it must not force an additional Play tap on either mobile platform.
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


// Recipient-only local video export. Never uploads the recording.
const saveButton = $("saveVideoButton");
const saveStatus = $("videoSaveStatus");
let savingVideo = false;
let recording = null;
let capture = null;
let saveTimer = null;
const recordingSupported = typeof canvas.captureStream === "function" && typeof MediaRecorder !== "undefined";
function videoMessage(s) { saveStatus.textContent = s; }
function recordingType() {
  return ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp8", "video/webm"]
    .find(t => MediaRecorder.isTypeSupported(t)) || "";
}
function cleanupRecording() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  capture?.getTracks().forEach(t => t.stop());
  capture = null;
  recording = null;
  savingVideo = false;
  saveButton.disabled = !recordingSupported;
  ["playButton", "restartButton", "finishButton"].forEach(id => $(id).disabled = false);
  updateButtons();
}
async function offerVideo(blob, mime) {
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  const filename = "nangman-postcard." + ext;
  const file = new File([blob], filename, { type: mime });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "낭만엽서 손글씨 영상" });
      videoMessage("영상 공유 메뉴를 열었어요. ‘파일에 저장’을 선택할 수 있어요.");
      return;
    } catch (e) {
      if (e.name === "AbortError") { videoMessage("영상 저장을 취소했어요."); return; }
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  videoMessage("영상 다운로드를 요청했어요. 파일 앱의 다운로드 항목을 확인해 주세요.");
}
saveButton.addEventListener("click", () => {
  if (savingVideo || !postcard || !postcard.segments.length) return;
  if (!recordingSupported) return videoMessage("영상 저장을 지원하지 않는 브라우저예요.");
  const mime = recordingType();
  if (!mime) return videoMessage("이 브라우저는 영상 인코딩을 지원하지 않아요.");
  try {
    pause();
    capture = canvas.captureStream(30);
    const chunks = [];
    recording = new MediaRecorder(capture, { mimeType: mime, videoBitsPerSecond: 3500000 });
    recording.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
    recording.onerror = () => { videoMessage("녹화에 실패했어요."); cleanupRecording(); };
    recording.onstop = async () => {
      const blob = new Blob(chunks, { type: mime });
      cleanupRecording();
      if (!blob.size) return videoMessage("영상이 비어 있어요. 다시 시도해 주세요.");
      try { await offerVideo(blob, mime); }
      catch { videoMessage("영상 저장에 실패했어요."); }
    };
    recording.start(1000);
    savingVideo = true;
    saveButton.disabled = true;
    ["playButton", "restartButton", "finishButton"].forEach(id => $(id).disabled = true);
    time = -PRE_ROLL;
    resetInk();
    render(time);
    playing = true;
    lastFrame = performance.now();
    requestAnimationFrame(frame);
    videoMessage("영상 녹화 중이에요. 화면을 유지해 주세요.");
    saveTimer = setTimeout(() => {
      if (recording?.state === "recording") recording.stop();
    }, (postcard.tl.duration + PRE_ROLL + 0.8) * 1000);
  } catch {
    cleanupRecording();
    videoMessage("영상 녹화를 시작하지 못했어요.");
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && savingVideo && recording?.state === "recording") {
    recording.stop();
  }
});
if (!recordingSupported) {
  saveButton.disabled = true;
  videoMessage("이 브라우저는 영상 저장을 지원하지 않아요. 최신 Safari에서 열어 주세요.");
}
