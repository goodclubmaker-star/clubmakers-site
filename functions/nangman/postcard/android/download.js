// GET /nangman/postcard/android/download
//
// One-time import of the signed Codemagic #3 test APK to a persistent R2 key,
// then serve that exact artifact from our own domain. Codemagic's email URL
// expires in 24 hours; this endpoint must be visited before it expires.
// Isolated from postcard user content and from the 10/377-day R2 lifecycle
// prefixes; this file never modifies any stamp/postcard data.
const APK_KEY = "nangman-android-downloads/nangman-postcard-1.0-b3-20261016.apk";
const SOURCE_URL = "https://api.codemagic.io/artifacts/.eJwVwclygjAAANB_8e6MQhU4eGANwyJg2cqFiSGRCFUgCYtf3-l7u4f-zxgP1dLtEdQYM3OZbaYGwKcv4oNJgTQF7aQfry3vr8_NmI14XdVu8CQjNcUJcSNBpD30qKXgDTbTYv6g1QTb3FOgilP6KUstKKschQk3FvQUUVvNnm09Wq-JgS5CKqgCh8WRXWKHKc30ySlfL-UHrtdtFKwOXoTS7F70MIpuFcBKWozDisy5dfOtxGkS0UByaei-7WE8yzn2Gff5IlXlLKLKCTvfi91f91s_Ztya8JdoEIaqyqRhra01J2GXTTo50fPt7uVQQQ1xmNr4e17LI08ul90fL1JlRg.aEBZcglIp81Clw0zzVGzlKnOOgk";
const CONTENT_TYPE = "application/vnd.android.package-archive";
const FILE_NAME = "NangmanPostcard-Android-1.0-build3-test.apk";
const MAX_SIZE = 90 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

function isZip(bytes) {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b &&
    bytes[2] === 0x03 && bytes[3] === 0x04;
}

async function ensureStored(bucket) {
  const existing = await bucket.head(APK_KEY);
  if (existing) return existing;

  const response = await fetch(SOURCE_URL, { redirect: "follow" });
  if (!response.ok) {
    throw new Error("Codemagic source not available (HTTP " + response.status + ")");
  }
  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_SIZE) {
    throw new Error("APK source is too large");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 1024 * 1024 || bytes.byteLength > MAX_SIZE || !isZip(bytes)) {
    throw new Error("APK source is not a valid APK/ZIP download");
  }
  const sha = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
  ).map((b) => b.toString(16).padStart(2, "0")).join("");

  await bucket.put(APK_KEY, bytes, {
    httpMetadata: { contentType: CONTENT_TYPE },
    customMetadata: { sha256: sha, version: "1.0", build: "3", release: "test" },
  });
  const saved = await bucket.head(APK_KEY);
  if (!saved) throw new Error("APK R2 write did not persist");
  return saved;
}

export async function onRequestGet({ request, env }) {
  if (!env?.AUDIO) return json({ ready: false, error: "Storage is not configured" }, 503);

  const url = new URL(request.url);
  const isStatus = url.searchParams.has("status");
  const isPrepare = url.searchParams.has("prepare");
  if (isStatus) {
    const current = await env.AUDIO.head(APK_KEY);
    return json({ ready: !!current, version: "1.0", build: 3, bytes: current?.size ?? null });
  }

  try {
    const object = await ensureStored(env.AUDIO);
    if (isPrepare) {
      return json({
        ready: true,
        version: "1.0",
        build: 3,
        bytes: object.size,
        sha256: object.customMetadata?.sha256 ?? null,
      });
    }

    const file = await env.AUDIO.get(APK_KEY);
    if (!file) return json({ ready: false, error: "APK not found after import" }, 503);
    return new Response(file.body, {
      status: 200,
      headers: {
        "content-type": CONTENT_TYPE,
        "content-length": String(file.size),
        "content-disposition": 'attachment; filename="' + FILE_NAME + '"',
        "cache-control": "public, max-age=3600",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow",
        "referrer-policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error("Android APK import/download failed:", String(error));
    return json({
      ready: false,
      error: "APK가 아직 저장되지 않았거나 임시 원본 다운로드 기한이 지났습니다.",
      action: "reupload_new_codamagic_artifact",
    }, 503);
  }
}
