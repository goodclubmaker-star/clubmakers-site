// 낭만엽서 손글씨 재생 계산 — stroke-format v1 규칙 S·P·F
// 기준: nangman-postcard-ios docs/stroke-format.md, StrokeDocument.swift
// 테스트: scripts/nangman-postcard/golden.test.mjs (앱과 같은 골든 파일)

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;
export const DEFAULT_MAX_GAP = 0.6;
export const CURRENT_VERSION = 1;

const finite = (v) => typeof v === "number" && Number.isFinite(v);
const clean = (v) => (finite(v) && v > 0 ? v : 0);

/** Rule S: drop non-finite points, clamp negatives, make t non-decreasing. */
export function sanitizeStroke(stroke) {
  let running = 0;
  const points = [];
  for (const p of stroke.points || []) {
    if (!Array.isArray(p) || p.length < 4) continue;
    const [x, y, t, w] = p;
    if (!finite(x) || !finite(y) || !finite(w)) continue;
    running = Math.max(running, clean(t));
    points.push([x, y, running, Math.max(0, w)]);
  }
  return { ...stroke, start: clean(stroke.start), points };
}

export const strokeDuration = (s) => (s.points.length ? s.points[s.points.length - 1][2] : 0);

/** Rule P: playback start of each stroke in array order, never decreasing. */
export function playbackStarts(strokes, maxGap = DEFAULT_MAX_GAP, speed = 1) {
  const gapLimit = finite(maxGap) && maxGap >= 0 ? maxGap : DEFAULT_MAX_GAP;
  const rate = finite(speed) && speed > 0 ? speed : 1;
  const starts = [];
  let latestRawEnd = null;
  let playEnd = 0;
  for (const raw of strokes) {
    const s = sanitizeStroke(raw);
    const d = strokeDuration(s);
    const clock = latestRawEnd === null ? 0 : playEnd + Math.min(Math.max(0, s.start - latestRawEnd), gapLimit);
    starts.push(clock / rate);
    latestRawEnd = Math.max(latestRawEnd ?? 0, s.start + d);
    playEnd = clock + d;
  }
  return starts;
}

export function playbackDuration(strokes, maxGap = DEFAULT_MAX_GAP, speed = 1) {
  const rate = finite(speed) && speed > 0 ? speed : 1;
  const starts = playbackStarts(strokes, maxGap, speed);
  let end = 0;
  strokes.forEach((raw, i) => {
    end = Math.max(end, starts[i] + strokeDuration(sanitizeStroke(raw)) / rate);
  });
  return end;
}

/** Rule F: [postcard units per view px, offsetX, offsetY] for a view of w × h. */
export function fit(w, h) {
  let s = Math.min(w / CANVAS_W, h / CANVAS_H);
  if (!(s > 0 && Number.isFinite(s))) s = 1;
  return [1 / s, (w - CANVAS_W * s) / 2, (h - CANVAS_H * s) / 2];
}

/** Version policy: only 1..CURRENT_VERSION can be replayed. */
export function isSupported(doc) {
  return Boolean(
    doc && Number.isInteger(doc.version) && doc.version >= 1 && doc.version <= CURRENT_VERSION && Array.isArray(doc.strokes)
  );
}

/** "#RRGGBBAA" → CSS rgba(). */
export function cssColor(hex) {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex || "");
  if (!m) return "rgba(0,0,0,1)";
  const v = parseInt(m[1], 16);
  const a = m[2] ? parseInt(m[2], 16) / 255 : 1;
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${Math.round(a * 1000) / 1000})`;
}

/**
 * Prepares strokes for drawing: sanitized points and absolute playback time of
 * every point (start of stroke + t / speed), all in postcard units.
 */
export function timeline(doc, speed = 1) {
  const strokes = doc.strokes.map(sanitizeStroke).filter((s) => s.points.length > 0);
  const starts = playbackStarts(strokes, DEFAULT_MAX_GAP, speed);
  const rate = finite(speed) && speed > 0 ? speed : 1;
  return {
    duration: playbackDuration(strokes, DEFAULT_MAX_GAP, speed),
    strokes: strokes.map((s, i) => ({
      color: cssColor(s.color),
      points: s.points.map(([x, y, t, w]) => ({ x, y, w, at: starts[i] + t / rate })),
    })),
  };
}
