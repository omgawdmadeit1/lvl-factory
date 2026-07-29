#!/usr/bin/env node
/**
 * Self-test Printify HMAC helpers (no framework).
 * Run: node scripts/test-printify-hmac.mjs
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const PREFIX = "sha256=";

function printifyHmacHex(rawBody, secret) {
  return createHmac("sha256", secret).update(Buffer.from(rawBody, "utf8")).digest("hex");
}

function sign(rawBody, secret) {
  return PREFIX + printifyHmacHex(rawBody, secret);
}

function safeEqualHex(a, b) {
  const ha = a.trim().toLowerCase();
  const hb = b.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(ha) || !/^[0-9a-f]+$/.test(hb)) return false;
  if (ha.length !== hb.length) return false;
  return timingSafeEqual(Buffer.from(ha, "utf8"), Buffer.from(hb, "utf8"));
}

function parseHeader(header) {
  if (header == null) return { ok: false, code: "missing_header" };
  const raw = header.trim();
  if (!raw) return { ok: false, code: "empty_header" };
  let hex = raw;
  const lower = raw.toLowerCase();
  if (lower.startsWith("sha256=")) hex = raw.slice(7).trim();
  else if (lower.startsWith("sha-256=")) hex = raw.slice(8).trim();
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return { ok: false, code: "malformed_header" };
  return { ok: true, hex: hex.toLowerCase() };
}

function verify(rawBody, signatureHeader, secret) {
  if (!secret) return { valid: false, code: "no_secret" };
  const parsed = parseHeader(signatureHeader);
  if (!parsed.ok) return { valid: false, code: parsed.code };
  const expected = printifyHmacHex(rawBody, secret);
  if (!safeEqualHex(expected, parsed.hex)) return { valid: false, code: "mismatch" };
  return { valid: true, code: "ok" };
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
assert("verify uppercase hex", verify(body, "sha256=" + good.slice(7).toUpperCase(), secret).valid === true);
assert("reject wrong secret", verify(body, good, "other").valid === false);
assert("reject tampered body", verify(body + " ", good, secret).valid === false);
assert("reject missing", verify(body, null, secret).code === "missing_header");
assert("reject malformed", verify(body, "sha256=deadbeef", secret).code === "malformed_header");
assert("no secret", verify(body, good, "").code === "no_secret" || verify(body, good, null).code === "no_secret");

// Printify Python parity: hmac.new(secret.encode(), body.encode(), sha256)
const pyStyle = "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex");
assert("parity with createHmac utf8", verify(body, pyStyle, secret).valid);

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll HMAC self-tests passed");
