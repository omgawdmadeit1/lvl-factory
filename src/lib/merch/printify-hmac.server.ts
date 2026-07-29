/**
 * Printify webhook HMAC-SHA256 verification.
 *
 * Spec (Printify API):
 *   digest = HMAC_SHA256(secret, raw_request_body)
 *   header  X-Pfy-Signature: sha256=<hex>
 *
 * Always verify against the **raw** body bytes/string (never re-serialized JSON).
 * Comparison is constant-time on the hex digest.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const PRINTIFY_SIGNATURE_HEADER = "x-pfy-signature" as const;
export const PRINTIFY_SIGNATURE_PREFIX = "sha256=" as const;

export type HmacVerifyCode =
  | "ok"
  | "no_secret"
  | "missing_header"
  | "empty_header"
  | "malformed_header"
  | "mismatch"
  | "empty_secret";

export interface HmacVerifyResult {
  valid: boolean;
  code: HmacVerifyCode;
  reason: string;
  /** Normalized expected header form sha256=<hex> (only when secret present) */
  expectedHeader?: string;
  algorithm: "sha256";
}

export type WebhookBody = string | Buffer | Uint8Array;

function toBuffer(body: WebhookBody): Buffer {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  return Buffer.from(body, "utf8");
}

/** Constant-time equality for equal-length Buffers; false if lengths differ. */
export function safeEqualBuffers(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Constant-time hex string compare (case-insensitive). */
export function safeEqualHex(a: string, b: string): boolean {
  const ha = a.trim().toLowerCase();
  const hb = b.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(ha) || !/^[0-9a-f]+$/.test(hb)) return false;
  if (ha.length !== hb.length) return false;
  return safeEqualBuffers(Buffer.from(ha, "utf8"), Buffer.from(hb, "utf8"));
}

/**
 * Compute Printify-style signature header value.
 * @returns `sha256=<hex digest>`
 */
export function signPrintifyBody(
  rawBody: WebhookBody,
  secret: string,
): string {
  if (!secret) {
    throw new Error("signPrintifyBody: secret is required");
  }
  const digest = createHmac("sha256", secret)
    .update(toBuffer(rawBody))
    .digest("hex");
  return `${PRINTIFY_SIGNATURE_PREFIX}${digest}`;
}

/** Hex-only digest (no prefix). */
export function printifyHmacHex(rawBody: WebhookBody, secret: string): string {
  return createHmac("sha256", secret).update(toBuffer(rawBody)).digest("hex");
}

/**
 * Parse `sha256=<hex>` or bare hex from X-Pfy-Signature.
 */
export function parseSignatureHeader(
  header: string | null | undefined,
): { ok: true; hex: string; raw: string } | { ok: false; code: HmacVerifyCode; reason: string } {
  if (header == null) {
    return {
      ok: false,
      code: "missing_header",
      reason: "Missing X-Pfy-Signature header",
    };
  }
  const raw = header.trim();
  if (!raw) {
    return {
      ok: false,
      code: "empty_header",
      reason: "Empty X-Pfy-Signature header",
    };
  }

  let hex = raw;
  const lower = raw.toLowerCase();
  if (lower.startsWith("sha256=")) {
    hex = raw.slice("sha256=".length).trim();
  } else if (lower.startsWith("sha-256=")) {
    hex = raw.slice("sha-256=".length).trim();
  }

  // strip optional quotes
  if (
    (hex.startsWith('"') && hex.endsWith('"')) ||
    (hex.startsWith("'") && hex.endsWith("'"))
  ) {
    hex = hex.slice(1, -1).trim();
  }

  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    return {
      ok: false,
      code: "malformed_header",
      reason: "X-Pfy-Signature must be sha256=<64 hex chars>",
    };
  }

  return { ok: true, hex: hex.toLowerCase(), raw };
}

/**
 * Verify Printify webhook HMAC.
 *
 * @param rawBody - exact request body as received
 * @param signatureHeader - value of X-Pfy-Signature
 * @param secret - PRINTIFY_WEBHOOK_SECRET (same secret passed to Printify when creating webhooks)
 */
export function verifyPrintifySignature(
  rawBody: WebhookBody,
  signatureHeader: string | null | undefined,
  secret: string | undefined | null,
): HmacVerifyResult {
  const algorithm = "sha256" as const;

  if (secret == null || secret === "") {
    return {
      valid: false,
      code: "no_secret",
      reason: "PRINTIFY_WEBHOOK_SECRET not set — signature cannot be verified",
      algorithm,
    };
  }
  if (!secret.trim()) {
    return {
      valid: false,
      code: "empty_secret",
      reason: "PRINTIFY_WEBHOOK_SECRET is empty",
      algorithm,
    };
  }

  const secretTrim = secret; // Printify uses secret as configured — do not trim mid-secret; only reject all-whitespace above
  // Use secret as provided when creating webhook (including intentional spaces)
  const effectiveSecret = secret;

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed.ok) {
    return {
      valid: false,
      code: parsed.code,
      reason: parsed.reason,
      algorithm,
    };
  }

  const expectedHex = printifyHmacHex(rawBody, effectiveSecret);
  const expectedHeader = `${PRINTIFY_SIGNATURE_PREFIX}${expectedHex}`;

  if (!safeEqualHex(expectedHex, parsed.hex)) {
    return {
      valid: false,
      code: "mismatch",
      reason: "HMAC signature mismatch",
      expectedHeader,
      algorithm,
    };
  }

  return {
    valid: true,
    code: "ok",
    reason: "ok",
    expectedHeader,
    algorithm,
  };
}

export type SignaturePolicy = "strict" | "loose" | "auto";

/**
 * Decide whether to accept a webhook after verification.
 *
 * - strict: secret required AND valid signature required
 * - loose: always accept (dev only; still records signature_valid flag)
 * - auto:
 *   - secret set → require valid signature
 *   - no secret → accept (loose mode for local preview)
 *   - PRINTIFY_WEBHOOK_STRICT=1 forces strict when secret set
 *   - PRINTIFY_WEBHOOK_LOOSE=1 forces loose even with secret
 */
export function shouldAcceptSignedWebhook(
  check: HmacVerifyResult,
  opts?: {
    policy?: SignaturePolicy;
    hasSecret?: boolean;
  },
): { accept: boolean; policy: SignaturePolicy; reason: string } {
  const envLoose = process.env.PRINTIFY_WEBHOOK_LOOSE === "1";
  const envStrict =
    process.env.PRINTIFY_WEBHOOK_STRICT === "1" ||
    process.env.ENFORCE_SIGNATURE === "1";

  let policy: SignaturePolicy = opts?.policy ?? "auto";
  if (policy === "auto") {
    if (envLoose) policy = "loose";
    else if (envStrict) policy = "strict";
    else if (check.code === "no_secret" || check.code === "empty_secret")
      policy = "loose";
    else policy = "strict"; // secret present → enforce
  }

  if (policy === "loose") {
    return {
      accept: true,
      policy,
      reason: check.valid
        ? "accepted (valid signature)"
        : `accepted loose: ${check.reason}`,
    };
  }

  // strict
  if (check.code === "no_secret" || check.code === "empty_secret") {
    return {
      accept: false,
      policy,
      reason: "strict mode requires PRINTIFY_WEBHOOK_SECRET",
    };
  }
  if (!check.valid) {
    return { accept: false, policy, reason: check.reason };
  }
  return { accept: true, policy, reason: "signature verified" };
}

/** Read signature header from a Fetch Request (case-insensitive). */
export function getPrintifySignatureFromRequest(request: Request): string | null {
  return (
    request.headers.get(PRINTIFY_SIGNATURE_HEADER) ||
    request.headers.get("X-Pfy-Signature") ||
    request.headers.get("X-PFY-SIGNATURE") ||
    null
  );
}

/**
 * Full request verification helper for route handlers.
 */
export function verifyPrintifyRequest(
  rawBody: WebhookBody,
  request: Request,
  secret: string | undefined | null,
  policy?: SignaturePolicy,
): {
  check: HmacVerifyResult;
  decision: ReturnType<typeof shouldAcceptSignedWebhook>;
} {
  const check = verifyPrintifySignature(
    rawBody,
    getPrintifySignatureFromRequest(request),
    secret,
  );
  const decision = shouldAcceptSignedWebhook(check, { policy });
  return { check, decision };
}
