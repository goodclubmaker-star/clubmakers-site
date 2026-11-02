// GET /api/studio/fetch-image?url=… — 블로그 사진을 대신 받아 작업대로 넘긴다
// (네이버 사진은 다른 사이트에서 바로 못 불러오므로 서버가 블로그 주소를 출처로 달아 받는다)
import { guard, fail } from "../../../lib/studio.js";

const MAX = 15 * 1024 * 1024;
export async function onRequestGet({ request, env }) {
  const g = await guard(request, env);
  if (g.res) return g.res;
  const url = new URL(request.url).searchParams.get("url") || "";
  let u;
  try { u = new URL(url); } catch { return fail(400, "invalid", "사진 주소가 맞지 않습니다."); }
  if (u.protocol !== "https:" && u.protocol !== "http:") return fail(400, "invalid", "사진 주소가 맞지 않습니다.");
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname)) return fail(400, "invalid", "사진 주소가 맞지 않습니다.");
  const naver = /(pstatic\.net|naver\.net|naver\.com)$/.test(u.hostname);
  const res = await fetch(u.toString(), {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      ...(naver ? { referer: "https://blog.naver.com/" } : {}),
      accept: "image/avif,image/webp,image/*,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) return fail(424, "fetch_failed", `사진을 받지 못했습니다 (${res.status}).`);
  const type = res.headers.get("content-type") || "";
  if (!/^image\//.test(type)) return fail(424, "not_image", "사진 파일이 아닙니다.");
  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX) return fail(413, "too_large", "사진이 너무 큽니다.");
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX) return fail(413, "too_large", "사진이 너무 큽니다.");
  return new Response(buf, { headers: { "content-type": type, "cache-control": "no-store", "x-robots-tag": "noindex" } });
}
