// Private, read-only postcard capacity telemetry — NOT Cloudflare billing data.
// Configure NANGMAN_USAGE_ADMIN_TOKEN (at least 32 random characters) in Pages.
import { LIMITS } from "../../../lib/nangman-postcard.js";

const noStore = { "cache-control":"no-store", "content-type":"application/json; charset=utf-8",
  "x-content-type-options":"nosniff", "referrer-policy":"no-referrer" };
const respond = (status, body) => new Response(JSON.stringify(body), { status, headers:noStore });

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
async function authorized(request, token) {
  if (typeof token !== "string" || token.length < 32) return false;
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const supplied = auth.slice(7);
  if (supplied.length > 2000) return false;
  const [a,b] = await Promise.all([digest(supplied), digest(token)]);
  let different = 0;
  for (let i=0; i<a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}
function number(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function percent(n, maximum) { return Math.round(1000 * n / maximum) / 10; }
function alertLevel(pct) { return pct >= 95 ? "critical" : pct >= 85 ? "high" : pct >= 70 ? "warning" : "normal"; }

export async function onRequestGet({ request, env }) {
  if (!env?.NANGMAN_USAGE_ADMIN_TOKEN || String(env.NANGMAN_USAGE_ADMIN_TOKEN).length < 32)
    return respond(503, { error: "monitor_not_configured" });
  if (!(await authorized(request, env.NANGMAN_USAGE_ADMIN_TOKEN)))
    return respond(401, { error: "unauthorized" });
  if (!env.DB) return respond(503, { error: "db_unavailable" });
  const now = Date.now();
  const day = 86_400_000;
  try {
    // No letter text, share tokens, IPs, names or other identifying data are returned.
    const [active, sends] = await Promise.all([
      env.DB.prepare(
        "SELECT COUNT(*) AS active_count, COALESCE(SUM(bytes),0) AS active_bytes, " +
        "COALESCE(SUM(CASE WHEN opens_at IS NOT NULL THEN 1 ELSE 0 END),0) AS scheduled_count, " +
        "COALESCE(SUM(CASE WHEN opens_at IS NOT NULL THEN bytes ELSE 0 END),0) AS scheduled_bytes " +
        "FROM nangman_postcards WHERE purged_at IS NULL AND expires_at>?1"
      ).bind(now).first(),
      env.DB.prepare(
        "SELECT COUNT(*) AS sent_30d, " +
        "COALESCE(SUM(CASE WHEN created_at>?2 THEN 1 ELSE 0 END),0) AS sent_7d, " +
        "COALESCE(SUM(CASE WHEN created_at>?3 THEN 1 ELSE 0 END),0) AS sent_24h, " +
        "COALESCE(SUM(CASE WHEN created_at>?2 THEN bytes ELSE 0 END),0) AS bytes_7d " +
        "FROM nangman_postcards WHERE created_at>?1"
      ).bind(now-30*day, now-7*day, now-day).first()
    ]);
    // Report the ACTUAL deployed limits. Remote expansion stays in the separate
    // capacity PR and must not be implied before its own release/testing.
    const cap = { totalBytes: LIMITS.totalBytes, activeCount: LIMITS.activeCount };
    const bytes = number(active?.active_bytes);
    const count = number(active?.active_count);
    const sent7 = number(sends?.sent_7d);
    const bytes7 = number(sends?.bytes_7d);
    const forecastBytes10dGross = Math.round(bytes + (bytes7/7)*10);
    const capacityPct = Math.max(percent(bytes,cap.totalBytes),percent(count,cap.activeCount));
    const forecastPct = percent(forecastBytes10dGross,cap.totalBytes);
    const level = alertLevel(Math.max(capacityPct,forecastPct));
    return respond(200, {
      generatedAt:new Date(now).toISOString(), status:level,
      thresholdsPct:[70,85,95],
      capacity: { activeBytes:bytes, activeCount:count, maxActiveBytes:cap.totalBytes,
        maxActiveCount:cap.activeCount, usedBytesPct:percent(bytes,cap.totalBytes),
        usedCountPct:percent(count,cap.activeCount) },
      scheduled: { count:number(active?.scheduled_count), bytes:number(active?.scheduled_bytes) },
      volume:{ sent24h:number(sends?.sent_24h), sent7d:sent7, sent30d:number(sends?.sent_30d) },
      forecast: { grossBytesIn10Days:forecastBytes10dGross, grossUtilizationPct:forecastPct,
        note:"Upper-bound projection adds last seven days' uploads over ten days without subtracting expiries." },
      notes: [
        "This read-only deployment observes only current 2GB/20k application ceilings until the capacity feature is released.",
        "These are application database records, NOT actual Cloudflare R2 usage or billed spend.",
        "Check Cloudflare R2/D1/Workers analytics and configure billing alerts in Cloudflare dashboard.",
        "Changing NANGMAN_ACTIVE_* ceilings does NOT provision or purchase Cloudflare capacity.",
        "Capacity COUNT/SUM queries are not load-tested at 100k concurrent active postcards."
      ]
    });
  } catch {
    return respond(503, { error:"usage_unavailable" });
  }
}
