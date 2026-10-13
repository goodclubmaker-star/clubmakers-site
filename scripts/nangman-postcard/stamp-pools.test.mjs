// Run on Node >=22: node --test scripts/nangman-postcard/stamp-pools.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { ensureSchema } from "../../lib/nangman-postcard.js";
import {
  ensureStampSchema, grantMonthly, stampBalance, grantBonus, reserveStamped,
  refundStamped, stampMonth, stampPolicy,
} from "../../lib/nangman-stamps.js";

class MemoryD1 {
  constructor() { this.sqlite = new DatabaseSync(":memory:"); }
  prepare(sql) {
    const sqlite = this.sqlite;
    return {
      bind(...args) {
        return {
          async run() {
            const v = sqlite.prepare(sql).run(...args);
            return { meta: { changes: Number(v.changes) } };
          },
          async all() { return { results: sqlite.prepare(sql).all(...args) }; },
          async first() { return sqlite.prepare(sql).get(...args) ?? null; },
        };
      },
      async run() {
        const v = sqlite.prepare(sql).run();
        return { meta: { changes: Number(v.changes) } };
      },
      async all() { return { results: sqlite.prepare(sql).all() }; },
    };
  }
  async batch(ops) {
    this.sqlite.exec("BEGIN");
    try {
      const results = [];
      for (const op of ops) results.push(await op.run());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

test("migration assigns the existing free ledger to free pool", async () => {
  const DB = new MemoryD1();
  DB.sqlite.exec("CREATE TABLE nangman_stamp_ledger (entry_id TEXT PRIMARY KEY, account_hash TEXT NOT NULL, month TEXT NOT NULL, kind TEXT NOT NULL, delta INTEGER NOT NULL, postcard_hash TEXT, created_at INTEGER NOT NULL)");
  DB.sqlite.prepare("INSERT INTO nangman_stamp_ledger VALUES(?,?,?,?,?,?,?)").run("monthly:a:2026-10", "a", "2026-10", "free_monthly", 20, null, 1);
  await ensureStampSchema(DB);
  await ensureStampSchema(DB);
  const row = DB.sqlite.prepare("SELECT pool FROM nangman_stamp_ledger LIMIT 1").get();
  assert.equal(row.pool, "free");
});

test("paid credits survive month rollover and spend only after free credits", async () => {
  const DB = new MemoryD1();
  await ensureSchema(DB);
  await ensureStampSchema(DB);
  const account = "account-hash";
  const now = Date.parse("2026-10-01T00:00:00Z");
  await grantMonthly(DB, account, now);
  DB.sqlite.prepare("INSERT INTO nangman_stamp_ledger VALUES(?,?,?,?,?,?,?,?)").run(
    "purchase:9001", account, "2026-10", "purchased", 5, null, now, "paid"
  );
  let balance = await stampBalance(DB, account, now);
  assert.equal(balance.freeBalance, 20);
  assert.equal(balance.paidBalance, 5);
  assert.equal(balance.balance, 25);

  const env = { DB };
  const mk = (i) => ({
    idHash: "postcard-" + i,
    manageHash: "manage-" + i,
    ipHash: "test-user-ip",
    bytes: 800,
    expiresAt: now + i * 3_700_000 + 10 * 86400000,
  });
  for (let i = 0; i < 21; i++) {
    assert.equal(await reserveStamped(env, mk(i), account, now + i * 3_700_000), true);
  }
  balance = await stampBalance(DB, account, now + 21 * 3_700_000);
  assert.equal(balance.freeBalance, 0);
  assert.equal(balance.paidBalance, 4);

  const spent = DB.sqlite.prepare("SELECT pool FROM nangman_stamp_ledger WHERE entry_id='spend:postcard-20'").get();
  assert.equal(spent.pool, "paid");
  await refundStamped(env, "postcard-20", now + 22 * 3_700_000);
  await refundStamped(env, "postcard-20", now + 23 * 3_700_000);
  balance = await stampBalance(DB, account, now + 24 * 3_700_000);
  assert.equal(balance.paidBalance, 5); // Exactly one refund.

  const nextMonth = Date.parse("2026-11-05T12:00:00Z");
  await grantMonthly(DB, account, nextMonth);
  balance = await stampBalance(DB, account, nextMonth);
  assert.equal(balance.freeBalance, 20);
  assert.equal(balance.paidBalance, 5); // Paid credits never expire.
});

test("server policy can disable complimentary refill without affecting paid balance", async () => {
  const DB = new MemoryD1();
  await ensureStampSchema(DB);
  const now = Date.parse("2026-10-13T10:00:00Z");
  const env = { STAMPS_FREE_BONUS_ENABLED: "false", STAMPS_MONTHLY_FREE_COUNT: "5" };
  await grantMonthly(DB, "b", now, env);
  const balance = await grantBonus(DB, "b", now, env);
  assert.equal(balance.freeBalance, 5);
  assert.equal(balance.canGetBonus, false);
  assert.equal(stampPolicy(env).monthlyAllowance, 5);
  assert.equal(stampMonth(now), "2026-10");
});
