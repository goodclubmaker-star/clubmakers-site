import { findActive, sha256Hex, keys, TTL_MS } from "../../lib/nangman-postcard.js";
const rows = new Map(); const deleted = [];
const DB = { prepare(sql){ return { _a:[], bind(...a){ this._a=a; return this; },
  async run(){ if(sql.startsWith("UPDATE")){ const [now,id]=this._a; const r=rows.get(id); r.purged_at=now; if(sql.includes("revoked_at")) r.revoked_at=now; } return {}; },
  async first(){ return rows.get(this._a[0]) ?? null; } }; } };
const AUDIO = { async delete(k){ deleted.push(...k); } };
const token = "A".repeat(22), id = await sha256Hex(token), t0 = 1_000_000;
rows.set(id, { id_hash:id, created_at:t0, expires_at:t0+TTL_MS, revoked_at:null, purged_at:null });
const live = await findActive({DB,AUDIO}, token, t0+TTL_MS-1);
const exp = await findActive({DB,AUDIO}, token, t0+TTL_MS);
const again = await findActive({DB,AUDIO}, token, t0+TTL_MS+5);
const body = await exp.response.json();
const ok = !live.response && exp.response.status===410 && body.code==="expired"
  && deleted.length===2 && deleted.includes(keys(id).meta) && rows.get(id).purged_at===t0+TTL_MS
  && again.response.status===410 && deleted.length===2;
console.log(ok ? "PASS expiry purges content once and returns 410 expired" : "FAIL", {deleted, row: rows.get(id)});
process.exit(ok?0:1);
