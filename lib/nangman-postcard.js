// 낭만엽서 재생형 공유 — 서버 공용 로직
// 계약: docs/nangman-postcard-share.md
// Pages Functions(functions/api/nangman/postcard/*)와 Node 테스트가 함께 사용한다.

export const CANVAS = { width: 1080, height: 1350 };
export const TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const LIMITS = {
  metaBytes: 1_500_000,
  backgroundBytes: 2_000_000,
  requestBytes: 4_000_000,
  strokes: 3000,
  points: 60000,
  fromChars: 40,
  createsPerHour: 20,
  totalBytes: 2_000_000_000,
  activeCount: 20000,
};
export const SHARE_RE = /^[A-Za-z0-9_-]{22}$/;
export const MANAGE_RE = /^[A-Za-z0-9_-]{43}$/;
const TOOLS = new Set(["pen", "pencil", "marker"]);
const MODES = new Set(["direct", "pad"]);
const COLOR_RE = /^#[0-9A-Fa-f]{8}$/;
const R2_PREFIX = "nangman-postcard/";

// ---------- responses ----------

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex, nofollow",
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...SECURITY_HEADERS,
    },
  });
}

export function fail(status, code, error) {
  return json({ code, error }, status);
}

export const MESSAGES = {
  invalid: "엽서 형식이 올바르지 않아요.",
  empty: "손글씨가 없는 엽서는 재생 링크로 보낼 수 없어요. 이미지로 보내 주세요.",
  too_large: "엽서 용량이 너무 커요.",
  rate_limited: "잠시 후 다시 시도해 주세요. 짧은 시간에 너무 많은 엽서를 만들었어요.",
  unavailable: "엽서 저장소에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.",
  storage_full: "엽서 저장 공간이 가득 찼어요. 잠시 후 다시 시도해 주세요.",
  not_found: "엽서를 찾을 수 없어요. 링크를 다시 확인해 주세요.",
  expired: "보관 기간이 지난 엽서예요.",
  revoked: "보낸 분이 공유를 취소한 엽서예요.",
  unauthorized: "이 엽서를 취소할 권한이 없어요.",
};

export const error = (status, code) => fail(status, code, MESSAGES[code] || code);

// ---------- tokens ----------

function base64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function randomToken(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const keys = (idHash) => ({
  meta: `${R2_PREFIX}${idHash}/meta.json`,
  background: `${R2_PREFIX}${idHash}/background.jpg`,
});

// ---------- validation ----------

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/**
 * Validates the `meta` object and returns a normalized copy containing only
 * known fields (nothing else is ever stored or served).
 * @returns {{ok: true, value: object, points: number} | {ok: false, code: string}}
 */
export function validateMeta(meta) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return { ok: false, code: "invalid" };
  if (meta.format !== "nangman-postcard" || meta.version !== 1) return { ok: false, code: "invalid" };

  let from = null;
  if (meta.from !== undefined && meta.from !== null) {
    if (typeof meta.from !== "string") return { ok: false, code: "invalid" };
    const trimmed = meta.from.trim();
    if ([...trimmed].length > LIMITS.fromChars) return { ok: false, code: "invalid" };
    from = trimmed || null;
  }

  const doc = meta.strokes;
  if (!doc || typeof doc !== "object" || doc.version !== 1) return { ok: false, code: "invalid" };
  if (!doc.canvas || doc.canvas.width !== CANVAS.width || doc.canvas.height !== CANVAS.height) {
    return { ok: false, code: "invalid" };
  }
  if (!Array.isArray(doc.strokes)) return { ok: false, code: "invalid" };
  if (doc.strokes.length === 0) return { ok: false, code: "empty" };
  if (doc.strokes.length > LIMITS.strokes) return { ok: false, code: "too_large" };

  let points = 0;
  const strokes = [];
  for (const s of doc.strokes) {
    if (!s || typeof s !== "object") return { ok: false, code: "invalid" };
    if (!MODES.has(s.mode) || !TOOLS.has(s.tool)) return { ok: false, code: "invalid" };
    if (!(s.group === null || s.group === undefined || Number.isInteger(s.group))) return { ok: false, code: "invalid" };
    if (typeof s.color !== "string" || !COLOR_RE.test(s.color)) return { ok: false, code: "invalid" };
    if (!isNum(s.start) || s.start < 0) return { ok: false, code: "invalid" };
    if (!Array.isArray(s.points) || s.points.length === 0) return { ok: false, code: "invalid" };
    points += s.points.length;
    if (points > LIMITS.points) return { ok: false, code: "too_large" };
    const pts = [];
    for (const p of s.points) {
      if (!Array.isArray(p) || p.length !== 4 || !p.every(isNum)) return { ok: false, code: "invalid" };
      if (p[2] < 0 || p[3] < 0) return { ok: false, code: "invalid" };
      pts.push([p[0], p[1], p[2], p[3]]);
    }
    strokes.push({
      mode: s.mode,
      group: Number.isInteger(s.group) ? s.group : null,
      tool: s.tool,
      color: s.color.toUpperCase(),
      start: s.start,
      points: pts,
    });
  }

  return {
    ok: true,
    points,
    value: {
      format: "nangman-postcard",
      version: 1,
      from,
      strokes: { version: 1, canvas: { width: CANVAS.width, height: CANVAS.height }, strokes },
    },
  };
}

/** JPEG starts with FF D8 FF. */
export function isJpeg(bytes) {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

// ---------- storage ----------

export async function ensureSchema(DB) {
  await DB.prepare(
    "CREATE TABLE IF NOT EXISTS nangman_postcards (" +
      "id_hash TEXT PRIMARY KEY, manage_hash TEXT NOT NULL, ip_hash TEXT NOT NULL, " +
      "bytes INTEGER NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, " +
      "revoked_at INTEGER, purged_at INTEGER)"
  ).run();
  await DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_nangman_postcards_ip ON nangman_postcards(ip_hash, created_at)"
  ).run();
}

export const hasBindings = (env) => Boolean(env && env.DB && env.AUDIO);

/** Deletes stored content (kept row = tombstone so the link can say why it is gone). */
export async function purge(env, idHash, now, field) {
  const k = keys(idHash);
  await env.AUDIO.delete([k.meta, k.background]);
  const set = field === "revoked_at" ? "revoked_at = ?1, purged_at = ?1" : "purged_at = ?1";
  await env.DB.prepare(`UPDATE nangman_postcards SET ${set} WHERE id_hash = ?2`).bind(now, idHash).run();
}

/**
 * Looks up a share token. Returns {row, idHash} when the postcard can be shown,
 * or a ready error Response (404 / 410). Expired content is purged on first read.
 */
export async function findActive(env, token, now = Date.now()) {
  if (typeof token !== "string" || !SHARE_RE.test(token)) return { response: error(404, "not_found") };
  await ensureSchema(env.DB);
  const idHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    "SELECT id_hash, manage_hash, created_at, expires_at, revoked_at, purged_at FROM nangman_postcards WHERE id_hash = ?1"
  ).bind(idHash).first();
  if (!row) return { response: error(404, "not_found") };
  if (row.revoked_at) return { response: error(410, "revoked"), row, idHash };
  if (now >= row.expires_at) {
    if (!row.purged_at) await purge(env, idHash, now, "purged_at");
    return { response: error(410, "expired"), row, idHash };
  }
  if (row.purged_at) return { response: error(410, "expired"), row, idHash };
  return { row, idHash };
}
