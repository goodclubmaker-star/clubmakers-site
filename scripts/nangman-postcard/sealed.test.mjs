// Run on Node >=22: node --test scripts/nangman-postcard/sealed.test.mjs
// Special stamp "시간을 담아 보내는 편지": sealed until opens_at, then 10 days.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  ensureSchema, reserve, sweepExpired, findActive, effectiveExpiry, isSealed, parseOpensAt,
  keys, keysFor, sha256Hex, TTL_MS, SEAL_MIN_MS, SEAL_MAX_MS,
} from "../../lib/nangman-postcard.js";

class MemoryD1 {
  constructor() { this.sqlite = new DatabaseSync(":memory:"); }
  prepare(sql) {
    const db = this.sqlite;
    const make = (args) => ({
      async run() { return { meta: { changes: Number(db.prepare(sql).run(...args).changes) } }; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async first() { return db.prepare(sql).get(...args) ?? null; },
    });
    return { ...make([]), bind: (...args) => make(args) };
  }
}
const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 14, 12);

function env() {
  const deleted = [];
  return { DB: new MemoryD1(), AUDIO: { async delete(k) { deleted.push(...k); } }, deleted };
}
async function add(e, token, opensAt, at = now) {
  const idHash = await sha256Hex(token);
  const ok = await reserve(e, {
    idHash, manageHash: "m" + token, ipHash: "ip", bytes: 1, opensAt,
    expiresAt: (opensAt ?? at) + TTL_MS,
  }, at);
  assert.equal(ok, true);
  return idHash;
}

test("opening time: 1 hour .. 1 year, small clock skew allowed", () => {
  assert.equal(parseOpensAt(undefined, now), null);
  assert.equal(parseOpensAt(now + SEAL_MIN_MS, now), now + SEAL_MIN_MS);
  assert.equal(parseOpensAt(now + SEAL_MIN_MS - 60_000, now), now + SEAL_MIN_MS - 60_000); // 1 min late
  assert.deepEqual(parseOpensAt(now + 30 * 60_000, now), { error: "invalid_open_time" });
  assert.deepEqual(parseOpensAt(now + SEAL_MAX_MS + 1, now), { error: "invalid_open_time" });
  assert.equal(parseOpensAt(new Date(now + 2 * day).toISOString(), now), now + 2 * day);
  assert.deepEqual(parseOpensAt("tomorrow", now), { error: "invalid" });
});

test("migration adds opens_at to an existing table; old rows stay ordinary", async () => {
  const e = env();
  e.DB.sqlite.exec("CREATE TABLE nangman_postcards (id_hash TEXT PRIMARY KEY, manage_hash TEXT NOT NULL, ip_hash TEXT NOT NULL, bytes INTEGER NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER, purged_at INTEGER)");
  e.DB.sqlite.prepare("INSERT INTO nangman_postcards VALUES (?,?,?,?,?,?,NULL,NULL)").run("old", "m", "ip", 1, now, now + TTL_MS);
  await ensureSchema(e.DB);
  await ensureSchema(e.DB);
  assert.equal(e.DB.sqlite.prepare("SELECT opens_at FROM nangman_postcards WHERE id_hash='old'").get().opens_at, null);
});

test("sealed postcard: locked before opening, then viewable for 10 days from opening", async () => {
  const e = env();
  await ensureSchema(e.DB);
  const opens = now + 200 * day;
  await add(e, "S".repeat(22), opens);
  const row = (await findActive(e, "S".repeat(22), now)).row;
  assert.equal(isSealed(row, now), true);
  assert.equal(isSealed(row, opens), false);
  assert.equal(effectiveExpiry(row), opens + TTL_MS);
  assert.equal((await findActive(e, "S".repeat(22), opens + TTL_MS - 1)).response, undefined);
  assert.equal((await findActive(e, "S".repeat(22), opens + TTL_MS)).response.status, 410);
});

test("cleanup never deletes a sealed postcard early (old rule would at day 10)", async () => {
  const e = env();
  await ensureSchema(e.DB);
  const opens = now + 100 * day;
  await add(e, "T".repeat(22), opens);
  await add(e, "N".repeat(22), null);
  assert.equal(await sweepExpired(e, now + 50 * day), 1); // only the ordinary one
  assert.equal(await sweepExpired(e, opens + TTL_MS - 1), 0);
  assert.equal(await sweepExpired(e, opens + TTL_MS), 1);
});

test("sealed files use their own R2 prefix; cleanup removes both locations", async () => {
  const id = await sha256Hex("K".repeat(22));
  assert.match(keys(id, true).meta, /^nangman-postcard-sealed\//);
  assert.match(keys(id).meta, /^nangman-postcard\//);
  assert.equal(keysFor(id, { opens_at: 1 }).background, keys(id, true).background);
  assert.equal(keysFor(id, { opens_at: null }).background, keys(id).background);
  const e = env();
  await ensureSchema(e.DB);
  await add(e, "K".repeat(22), null);
  await sweepExpired(e, now + TTL_MS);
  assert.ok(e.deleted.includes(keys(id).meta) && e.deleted.includes(keys(id, true).meta));
});

test("long-sealed postcards still count toward the global storage caps", async () => {
  const e = env();
  await ensureSchema(e.DB);
  await add(e, "C".repeat(22), now + 300 * day, now);
  const later = now + 100 * day; // created long ago, still waiting to open
  const counted = e.DB.sqlite.prepare(
    "SELECT COUNT(*) AS c FROM nangman_postcards WHERE purged_at IS NULL AND expires_at > ? AND COALESCE(opens_at, created_at) > ?"
  ).get(later, later - TTL_MS).c;
  assert.equal(counted, 1);
});
