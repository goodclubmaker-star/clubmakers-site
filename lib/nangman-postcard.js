// 낭만엽서 재생형 공유 — 서버 공용 로직
// 계약: docs/nangman-postcard-share.md
// Pages Functions(functions/api/nangman/postcard/*)와 Node 테스트가 함께 사용한다.

export const CANVAS = { width: 1080, height: 1350 };
/** 보관 기간: 업로드 완료 시점부터 10일 (2026-10-13 결정, 이전 30일). */
export const TTL_DAYS = 10;
export const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Special stamp "시간을 담아 보내는 편지": the postcard stays sealed until
 * opens_at (1 hour .. 1 year after sending) and is then viewable for TTL.
 * The retention clock starts at opens_at for sealed postcards, created_at otherwise.
 */
export const SEAL_MIN_MS = 60 * 60 * 1000;
export const SEAL_MAX_MS = 366 * 24 * 60 * 60 * 1000;
/** Clock skew allowed on the app's chosen time (a 1-hour pick sent a bit late). */
export const SEAL_SKEW_MS = 5 * 60 * 1000;
export const retentionStart = (row) => Number(row.opens_at ?? row.created_at);
export const isSealed = (row, now = Date.now()) => row.opens_at != null && now < Number(row.opens_at);

/**
 * Effective expiry: the earlier of the stored expires_at and retention start + TTL.
 * Links issued under the old 30-day policy are therefore also cut at 10 days.
 */
export const effectiveExpiry = (row) => Math.min(Number(row.expires_at), retentionStart(row) + TTL_MS);
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
/**
 * Launch safety ceiling: remains at the current conservative 2 GB / 20k until
 * Cloudflare R2 lifecycle rules, D1 throughput and cost alerts are verified.
 * Operators may raise ceilings WITHOUT redeploying after a load test.
 * Values above 100 GB or 200k postcards need a redesigned aggregate counter:
 * current INSERT checks COUNT/SUM against active rows.
 */
export function postcardCapacityLimits(env = {}) {
  const parse = (raw, fallback, maximum) => {
    if (raw === undefined || raw === null || raw === "") return fallback;
    if (!/^\\d+$/.test(String(raw))) return fallback;
    const value = Number(raw);
    return Number.isSafeInteger(value) && value >= fallback && value <= maximum
      ? value : fallback;
  };
  return {
    totalBytes: parse(env.NANGMAN_ACTIVE_BYTES_CAP, LIMITS.totalBytes, 100_000_000_000),
    activeCount: parse(env.NANGMAN_ACTIVE_COUNT_CAP, LIMITS.activeCount, 200_000),
  };
}

export const SHARE_RE = /^[A-Za-z0-9_-]{22}$/;
export const MANAGE_RE = /^[A-Za-z0-9_-]{43}$/;
const TOOLS = new Set(["pen", "pencil", "marker"]);
const MODES = new Set(["direct", "pad"]);
const COLOR_RE = /^#[0-9A-Fa-f]{8}$/;
const R2_PREFIX = "nangman-postcard/";
// Sealed postcards live under their own prefix so the 11-day R2 lifecycle rule
// on R2_PREFIX never deletes them before they open (rule: 377 days here).
const R2_SEALED_PREFIX = "nangman-postcard-sealed/";

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
  expired: "보관 기간이 종료된 엽서입니다.",
  revoked: "보낸 분이 공유를 취소한 엽서예요.",
  unauthorized: "이 엽서를 취소할 권한이 없어요.",
  invalid_open_time: "도착 시간은 1시간 뒤부터 1년 안으로 정해 주세요.",
  sealed: "아직 도착하지 않은 엽서예요.",
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

export const keys = (idHash, sealed = false) => {
  const prefix = sealed ? R2_SEALED_PREFIX : R2_PREFIX;
  return { meta: `${prefix}${idHash}/meta.json`, background: `${prefix}${idHash}/background.jpg` };
};
/** Keys for a stored row (sealed postcards keep their prefix after opening). */
export const keysFor = (idHash, row) => keys(idHash, row?.opens_at != null);

/**
 * Validates the requested opening time. Returns null (no seal), a number, or
 * { error } when out of range.
 */
export function parseOpensAt(value, now = Date.now()) {
  if (value === undefined || value === null) return null;
  const ms = typeof value === "string" ? Date.parse(value) : value;
  if (typeof ms !== "number" || !Number.isFinite(ms)) return { error: "invalid" };
  if (ms < now + SEAL_MIN_MS - SEAL_SKEW_MS || ms > now + SEAL_MAX_MS) return { error: "invalid_open_time" };
  return Math.round(ms);
}

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

const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

/**
 * Walks the JPEG marker segments up to the frame header and returns its size,
 * or null if the file is not a structurally valid JPEG (bad markers, segment
 * running past the end, no frame header, or no end-of-image marker).
 */
export function jpegSize(bytes) {
  if (!isJpeg(bytes)) return null;
  const n = bytes.length;
  if (bytes[n - 2] !== 0xff || bytes[n - 1] !== 0xd9) return null;
  let i = 2;
  while (i + 4 <= n) {
    if (bytes[i] !== 0xff) return null;
    let marker = bytes[i + 1];
    while (marker === 0xff && i + 2 < n) { i += 1; marker = bytes[i + 1]; } // fill bytes
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    if (marker === 0xd9 || marker === 0xda) return null; // image data before a frame header
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2 || i + 2 + length > n) return null;
    if (SOF_MARKERS.has(marker)) {
      if (length < 7) return null;
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return { width, height };
    }
    i += 2 + length;
  }
  return null;
}

/**
 * Reads the request body with a hard byte cap (also when there is no
 * Content-Length, e.g. chunked uploads) and parses it as multipart form data.
 * Returns {form} or {code} ("too_large" / "invalid").
 */
export async function readLimitedForm(request, maxBytes) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) return { code: "too_large" };
  if (!request.body) return { code: "invalid" };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return { code: "too_large" };
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { body.set(c, offset); offset += c.byteLength; }
  try {
    const form = await new Response(body, {
      headers: { "content-type": request.headers.get("content-type") || "" },
    }).formData();
    return { form };
  } catch {
    return { code: "invalid" };
  }
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
  // Additive migration: existing rows are ordinary (NULL = opens immediately).
  const columns = await DB.prepare("PRAGMA table_info(nangman_postcards)").all();
  if (!(columns?.results || []).some((c) => c.name === "opens_at")) {
    try {
      await DB.prepare("ALTER TABLE nangman_postcards ADD COLUMN opens_at INTEGER").run();
    } catch (e) {
      if (!/duplicate column name/i.test(String(e))) throw e;
    }
  }
}

export const hasBindings = (env) => Boolean(env && env.DB && env.AUDIO);

/**
 * Atomically reserves a row for a new postcard. The rate limit (per IP hash)
 * and the global caps are checked in the same INSERT ... SELECT statement, so
 * concurrent requests cannot all pass the check (D1 runs each statement
 * atomically). Only live (not expired, not purged) postcards count toward the
 * global caps, so expired data never blocks new postcards.
 * @returns {Promise<boolean>} false when a limit is reached
 */
export async function reserve(env, r, now) {
  const capacity = postcardCapacityLimits(env);
  const result = await env.DB.prepare(
    "INSERT INTO nangman_postcards (id_hash, manage_hash, ip_hash, bytes, created_at, expires_at, opens_at) " +
      "SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?12 WHERE " +
      "(SELECT COUNT(*) FROM nangman_postcards WHERE ip_hash = ?3 AND created_at > ?7) < ?8 " +
      "AND (SELECT COALESCE(SUM(bytes), 0) FROM nangman_postcards WHERE purged_at IS NULL AND expires_at > ?5 AND COALESCE(opens_at, created_at) > ?11) + ?4 <= ?9 " +
      "AND (SELECT COUNT(*) FROM nangman_postcards WHERE purged_at IS NULL AND expires_at > ?5 AND COALESCE(opens_at, created_at) > ?11) < ?10"
  ).bind(
    r.idHash, r.manageHash, r.ipHash, r.bytes, now, r.expiresAt,
    now - 60 * 60 * 1000, LIMITS.createsPerHour, capacity.totalBytes, capacity.activeCount,
    now - TTL_MS, r.opensAt ?? null
  ).run();
  return (result?.meta?.changes || 0) === 1;
}

/** Tells apart the two reasons `reserve` can refuse, for the error message. */
export async function refusalReason(env, ipHash, now) {
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM nangman_postcards WHERE ip_hash = ?1 AND created_at > ?2"
  ).bind(ipHash, now - 60 * 60 * 1000).first();
  return (recent?.c || 0) >= LIMITS.createsPerHour ? "rate_limited" : "storage_full";
}

/**
 * Deletes the content of up to `limit` expired postcards. Runs on every create
 * and read; the R2 lifecycle rule on the `nangman-postcard/` prefix is the
 * backstop when there is no traffic (docs/nangman-postcard-share.md §5).
 * @returns {Promise<number>} how many were purged
 */
export async function sweepExpired(env, now = Date.now(), limit = 25) {
  const rows = await env.DB.prepare(
    "SELECT id_hash FROM nangman_postcards WHERE purged_at IS NULL AND (expires_at <= ?1 OR COALESCE(opens_at, created_at) <= ?3) LIMIT ?2"
  ).bind(now, limit, now - TTL_MS).all();
  const list = rows?.results || [];
  for (const row of list) await purge(env, row.id_hash, now, "purged_at");
  return list.length;
}

/** Deletes stored content (kept row = tombstone so the link can say why it is gone). */
export async function purge(env, idHash, now, field) {
  const k = keys(idHash);
  const s = keys(idHash, true);
  await env.AUDIO.delete([k.meta, k.background, s.meta, s.background]);
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
    "SELECT id_hash, manage_hash, created_at, expires_at, opens_at, revoked_at, purged_at FROM nangman_postcards WHERE id_hash = ?1"
  ).bind(idHash).first();
  if (!row) return { response: error(404, "not_found") };
  if (row.revoked_at) return { response: error(410, "revoked"), row, idHash };
  if (now >= effectiveExpiry(row)) {
    if (!row.purged_at) await purge(env, idHash, now, "purged_at");
    return { response: error(410, "expired"), row, idHash };
  }
  if (row.purged_at) return { response: error(410, "expired"), row, idHash };
  return { row, idHash };
}
