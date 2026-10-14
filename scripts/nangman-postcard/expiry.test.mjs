import { findActive, sha256Hex, keys, TTL_MS } from "../../lib/nangman-postcard.js";
const rows = new Map(); const deleted = [];
const DB = { prepare(sql){ return { _a:[], bind(...a){ this._a=a; return this; },
  async run(){ if(sql.startsWith("UPDATE")){ const [now,id]=this._a; const r=rows.get(id); r.purged_at=now; if(sql.includes("revoked_at")) r.revoked_at=now; } return {}; },
  async all(){ return { results: [{ name: "opens_at" }] }; },
  async first(){ return rows.get(this._a[0]) ?? null; } }; } };
const AUDIO = { async delete(k){ deleted.push(...k); } };
const token = "A".repeat(22), id = await sha256Hex(token), t0 = 1_000_000;
rows.set(id, { id_hash:id, created_at:t0, expires_at:t0+TTL_MS, revoked_at:null, purged_at:null });
const live = await findActive({DB,AUDIO}, token, t0+TTL_MS-1);
const exp = await findActive({DB,AUDIO}, token, t0+TTL_MS);
const again = await findActive({DB,AUDIO}, token, t0+TTL_MS+5);
const body = await exp.response.json();
const ok = !live.response && exp.response.status===410 && body.code==="expired"
  && deleted.length===4 && deleted.includes(keys(id).meta) && rows.get(id).purged_at===t0+TTL_MS
  && again.response.status===410 && deleted.length===4;
console.log(ok ? "PASS expiry purges content once and returns 410 expired" : "FAIL", {deleted, row: rows.get(id)});
if (!ok) process.exit(1);

// --- sweep: expired postcards nobody opens are still deleted ---
import { sweepExpired } from "../../lib/nangman-postcard.js";
{
  const rows2 = new Map(); const deleted2 = [];
  const DB2 = { prepare(sql) { return { _a: [], bind(...a) { this._a = a; return this; },
    async all() { const [now, limit] = this._a; return { results: [...rows2.values()].filter((r) => r.purged_at === null && r.expires_at <= now).slice(0, limit) }; },
    async run() { const [now, id] = this._a; rows2.get(id).purged_at = now; return {}; },
    async first() { return null; } }; } };
  const AUDIO2 = { async delete(k) { deleted2.push(...k); } };
  for (let i = 0; i < 30; i++) rows2.set("h" + i, { id_hash: "h" + i, expires_at: i < 27 ? 100 : 10_000, purged_at: null });
  const first = await sweepExpired({ DB: DB2, AUDIO: AUDIO2 }, 500);   // batch of 25
  const second = await sweepExpired({ DB: DB2, AUDIO: AUDIO2 }, 500);  // remaining 2
  const third = await sweepExpired({ DB: DB2, AUDIO: AUDIO2 }, 500);   // nothing left
  const live = [...rows2.values()].filter((r) => r.purged_at === null).length;
  const ok2 = first === 25 && second === 2 && third === 0 && live === 3 && deleted2.length === 108;
  console.log(ok2 ? "PASS sweep deletes unopened expired postcards in batches, keeps live ones" : "FAIL sweep", { first, second, third, live, deleted: deleted2.length });
  if (!ok2) process.exit(1);
}

// --- 10-day retention (2026-10-13): also cuts links issued under the old 30-day policy ---
import { TTL_MS as TTL10, effectiveExpiry, MESSAGES } from "../../lib/nangman-postcard.js";
{
  const day = 24 * 60 * 60 * 1000;
  const oldLink = { created_at: 0, expires_at: 30 * day };   // issued with 30 days
  const newLink = { created_at: 0, expires_at: 10 * day };
  const ok3 = TTL10 === 10 * day && effectiveExpiry(oldLink) === 10 * day && effectiveExpiry(newLink) === 10 * day
    && MESSAGES.expired === "보관 기간이 종료된 엽서입니다.";
  console.log(ok3 ? "PASS 10-day retention from upload, old 30-day links cut at 10 days" : "FAIL 10-day", { TTL10, old: effectiveExpiry(oldLink) / day });
  if (!ok3) process.exit(1);

  // findActive: an old 30-day link read on day 10 is blocked and purged
  const rows3 = new Map(); const del3 = [];
  const tok = "B".repeat(22); const id = await sha256Hex(tok);
  rows3.set(id, { id_hash: id, created_at: 0, expires_at: 30 * day, revoked_at: null, purged_at: null });
  const DB3 = { prepare(sql) { return { _a: [], bind(...a) { this._a = a; return this; },
    async run() { if (sql.startsWith("UPDATE")) rows3.get(this._a[1]).purged_at = this._a[0]; return {}; },
    async all() { return { results: [{ name: "opens_at" }] }; },
    async first() { return rows3.get(this._a[0]) ?? null; } }; } };
  const r9 = await findActive({ DB: DB3, AUDIO: { async delete(k) { del3.push(...k); } } }, tok, 10 * day - 1);
  const r10 = await findActive({ DB: DB3, AUDIO: { async delete(k) { del3.push(...k); } } }, tok, 10 * day);
  const ok4 = !r9.response && r10.response.status === 410 && del3.length === 4;
  console.log(ok4 ? "PASS old link readable on day 9.99, blocked and purged at day 10" : "FAIL old-link cut", { del: del3.length });
  if (!ok4) process.exit(1);

  // sweep also picks up old links past 10 days even though expires_at is still in the future
  const rows4 = new Map(); const del4 = [];
  rows4.set("old", { id_hash: "old", created_at: 0, expires_at: 30 * day, purged_at: null });
  rows4.set("fresh", { id_hash: "fresh", created_at: 5 * day, expires_at: 15 * day, purged_at: null });
  const DB4 = { prepare(sql) { return { _a: [], bind(...a) { this._a = a; return this; },
    async all() { const [now, limit, cutoff] = this._a; return { results: [...rows4.values()].filter((r) => r.purged_at === null && (r.expires_at <= now || r.created_at <= cutoff)).slice(0, limit) }; },
    async run() { rows4.get(this._a[1]).purged_at = this._a[0]; return {}; } }; } };
  const n = await sweepExpired({ DB: DB4, AUDIO: { async delete(k) { del4.push(...k); } } }, 11 * day);
  const ok5 = n === 1 && rows4.get("old").purged_at !== null && rows4.get("fresh").purged_at === null;
  console.log(ok5 ? "PASS sweep deletes old 30-day links after 10 days, keeps live ones" : "FAIL sweep 10-day", { n });
  if (!ok5) process.exit(1);
}
