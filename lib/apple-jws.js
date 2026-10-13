// Verifies Apple-signed JWS (StoreKit 2 transactions, App Store Server
// Notifications V2) with Web Crypto only, so it runs on Cloudflare Workers.
//
// Same checks as Apple's app-store-server-library (offline mode):
//   1. header alg ES256 and an x5c chain of exactly 3 certificates
//   2. the last certificate IS Apple Root CA - G3 (pinned SHA-256 fingerprint)
//   3. each certificate is issued (issuer == next subject) and signed by the next
//   4. every certificate is inside its validity period
//   5. leaf has Apple's receipt-signing marker 1.2.840.113635.100.6.11.1,
//      intermediate has the WWDR marker 1.2.840.113635.100.6.2.1
//   6. the JWS signature verifies with the leaf key
// Anything else throws; callers treat a throw as "not from Apple".

export const APPLE_ROOT_CA_G3_SHA256 =
  "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179";

const OID_LEAF_MARKER = "1.2.840.113635.100.6.11.1";
const OID_INTERMEDIATE_MARKER = "1.2.840.113635.100.6.2.1";
const CURVES = { "1.2.840.10045.3.1.7": ["P-256", 32], "1.3.132.0.34": ["P-384", 48] };
const SIG_HASH = { "1.2.840.10045.4.3.2": "SHA-256", "1.2.840.10045.4.3.3": "SHA-384" };

export class AppleJWSError extends Error {}
const fail = (why) => { throw new AppleJWSError(why); };

// ---------- base64 ----------
function b64ToBytes(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlToBytes(s) {
  if (typeof s !== "string" || !/^[A-Za-z0-9_-]*$/.test(s)) fail("bad base64url");
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  return b64ToBytes(b + "=".repeat((4 - (b.length % 4)) % 4));
}
const hex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sameBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// ---------- minimal DER ----------
function tlv(buf, off) {
  if (off + 2 > buf.length) fail("der");
  const tag = buf[off];
  let len = buf[off + 1];
  let head = 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n < 1 || n > 4 || off + 2 + n > buf.length) fail("der");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[off + 2 + i];
    head = 2 + n;
  }
  const end = off + head + len;
  if (end > buf.length) fail("der");
  return { tag, start: off, value: off + head, end };
}
function kids(buf, node) {
  const out = [];
  for (let p = node.value; p < node.end; ) {
    const k = tlv(buf, p);
    out.push(k);
    p = k.end;
  }
  return out;
}
function oid(buf, node) {
  if (node.tag !== 0x06) fail("oid");
  const b = buf.subarray(node.value, node.end);
  const parts = [Math.floor(b[0] / 40), b[0] % 40];
  let v = 0;
  for (let i = 1; i < b.length; i++) {
    v = v * 128 + (b[i] & 0x7f);
    if (!(b[i] & 0x80)) { parts.push(v); v = 0; }
  }
  return parts.join(".");
}
function time(buf, node) {
  const s = new TextDecoder().decode(buf.subarray(node.value, node.end));
  let m;
  if (node.tag === 0x17 && (m = /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(s))) {
    const y = Number(m[1]);
    return Date.UTC(y < 50 ? 2000 + y : 1900 + y, m[2] - 1, m[3], m[4], m[5], m[6]);
  }
  if (node.tag === 0x18 && (m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(s))) {
    return Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6]);
  }
  fail("time");
}

/** ECDSA signature DER SEQUENCE{r,s} -> raw r||s as Web Crypto expects. */
function derSigToRaw(der, size) {
  const seq = tlv(der, 0);
  const [r, s] = kids(der, seq);
  const fix = (n) => {
    let v = der.subarray(n.value, n.end);
    while (v.length > size && v[0] === 0) v = v.subarray(1);
    if (v.length > size) fail("sig");
    const o = new Uint8Array(size);
    o.set(v, size - v.length);
    return o;
  };
  const out = new Uint8Array(size * 2);
  out.set(fix(r), 0);
  out.set(fix(s), size);
  return out;
}

function parseCert(der) {
  const root = tlv(der, 0);
  if (root.end !== der.length) fail("cert");
  const [tbs, sigAlg, sigVal] = kids(der, root);
  const t = kids(der, tbs);
  let i = t[0].tag === 0xa0 ? 1 : 0; // explicit version
  i += 2; // serialNumber, signature
  const issuer = t[i++];
  const validity = kids(der, t[i++]);
  const subject = t[i++];
  const spki = t[i++];
  const spkiAlg = kids(der, kids(der, spki)[0]);
  const curve = CURVES[oid(der, spkiAlg[1])];
  if (oid(der, spkiAlg[0]) !== "1.2.840.10045.2.1" || !curve) fail("key type");
  const extensions = new Set();
  for (; i < t.length; i++) {
    if (t[i].tag !== 0xa3) continue;
    for (const ext of kids(der, kids(der, t[i])[0])) extensions.add(oid(der, kids(der, ext)[0]));
  }
  const sigBits = der.subarray(sigVal.value + 1, sigVal.end); // skip unused-bits byte
  return {
    der,
    tbs: der.subarray(tbs.start, tbs.end),
    sigHash: SIG_HASH[oid(der, kids(der, sigAlg)[0])],
    sigDer: sigBits,
    issuer: der.subarray(issuer.start, issuer.end),
    subject: der.subarray(subject.start, subject.end),
    notBefore: time(der, validity[0]),
    notAfter: time(der, validity[1]),
    spki: der.subarray(spki.start, spki.end),
    curve,
    extensions,
  };
}

const importKey = (cert) =>
  crypto.subtle.importKey("spki", cert.spki, { name: "ECDSA", namedCurve: cert.curve[0] }, false, ["verify"]);

/**
 * Returns the decoded payload of an Apple-signed JWS, or throws AppleJWSError.
 * `rootSha256` may be overridden only by tests.
 */
export async function verifyAppleJWS(jws, { rootSha256 = APPLE_ROOT_CA_G3_SHA256, now = Date.now() } = {}) {
  if (typeof jws !== "string" || jws.length > 20000) fail("format");
  const parts = jws.split(".");
  if (parts.length !== 3) fail("format");
  let header;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
  } catch {
    fail("header");
  }
  if (header?.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.length !== 3) fail("header");

  let certs;
  try {
    certs = header.x5c.map((c) => parseCert(b64ToBytes(c)));
  } catch (e) {
    if (e instanceof AppleJWSError) throw e;
    fail("cert");
  }
  const [leaf, intermediate, root] = certs;

  if (hex(await crypto.subtle.digest("SHA-256", root.der)) !== rootSha256.toLowerCase().replace(/:/g, "")) {
    fail("root");
  }
  for (const c of certs) if (!(c.notBefore <= now && now <= c.notAfter)) fail("expired");
  if (!leaf.extensions.has(OID_LEAF_MARKER)) fail("leaf marker");
  if (!intermediate.extensions.has(OID_INTERMEDIATE_MARKER)) fail("intermediate marker");

  for (let k = 0; k < 2; k++) {
    const child = certs[k];
    const parent = certs[k + 1];
    if (!sameBytes(child.issuer, parent.subject) || !child.sigHash) fail("chain");
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: child.sigHash },
      await importKey(parent),
      derSigToRaw(child.sigDer, parent.curve[1]),
      child.tbs
    );
    if (!ok) fail("chain");
  }

  if (leaf.curve[0] !== "P-256") fail("leaf key");
  const signature = b64urlToBytes(parts[2]);
  if (signature.length !== 64) fail("signature");
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    await importKey(leaf),
    signature,
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!ok) fail("signature");

  try {
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  } catch {
    fail("payload");
  }
}
