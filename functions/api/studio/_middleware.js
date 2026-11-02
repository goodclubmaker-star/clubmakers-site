// /api/studio/* 공통: 처리 중 예외가 나도 작업대가 읽을 수 있는 안내로 돌려준다
export async function onRequest(ctx) {
  try {
    return await ctx.next();
  } catch (e) {
    const msg = (e && (e.stack || e.message)) ? String(e.message || e).slice(0, 300) : String(e).slice(0, 300);
    console.error("studio error", e && e.stack || e);
    return new Response(JSON.stringify({ error: "exception", message: "서버 처리 중 오류: " + msg }), {
      status: 500, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
}
