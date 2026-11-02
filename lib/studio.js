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
  if (typeof token !== "string" || !token) return "not_configured";
  if (token.length < 16) return "too_short";
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
  if (a === "not_configured") return { res: fail(503, "not_configured", "Cloudflare에 STUDIO_TOKEN이 아직 설정되지 않았습니다. (값을 넣은 뒤에는 다시 배포해야 적용됩니다)") };
  if (a === "too_short") return { res: fail(503, "too_short", "STUDIO_TOKEN이 16자보다 짧습니다. 16자 이상으로 다시 넣어 주세요.") };
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
    db.prepare("CREATE TABLE IF NOT EXISTS studio_photos (id TEXT PRIMARY KEY, owner TEXT NOT NULL, mime TEXT NOT NULL, b64 TEXT NOT NULL, name TEXT, created_at TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS studio_posts (id TEXT PRIMARY KEY, status TEXT NOT NULL, draft TEXT, meta TEXT, file TEXT, commit_url TEXT, updated_at TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS studio_progress (book TEXT NOT NULL, id TEXT NOT NULL, status TEXT NOT NULL, draft TEXT, meta TEXT, file TEXT, commit_url TEXT, updated_at TEXT, PRIMARY KEY (book, id))"),
  ]);
  // 묶음 등록: 대표 절(lead)이 members 목록을 갖고, 나머지 절은 lead를 가리킨다.
  const cols = (await db.prepare("PRAGMA table_info(studio_progress)").all()).results.map(c => c.name);
  const add = [];
  if (!cols.includes("members")) add.push(db.prepare("ALTER TABLE studio_progress ADD COLUMN members TEXT"));
  if (!cols.includes("lead")) add.push(db.prepare("ALTER TABLE studio_progress ADD COLUMN lead TEXT"));
  if (add.length) await db.batch(add);
  schemaReady = true;
}

// 요청의 members를 검증: 대표 절이 맨 앞, 원고 순서대로 (떨어진 절도 허용).
export async function resolveMembers(db, lead, members) {
  const list = Array.isArray(members) && members.length ? members.map(String) : [lead];
  if (list[0] !== lead || list.length > 80 || new Set(list).size !== list.length) return null;
  const rows = (await db.prepare("SELECT id, ord FROM studio_sections WHERE book = ? AND id IN (SELECT value FROM json_each(?)) ORDER BY ord")
    .bind(BOOK, JSON.stringify(list)).all()).results;
  if (rows.length !== list.length) return null;
  for (let i = 0; i < rows.length; i++) if (rows[i].id !== list[i]) return null;
  return list;
}
// 묶음에서 빠진 절은 풀고, 묶음에 든 절은 대표 절과 같은 상태로 맞춘다.
export function bundleStatements(db, lead, list, status, at) {
  const ids = JSON.stringify(list);
  const out = [
    db.prepare("UPDATE studio_progress SET lead = NULL, file = NULL, commit_url = NULL, status = CASE WHEN draft IS NOT NULL AND draft <> '' THEN 'reviewed' ELSE 'todo' END, updated_at = ? " +
      "WHERE book = ? AND lead = ? AND id NOT IN (SELECT value FROM json_each(?))").bind(at, BOOK, lead, ids),
  ];
  for (const id of list.slice(1)) out.push(db.prepare(
    "INSERT INTO studio_progress (book, id, status, lead, updated_at) VALUES (?, ?, ?, ?, ?) " +
    "ON CONFLICT(book, id) DO UPDATE SET status = excluded.status, lead = excluded.lead, members = NULL, updated_at = excluded.updated_at"
  ).bind(BOOK, id, status, lead, at));
  return out;
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
const CATEGORIES = ["log", "review", "trends", "data", "series"];
const CLUBS = ["driver", "fairway", "hybrid", "iron", "wedge", "putter", "mixed"];
export const SERIES_KEYS = ["practical-fitting"];
export function cleanMeta(m = {}) {
  const s = (v, n) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(m.pubDate) ? m.pubDate : nowKst().slice(0, 10);
  const no = Number(m.seriesNo);
  return {
    title: s(m.title, 200),
    description: s(m.description, 300),
    pubDate: date,
    category: CATEGORIES.includes(m.category) ? m.category : "log",
    clubType: CLUBS.includes(m.clubType) ? m.clubType : "",
    tags: (Array.isArray(m.tags) ? m.tags : []).map(t => s(t, 40)).filter(Boolean).slice(0, 12),
    series: SERIES_KEYS.includes(m.series) ? m.series : "",
    seriesNo: Number.isInteger(no) && no > 0 && no < 100000 ? no : 0,
    seriesPart: s(m.seriesPart, 40),
    cover: /^(photo:[a-z0-9]{6,40}|\/images\/journal\/[\w\-./]+)$/.test(m.cover || "") ? m.cover : "",
    slug: String(m.slug || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60),
  };
}
export function buildMarkdown(meta, body) {
  const q = v => JSON.stringify(v);
  const fm = ["---", `title: ${q(meta.title)}`];
  if (meta.description) fm.push(`description: ${q(meta.description)}`);
  fm.push(`pubDate: ${meta.pubDate}`, `category: ${meta.category}`, "tags: [" + meta.tags.map(q).join(", ") + "]");
  if (meta.clubType) fm.push(`clubType: ${meta.clubType}`);
  if (meta.series) {
    fm.push(`series: ${meta.series}`);
    if (meta.seriesNo) fm.push(`seriesNo: ${meta.seriesNo}`);
    if (meta.seriesPart) fm.push(`seriesPart: ${q(meta.seriesPart)}`);
  }
  if (meta.cover && meta.cover.startsWith("/images/")) fm.push(`cover: ${q(meta.cover)}`);
  fm.push("draft: false", "---", "");
  return fm.join("\n") + "\n" + String(body).replace(/\r\n/g, "\n").trim() + "\n";
}
export const fileNameFor = (id, date) => `${date}-practical-fitting-${id}.md`;

// ── 사진 ─────────────────────────────────────────────────────
// 작업대에서 줄여 올린 사진은 D1에 잠시 보관하고, 본문에는 (photo:ID)로 적어 둔다.
// 등록할 때 public/images/journal/<글 이름>/ 에 같이 커밋하고 주소를 바꿔 넣는다.
const PHOTO_RE = /photo:([a-z0-9]{6,40})/g;
export async function resolvePhotos(db, slugBase, body, meta) {
  const ids = [...new Set([...String(body).matchAll(PHOTO_RE), ...String(meta.cover || "").matchAll(PHOTO_RE)].map(m => m[1]))];
  if (!ids.length) return { body, meta, files: [] };
  const rows = (await db.prepare("SELECT id, mime, b64 FROM studio_photos WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all()).results;
  const found = new Map(rows.map(r => [r.id, r]));
  const missing = ids.filter(i => !found.has(i));
  if (missing.length) return { error: `본문에 넣은 사진 ${missing.length}장을 찾지 못했습니다. 다시 첨부해 주세요.` };
  const files = [], map = {};
  ids.forEach((id, i) => {
    const r = found.get(id);
    const ext = r.mime === "image/png" ? "png" : r.mime === "image/webp" ? "webp" : "jpg";
    const web = `/images/journal/${slugBase}/${String(i + 1).padStart(2, "0")}-${id.slice(0, 6)}.${ext}`;
    map[id] = web;
    files.push({ path: "public" + web, b64: r.b64 });
  });
  const swap = t => String(t).replace(PHOTO_RE, (_, id) => map[id] || _);
  return { body: swap(body), meta: { ...meta, cover: meta.cover ? swap(meta.cover) : "" }, files };
}

// 일지 한 편 등록: 사진 + md 파일을 한 커밋으로
export async function publishJournal(env, db, { file, meta, body, message }) {
  const slugBase = file.replace(/\.md$/, "");
  const r = await resolvePhotos(db, slugBase, body, meta);
  if (r.error) return { ok: false, status: 400, code: "photo_missing", message: r.error };
  const md = buildMarkdown(r.meta, r.body);
  return commitFiles(env, [{ path: `${JOURNAL_DIR}/${file}`, text: md }, ...r.files], message, `${JOURNAL_DIR}/${file}`);
}

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
const ghFail = async (res, what) => {
  if (res.status === 401 || res.status === 403) return { ok: false, status: 502, code: "github_denied", message: "GitHub 토큰 권한을 확인해 주세요 (Contents 읽기·쓰기)." };
  const detail = await res.text().catch(() => "");
  return { ok: false, status: 502, code: "github_failed", message: `GitHub ${what} 실패 (${res.status}) ${detail.slice(0, 160)}` };
};
// 여러 파일을 커밋 하나로 main에 올린다 (배포도 한 번). 같은 경로는 덮어쓴다.
export async function commitFiles(env, files, message, mainPath) {
  if (!env.GITHUB_TOKEN) return { ok: false, status: 503, code: "github_not_configured", message: "Cloudflare에 GITHUB_TOKEN이 아직 설정되지 않았습니다." };
  for (let attempt = 0; attempt < 2; attempt++) {
    const ref = await gh(env, `git/ref/heads/${BRANCH}`);
    if (!ref.ok) return ghFail(ref, "브랜치 확인");
    const headSha = (await ref.json()).object.sha;
    const headCommit = await gh(env, `git/commits/${headSha}`);
    if (!headCommit.ok) return ghFail(headCommit, "커밋 확인");
    const baseTree = (await headCommit.json()).tree.sha;
    let updated = false;
    if (mainPath) {
      const enc = mainPath.split("/").map(encodeURIComponent).join("/");
      const head = await gh(env, `contents/${enc}?ref=${headSha}`);
      updated = head.status === 200;
    }
    const tree = [];
    for (const f of files) {
      const blob = await gh(env, "git/blobs", { method: "POST", body: JSON.stringify({ content: f.b64 ?? b64utf8(f.text), encoding: "base64" }) });
      if (!blob.ok) return ghFail(blob, "파일 올리기");
      tree.push({ path: f.path, mode: "100644", type: "blob", sha: (await blob.json()).sha });
    }
    const t = await gh(env, "git/trees", { method: "POST", body: JSON.stringify({ base_tree: baseTree, tree }) });
    if (!t.ok) return ghFail(t, "트리 만들기");
    const c = await gh(env, "git/commits", { method: "POST", body: JSON.stringify({ message, tree: (await t.json()).sha, parents: [headSha] }) });
    if (!c.ok) return ghFail(c, "커밋 만들기");
    const commit = await c.json();
    const u = await gh(env, `git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
    if (u.ok) return { ok: true, updated, commitUrl: commit.html_url || `https://github.com/${REPO}/commit/${commit.sha}` };
    if (u.status !== 422 || attempt) return ghFail(u, "main 반영");
    // 그 사이 main이 바뀌었으면 한 번 더
  }
}
export const BOOK = "practical-fitting";
