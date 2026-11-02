// GET /api/studio/naver?url=… — 네이버 블로그 글 주소로 본문 HTML 가져오기
// 지원 주소: blog.naver.com/아이디/글번호, m.blog.naver.com/아이디/글번호, PostView.naver?blogId=…&logNo=…
import { guard, json, fail } from "../../../lib/studio.js";

function parse(raw) {
  let u;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (!/(^|\.)blog\.naver\.com$/.test(u.hostname)) return null;
  const q = u.searchParams;
  if (q.get("blogId") && q.get("logNo")) return { id: q.get("blogId"), no: q.get("logNo") };
  const m = u.pathname.match(/^\/([A-Za-z0-9_-]+)\/(\d{6,})/);
  return m ? { id: m[1], no: m[2] } : null;
}
export async function onRequestGet({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const p = parse(new URL(request.url).searchParams.get("url") || "");
  if (!p) return fail(400, "invalid", "네이버 블로그 글 주소를 넣어 주세요. 예: https://blog.naver.com/아이디/글번호");
  const target = `https://blog.naver.com/PostView.naver?blogId=${encodeURIComponent(p.id)}&logNo=${encodeURIComponent(p.no)}&redirect=Dlog&widgetTypeCall=true&directAccess=false`;
  let res;
  try { res = await fetch(target, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      referer: `https://blog.naver.com/${p.id}/${p.no}`,
      "accept-language": "ko-KR,ko;q=0.9",
    },
  }); } catch (e) { return fail(424, "fetch_failed", "블로그에 연결하지 못했습니다: " + String(e && e.message || e).slice(0, 80)); }
  if (!res.ok) return fail(424, "fetch_failed", `블로그 글을 불러오지 못했습니다 (${res.status}). 비공개 글이면 복사해서 붙여 넣어 주세요.`);
  const html = await res.text();
  if (!/se-main-container|postViewArea/.test(html)) return fail(424, "not_found", "글 본문을 찾지 못했습니다. 비공개 글이면 복사해서 붙여 넣어 주세요.");
  return json({ ok: true, html, source: `https://blog.naver.com/${p.id}/${p.no}` });
}
