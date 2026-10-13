// Smoke tests for free launch-period stamp identity and monthly rollover.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stampMonth, stampAccount, MONTHLY_FREE_STAMPS, STAMP_ACCOUNT_HEADER } from "../../lib/nangman-stamps.js";

test("Twenty free stamps per month and UTC month boundaries", () => {
  assert.equal(MONTHLY_FREE_STAMPS, 20);
  assert.equal(stampMonth(Date.parse("2026-10-31T23:59:59Z")), "2026-10");
  assert.equal(stampMonth(Date.parse("2026-11-01T00:00:00Z")), "2026-11");
});

test("Legacy clients do not require a stamp account", async () => {
  const request = new Request("https://example.test/postcard");
  assert.equal(await stampAccount(request), null);
});

test("Version 4 stamp ID is hashed, malformed IDs rejected", async () => {
  const raw = "550e8400-e29b-41d4-a716-446655440000";
  const good = new Request("https://example.test/postcard", { headers: { [STAMP_ACCOUNT_HEADER]: raw } });
  const account = await stampAccount(good);
  assert.match(account.hash, /^[a-f0-9]{64}$/);
  assert.ok(!account.hash.includes(raw));
  const bad = new Request("https://example.test/postcard", { headers: { [STAMP_ACCOUNT_HEADER]: "not-a-uuid" } });
  assert.deepEqual(await stampAccount(bad), { invalid: true });
});
