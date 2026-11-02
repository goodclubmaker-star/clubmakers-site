// 공작소 작업대(/studio/*) 공용 함수 — 『실제적인 클럽피팅』 연재 작업대
// Pages 환경 변수:
//   STUDIO_TOKEN  작업대 비밀번호 (16자 이상)
//   GITHUB_TOKEN  clubmakers-site 저장소 Contents 쓰기 권한 토큰 (fine-grained)
// D1: 기존 DB 바인딩을 같이 쓴다 (studio_ 접두 테이블).

export const REPO = "goodclubmaker-star/clubmakers-site";
export const BRANCH = "main";
export const JOURNAL_DIR = "src/content/journal";

const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex, nofollow",
};
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });
export const fail = (status, code, message) => json({ error: code, message }, status);

async function digest(v) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)));
}
export async function authorized(request, env) {
  const token = env?.STUDIO_TOKEN;
  if (typeof token !== "string" || token.length < 16) return "not_configured";
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return "unauthorized";
  const supplied = auth.slice(7);
  if (supplied.length > 500) return "unauthorized";
  const [a, b] = await Promise.all([digest(supplied), digest(token)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0 ? "ok" : "unauthorized";
}
// 모든 /api/studio 핸들러의 공통 입구: 인증 + DB + 스키마
export async function guard(request, env) {
  const a = await authorized(request, env);
  if (a === "not_configured") return { res: fail(503, "not_configured", "Cloudflare에 STUDIO_TOKEN이 아직 설정되지 않았습니다.") };
  if (a !== "ok") return { res: fail(401, "unauthorized", "비밀번호가 맞지 않습니다.") };
  if (!env.DB) return { res: fail(503, "db_unavailable", "D1 데이터베이스 연결이 없습니다.") };
  await ensureSchema(env.DB);
  return { db: env.DB };
}

let schemaReady = false;
export async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS studio_sections (book TEXT NOT NULL, id TEXT NOT NULL, ord INTEGER NOT NULL, grp TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY (book, id))"),
    db.prepare("CREATE TABLE IF NOT EXISTS studio_books (book TEXT PRIMARY KEY, source TEXT, count INTEGER, uploaded_at TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS studio_progress (book TEXT NOT NULL, id TEXT NOT NULL, status TEXT NOT NULL, draft TEXT, meta TEXT, file TEXT, commit_url TEXT, updated_at TEXT, PRIMARY KEY (book, id))"),
  ]);
  schemaReady = true;
}

export const nowKst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 19).replace("T", " ");

export async function readJson(request, max) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > max) return { error: fail(413, "too_large", "내용이 너무 큽니다.") };
  const text = await request.text();
  if (text.length > max) return { error: fail(413, "too_large", "내용이 너무 큽니다.") };
  try { return { body: JSON.parse(text) }; } catch { return { error: fail(400, "invalid", "요청 형식이 맞지 않습니다.") }; }
}

// ── 일지 파일 만들기 ──────────────────────────────────────────
const CATEGORIES = ["log", "review", "trends", "data"];
const CLUBS = ["driver", "fairway", "hybrid", "iron", "wedge", "putter", "mixed"];
export function cleanMeta(m = {}) {
  const s = (v, n) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(m.pubDate) ? m.pubDate : nowKst().slice(0, 10);
  return {
    title: s(m.title, 200),
    description: s(m.description, 300),
    pubDate: date,
    category: CATEGORIES.includes(m.category) ? m.category : "log",
    clubType: CLUBS.includes(m.clubType) ? m.clubType : "",
    tags: (Array.isArray(m.tags) ? m.tags : []).map(t => s(t, 40)).filter(Boolean).slice(0, 12),
  };
}
export function buildMarkdown(meta, body) {
  const q = v => JSON.stringify(v);
  const fm = ["---", `title: ${q(meta.title)}`];
  if (meta.description) fm.push(`description: ${q(meta.description)}`);
  fm.push(`pubDate: ${meta.pubDate}`, `category: ${meta.category}`, "tags: [" + meta.tags.map(q).join(", ") + "]");
  if (meta.clubType) fm.push(`clubType: ${meta.clubType}`);
  fm.push("draft: false", "---", "");
  return fm.join("\n") + "\n" + String(body).replace(/\r\n/g, "\n").trim() + "\n";
}
export const fileNameFor = (id, date) => `${date}-practical-fitting-${id}.md`;

// ── GitHub ───────────────────────────────────────────────────
function b64utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function gh(env, path, init = {}) {
  return fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "clubmakers-studio",
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
}
// 같은 경로에 이미 파일이 있으면 덮어쓴다 (수정 재등록).
export async function commitFile(env, path, content, message) {
  if (!env.GITHUB_TOKEN) return { ok: false, status: 503, code: "github_not_configured", message: "Cloudflare에 GITHUB_TOKEN이 아직 설정되지 않았습니다." };
  const enc = path.split("/").map(encodeURIComponent).join("/");
  let sha;
  const head = await gh(env, `contents/${enc}?ref=${BRANCH}`);
  if (head.status === 200) sha = (await head.json()).sha;
  else if (head.status === 401 || head.status === 403) return { ok: false, status: 502, code: "github_denied", message: "GitHub 토큰 권한을 확인해 주세요 (Contents 읽기·쓰기)." };
  const res = await gh(env, `contents/${enc}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: b64utf8(content), branch: BRANCH, ...(sha ? { sha } : {}) }),
  });
  if (res.status === 200 || res.status === 201) {
    const d = await res.json();
    return { ok: true, updated: !!sha, commitUrl: d?.commit?.html_url || "", fileUrl: d?.content?.html_url || "" };
  }
  const detail = await res.text().catch(() => "");
  return { ok: false, status: 502, code: "github_failed", message: `GitHub 등록 실패 (${res.status}) ${detail.slice(0, 160)}` };
}
export const BOOK = "practical-fitting";
