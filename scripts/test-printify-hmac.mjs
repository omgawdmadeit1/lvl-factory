#!/usr/bin/env node
/**
 * Self-test improved Printify HMAC helpers.
 * Run: node scripts/test-printify-hmac.mjs
 */
import { createHmac, timingSafeEqual, createHash } from "node:crypto";

const PREFIX = "sha256=";

function toBuf(body) {
  return Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
}

function digest(rawBody, secret) {
  return createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(toBuf(rawBody))
    .digest();
}

function sign(rawBody, secret) {
  return PREFIX + digest(rawBody, secret).toString("hex");
}

function safeEqualBuffers(a, b) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function safeEqualHex(a, b) {
  const ha = a.trim().toLowerCase();
  const hb = b.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(ha) || !/^[0-9a-f]+$/.test(hb)) return false;
  if (ha.length !== hb.length || ha.length % 2) return false;
  return safeEqualBuffers(Buffer.from(ha, "hex"), Buffer.from(hb, "hex"));
}

function safeEqualHeader(a, b) {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return safeEqualBuffers(ba, bb);
}

function parseHeader(header) {
  if (header == null) return { ok: false, code: "missing_header" };
  const raw = header.trim();
  if (!raw) return { ok: false, code: "empty_header" };
  if (raw.includes(",") || raw.includes("\n")) return { ok: false, code: "malformed_header" };
  let hex = raw;
  const lower = raw.toLowerCase();
  if (lower.startsWith("sha256=")) hex = raw.slice(7).trim();
  else if (lower.startsWith("sha-256=")) hex = raw.slice(8).trim();
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return { ok: false, code: "malformed_header" };
  const normalized = hex.toLowerCase();
  return {
    ok: true,
    hex: normalized,
    digest: Buffer.from(normalized, "hex"),
    fullHeader: PREFIX + normalized,
  };
}

function verify(rawBody, signatureHeader, secrets) {
  const s =
    typeof secrets === "string"
      ? { primary: secrets }
      : secrets || {};
  if (!s.primary && !s.previous) return { valid: false, code: "no_secret" };
  const parsed = parseHeader(signatureHeader);
  if (!parsed.ok) return { valid: false, code: parsed.code };

  for (const [slot, secret] of [
    ["primary", s.primary],
    ["previous", s.previous],
  ]) {
    if (!secret) continue;
    const expected = digest(rawBody, secret);
    const expectedHeader = PREFIX + expected.toString("hex");
    if (
      safeEqualBuffers(expected, parsed.digest) ||
      safeEqualHeader(expectedHeader, parsed.fullHeader)
    ) {
      return { valid: true, code: "ok", matchedSlot: slot };
    }
  }
  return { valid: false, code: "mismatch" };
}

let failed = 0;
function assert(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    failed += 1;
  } else {
    console.log("ok  ", name);
  }
}

const secret = "test-printify-secret-🔑";
const body = JSON.stringify({
  id: "evt_1",
  type: "order:created",
  resource: { id: "ord_9", type: "order", data: { shop_id: 1 } },
});

const good = sign(body, secret);
assert("sign prefix", good.startsWith("sha256="));
assert("sign hex len", good.slice(7).length === 64);
assert("verify good", verify(body, good, secret).valid === true);
assert("verify bare hex", verify(body, good.slice(7), secret).valid === true);
assert(
  "verify uppercase hex",
  verify(body, "sha256=" + good.slice(7).toUpperCase(), secret).valid === true,
);
assert("reject wrong secret", verify(body, good, "other").valid === false);
assert("reject tampered body", verify(body + " ", good, secret).valid === false);
assert("reject missing", verify(body, null, secret).code === "missing_header");
assert("reject malformed", verify(body, "sha256=deadbeef", secret).code === "malformed_header");
assert("reject comma injection", verify(body, good + ",extra", secret).code === "malformed_header");
assert("no secret", verify(body, good, null).code === "no_secret");

// Python parity: secret.encode('utf-8'), body.encode('utf-8')
const pyStyle =
  "sha256=" +
  createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(Buffer.from(body, "utf8"))
    .digest("hex");
assert("python utf8 parity", verify(body, pyStyle, secret).valid);
assert("full header compare_digest style", safeEqualHeader(pyStyle, good));

// Binary body path
const bodyBuf = Buffer.from(body, "utf8");
assert("buffer body", verify(bodyBuf, good, secret).valid);

// Rotation
const prev = "old-secret-rotation";
const prevSig = sign(body, prev);
const rot = verify(body, prevSig, { primary: secret, previous: prev });
assert("rotation previous matches", rot.valid && rot.matchedSlot === "previous");
const rotPrimary = verify(body, good, { primary: secret, previous: prev });
assert("rotation primary matches", rotPrimary.valid && rotPrimary.matchedSlot === "primary");

// Digest bytes compare
const d1 = digest(body, secret);
const d2 = Buffer.from(good.slice(7), "hex");
assert("digest byte equal", safeEqualBuffers(d1, d2));

// Hex vs string timing path
assert("safeEqualHex", safeEqualHex(good.slice(7), d1.toString("hex")));

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll improved HMAC self-tests passed");
