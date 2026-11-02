// POST /api/studio/serial/publish/:id — 검수본을 공작소 일지로 등록 (GitHub main에 커밋 → 자동 배포)
import { guard, json, fail, readJson, cleanMeta, buildMarkdown, fileNameFor, commitFile, nowKst, JOURNAL_DIR , BOOK } from "../../../../../lib/studio.js";

export async function onRequestPost({ request, env, params }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const { body, error } = await readJson(request, 400_000);
  if (error) return error;
  const draft = String(body?.draft ?? "").trim();
  if (draft.length < 20) return fail(400, "empty", "검수본이 비어 있습니다.");
  const meta = cleanMeta(body?.meta);
  if (!meta.title) return fail(400, "invalid", "제목을 입력해 주세요.");
  const sec = await g.db.prepare("SELECT title FROM studio_sections WHERE book = ? AND id = ?").bind(BOOK, params.id).first();
  if (!sec) return fail(404, "not_found", "해당 원고가 없습니다.");

  // 이미 등록한 글을 고쳐 다시 올리면 같은 파일을 덮어쓴다.
  const prev = await g.db.prepare("SELECT file FROM studio_progress WHERE book = ? AND id = ?").bind(BOOK, params.id).first();
  const file = prev?.file || fileNameFor(params.id, meta.pubDate);
  const md = buildMarkdown(meta, draft);
  const r = await commitFile(env, `${JOURNAL_DIR}/${file}`, md, `공작소 일지: ${meta.title}`);
  if (!r.ok) return fail(r.status, r.code, r.message);

  const at = nowKst();
  await g.db.prepare(
    "INSERT INTO studio_progress (book, id, status, draft, meta, file, commit_url, updated_at) VALUES (?, ?, 'published', ?, ?, ?, ?, ?) " +
    "ON CONFLICT(book, id) DO UPDATE SET status = 'published', draft = excluded.draft, meta = excluded.meta, file = excluded.file, commit_url = excluded.commit_url, updated_at = excluded.updated_at"
  ).bind(BOOK, params.id, draft, JSON.stringify(meta), file, r.commitUrl, at).run();
  return json({ ok: true, file, updated: r.updated, commitUrl: r.commitUrl, journalUrl: `/journal/${file.replace(/\.md$/, "")}/` });
}
