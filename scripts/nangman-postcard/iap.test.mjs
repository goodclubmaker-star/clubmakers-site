// Run on Node >=22: node --test scripts/nangman-postcard/iap.test.mjs
// Uses a TEST-ONLY certificate chain (fixtures/test-apple-chain) built like
// Apple's: P-384 root -> P-384 intermediate (WWDR marker) -> P-256 leaf
// (receipt-signing marker). Real requests are pinned to Apple Root CA - G3.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPrivateKey, sign, createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { verifyAppleJWS, APPLE_ROOT_CA_G3_SHA256 } from "../../lib/apple-jws.js";
import { checkTransaction, grantPurchase, applyRefund, BUNDLE_ID } from "../../lib/nangman-iap.js";
import { ensureSchema } from "../../lib/nangman-postcard.js";
import {
  ensureStampSchema, grantMonthly, stampBalance, reserveStamped,
} from "../../lib/nangman-stamps.js";

const dir = new URL("./fixtures/test-apple-chain/", import.meta.url);
const pemB64 = (name) =>
  readFileSync(new URL(name, dir), "utf8").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
const der = (name) => Buffer.from(pemB64(name), "base64");
const ROOT = createHash("sha256").update(der("root.pem")).digest("hex");
const leafKey = createPrivateKey(readFileSync(new URL("leaf.p8.pem", dir)));
const b64url = (b) => Buffer.from(b).toString("base64url");

function jws(payload, { chain = ["leaf.pem", "inter.pem", "root.pem"], alg = "ES256", key = leafKey } = {}) {
  const head = b64url(JSON.stringify({ alg, x5c: chain.map(pemB64) }));
  const body = b64url(JSON.stringify(payload));
  const sig = sign("sha256", Buffer.from(head + "." + body), { key, dsaEncoding: "ieee-p1363" });
  return `${head}.${body}.${b64url(sig)}`;
}

const ACCOUNT = "3f2b8c1e-7a4d-4e2f-9b1c-5d6e7f8a9b0c";
const tx = (over = {}) => ({
  bundleId: BUNDLE_ID,
  productId: "com.clubmakers.nangmanpostcard.stamps10",
  type: "Consumable",
  transactionId: "2000000123456789",
  appAccountToken: ACCOUNT.toUpperCase(),
  environment: "Sandbox",
  quantity: 1,
  ...over,
});

// ---------- signature / chain ----------

test("valid chain and signature decode the payload", async () => {
  const p = await verifyAppleJWS(jws(tx()), { rootSha256: ROOT });
  assert.equal(p.transactionId, "2000000123456789");
});

test("pinned Apple root rejects any other root (the test chain)", async () => {
  assert.equal(APPLE_ROOT_CA_G3_SHA256.length, 64);
  await assert.rejects(verifyAppleJWS(jws(tx())), /root/);
});

test("tampered payload fails the signature", async () => {
  const [h, , s] = jws(tx()).split(".");
  const forged = b64url(JSON.stringify(tx({ productId: "com.clubmakers.nangmanpostcard.stamps100" })));
  await assert.rejects(verifyAppleJWS(`${h}.${forged}.${s}`, { rootSha256: ROOT }), /signature/);
});

test("leaf without Apple's marker extension is refused", async () => {
  const token = jws(tx(), { chain: ["leaf-nomarker.pem", "inter.pem", "root.pem"] });
  await assert.rejects(verifyAppleJWS(token, { rootSha256: ROOT }), /leaf marker/);
});

test("chain in the wrong order is refused", async () => {
  const token = jws(tx(), { chain: ["inter.pem", "leaf.pem", "root.pem"] });
  await assert.rejects(verifyAppleJWS(token, { rootSha256: ROOT }));
});

test("expired certificates are refused", async () => {
  const later = Date.now() + 30 * 365 * 86400000;
  await assert.rejects(verifyAppleJWS(jws(tx()), { rootSha256: ROOT, now: later }), /expired/);
});

test("only ES256 with exactly three certificates", async () => {
  await assert.rejects(verifyAppleJWS(jws(tx(), { alg: "none" }), { rootSha256: ROOT }), /header/);
  await assert.rejects(
    verifyAppleJWS(jws(tx(), { chain: ["leaf.pem", "root.pem"] }), { rootSha256: ROOT }), /header/);
  await assert.rejects(verifyAppleJWS("a.b", { rootSha256: ROOT }), /format/);
  await assert.rejects(verifyAppleJWS(null, { rootSha256: ROOT }), /format/);
});

// ---------- what was bought ----------

test("transaction checks", () => {
  const acc = ACCOUNT;
  assert.equal(checkTransaction(tx(), acc), null);
  assert.equal(checkTransaction(tx({ bundleId: "com.other" }), acc), "wrong_app");
  assert.equal(checkTransaction(tx({ productId: "x" }), acc), "unknown_product");
  assert.equal(checkTransaction(tx({ appAccountToken: "11111111-1111-4111-8111-111111111111" }), acc), "wrong_account");
  assert.equal(checkTransaction(tx({ appAccountToken: undefined }), acc), "wrong_account");
  assert.equal(checkTransaction(tx({ revocationDate: 1 }), acc), "revoked");
  assert.equal(checkTransaction(tx({ type: "Auto-Renewable Subscription" }), acc), "invalid");
  assert.equal(checkTransaction(tx({ quantity: 0 }), acc), "invalid");
  assert.equal(checkTransaction(tx({ environment: "Xcode" }), acc), "not_for_sale");
  assert.equal(checkTransaction(tx({ environment: "Production" }), acc), "not_for_sale");
  assert.equal(checkTransaction(tx({ environment: "Production" }), acc, { STAMPS_PAID_ENABLED: "true" }), null);
});

// ---------- ledger ----------

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
  async batch(ops) {
    this.sqlite.exec("BEGIN");
    try {
      const out = [];
      for (const op of ops) out.push(await op.run());
      this.sqlite.exec("COMMIT");
      return out;
    } catch (e) { this.sqlite.exec("ROLLBACK"); throw e; }
  }
}

async function freshDB() {
  const DB = new MemoryD1();
  await ensureSchema(DB);
  await ensureStampSchema(DB);
  return DB;
}

test("purchase credits the paid pool exactly once", async () => {
  const DB = await freshDB();
  const now = Date.UTC(2026, 9, 13);
  await grantMonthly(DB, "acc", now);
  assert.deepEqual(await grantPurchase(DB, "acc", tx(), now), { granted: true, credits: 10 });
  assert.deepEqual(await grantPurchase(DB, "acc", tx(), now), { granted: false, credits: 0 });
  const w = await stampBalance(DB, "acc", now);
  assert.equal(w.paidBalance, 10);
  assert.equal(w.freeBalance, 20);
});

test("same Apple transaction can never credit a second account", async () => {
  const DB = await freshDB();
  await grantPurchase(DB, "acc", tx());
  const r = await grantPurchase(DB, "other", tx());
  assert.equal(r.conflict, true);
  assert.equal((await stampBalance(DB, "other")).paidBalance, 0);
});

test("quantity and pack size multiply", async () => {
  const DB = await freshDB();
  const r = await grantPurchase(DB, "acc", tx({
    productId: "com.clubmakers.nangmanpostcard.stamps30", quantity: 2, transactionId: "9",
  }));
  assert.equal(r.credits, 60);
});

test("purchased stamps survive the month and are used after free ones", async () => {
  const DB = await freshDB();
  const oct = Date.UTC(2026, 9, 31, 12);
  const nov = Date.UTC(2026, 10, 1, 12);
  await grantPurchase(DB, "acc", tx(), oct);
  await grantMonthly(DB, "acc", nov);
  const w = await stampBalance(DB, "acc", nov);
  assert.equal(w.paidBalance, 10);
  assert.equal(w.freeBalance, 20);
  const env = { DB };
  const row = (i) => ({ idHash: "p" + i, manageHash: "m" + i, ipHash: "ip" + (i % 7), bytes: 1, expiresAt: nov + 1e9 });
  for (let i = 0; i < 21; i++) assert.equal(await reserveStamped(env, row(i), "acc", nov + i), true);
  const after = await stampBalance(DB, "acc", nov + 99);
  assert.equal(after.freeBalance, 0);
  assert.equal(after.paidBalance, 9);
});

test("refund removes exactly that purchase, once, and blocks paid sending below zero", async () => {
  const DB = await freshDB();
  const now = Date.UTC(2026, 9, 13);
  await grantPurchase(DB, "acc", tx(), now);
  const env = { DB };
  // Spend 3 paid stamps (no free grant this month for this account).
  for (let i = 0; i < 3; i++) {
    assert.equal(await reserveStamped(env, { idHash: "q" + i, manageHash: "n" + i, ipHash: "x", bytes: 1, expiresAt: now + 1e9 }, "acc", now), true);
  }
  assert.deepEqual(await applyRefund(DB, tx(), now), { refunded: true });
  assert.deepEqual(await applyRefund(DB, tx(), now), { refunded: false });
  const w = await stampBalance(DB, "acc", now);
  assert.equal(w.paidBalance, 0); // -3 is shown as 0
  assert.equal(await reserveStamped(env, { idHash: "q9", manageHash: "n9", ipHash: "x", bytes: 1, expiresAt: now + 1e9 }, "acc", now), false);
});

test("refund for an unknown transaction changes nothing", async () => {
  const DB = await freshDB();
  assert.deepEqual(await applyRefund(DB, tx({ transactionId: "404" })), { refunded: false });
});

// ---------- Apple's REAL certificates ----------
const real = JSON.parse(readFileSync(new URL("./fixtures/real-apple-chain.json", import.meta.url), "utf8"));
const REAL_CHAIN_VALID_AT = Date.UTC(2026, 0, 15); // real leaf is valid 2025-09-19 .. 2027-10-13

function withChain(x5c, payload, key) {
  const head = b64url(JSON.stringify({ alg: "ES256", x5c }));
  const body = b64url(JSON.stringify(payload));
  const sig = key
    ? sign("sha256", Buffer.from(head + "." + body), { key, dsaEncoding: "ieee-p1363" })
    : Buffer.alloc(64, 7);
  return `${head}.${body}.${b64url(sig)}`;
}

test("the pinned fingerprint is Apple's real Root CA - G3", () => {
  assert.equal(createHash("sha256").update(Buffer.from(real.root, "base64")).digest("hex"), APPLE_ROOT_CA_G3_SHA256);
});

test("Apple's real chain passes every certificate check (only our fake signature fails)", async () => {
  const token = withChain([real.leaf, real.intermediate, real.root], tx());
  // Reaching the signature step means: pinned root, dates, both Apple marker
  // extensions and both P-384/SHA-384 chain signatures were all accepted.
  await assert.rejects(verifyAppleJWS(token, { now: REAL_CHAIN_VALID_AT }), /signature/);
});

test("forged intermediate with Apple's exact names but another key is refused", async () => {
  const forgedKey = createPrivateKey(readFileSync(new URL("./fixtures/forged-leaf.p8.pem", import.meta.url)));
  const pem = (n) => readFileSync(new URL("./fixtures/" + n, import.meta.url), "utf8")
    .replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const token = withChain([pem("forged-leaf.pem"), pem("forged-inter.pem"), real.root], tx(), forgedKey);
  // Forged certs were issued 2026-10-13; the real root is valid until 2039.
  await assert.rejects(verifyAppleJWS(token, { now: Date.UTC(2027, 0, 1) }), /chain/);
});
