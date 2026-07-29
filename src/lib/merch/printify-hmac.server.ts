/**
 * Printify webhook HMAC-SHA256 verification.
 *
 * Official Printify pattern (developers.printify.com):
 *   hash = HMAC_SHA256(secret_utf8, body_utf8).hexdigest()
 *   header X-Pfy-Signature = "sha256=" + hash
 *   accept if hmac.compare_digest(header, expected)
 *
 * Rules:
 * - Always use the **raw** request body (never re-serialized JSON).
 * - Compare digests with timingSafeEqual on raw 32-byte buffers.
 * - Support secret rotation via PRINTIFY_WEBHOOK_SECRET_PREVIOUS.
 * - Never return expected signatures to untrusted clients.
 */
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

export const PRINTIFY_SIGNATURE_HEADER = "x-pfy-signature" as const;
export const PRINTIFY_SIGNATURE_PREFIX = "sha256=" as const;
/** SHA-256 digest length in bytes */
const DIGEST_BYTES = 32;
const DIGEST_HEX_LEN = 64;

export type HmacVerifyCode =
  | "ok"
  | "no_secret"
  | "missing_header"
  | "empty_header"
  | "malformed_header"
  | "mismatch"
  | "empty_secret"
  | "stale_event"
  | "body_too_large";

export type SecretSlot = "primary" | "previous";

export interface HmacVerifyResult {
  valid: boolean;
  code: HmacVerifyCode;
  reason: string;
  algorithm: "sha256";
  /** Which secret matched (never the secret value) */
  matchedSlot?: SecretSlot;
  /** Diagnostics only — omitted from public API responses */
  _diag?: {
    expectedHeader?: string;
    providedPrefix?: string;
  };
}

export type WebhookBody = string | Buffer | Uint8Array;

export interface WebhookSecrets {
  primary?: string;
  previous?: string;
}

function toBuffer(body: WebhookBody): Buffer {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  return Buffer.from(body, "utf8");
}

/** Constant-time equality for equal-length Buffers. */
export function safeEqualBuffers(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Constant-time compare of two hex digests (case-insensitive).
 * Decodes hex → bytes then timingSafeEqual (preferred over string compare).
 */
export function safeEqualHex(a: string, b: string): boolean {
  const ha = a.trim().toLowerCase();
  const hb = b.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(ha) || !/^[0-9a-f]+$/.test(hb)) return false;
  if (ha.length !== hb.length || ha.length % 2 !== 0) return false;
  try {
    return safeEqualBuffers(Buffer.from(ha, "hex"), Buffer.from(hb, "hex"));
  } catch {
    return false;
  }
}

/**
 * Constant-time compare of full header values (Printify sample style):
 *   compare_digest("sha256=...", "sha256=...")
 * Pads/truncates via length check first — unequal lengths always fail.
 */
export function safeEqualHeader(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    // Still run a dummy compare to reduce trivial timing branch on short inputs
    const dummy = Buffer.alloc(DIGEST_HEX_LEN + PRINTIFY_SIGNATURE_PREFIX.length);
    timingSafeEqual(dummy, dummy);
    return false;
  }
  return safeEqualBuffers(ba, bb);
}

/** Raw 32-byte HMAC-SHA256 digest. */
export function printifyHmacDigest(
  rawBody: WebhookBody,
  secret: string,
): Buffer {
  return createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(toBuffer(rawBody))
    .digest();
}

/** Hex-only digest (no prefix). */
export function printifyHmacHex(rawBody: WebhookBody, secret: string): string {
  return printifyHmacDigest(rawBody, secret).toString("hex");
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
  return `${PRINTIFY_SIGNATURE_PREFIX}${printifyHmacHex(rawBody, secret)}`;
}

/**
 * Generate a strong webhook secret (for install flows).
 * Printify accepts an arbitrary secret string you provide when creating webhooks.
 */
export function generateWebhookSecret(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Parse `sha256=<hex>` or bare hex from X-Pfy-Signature.
 * Matches Printify docs: header is "sha256=" + hexdigest.
 */
export function parseSignatureHeader(
  header: string | null | undefined,
):
  | { ok: true; hex: string; digest: Buffer; fullHeader: string; raw: string }
  | { ok: false; code: HmacVerifyCode; reason: string } {
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

  // Reject multi-signature / injection noise
  if (raw.includes(",") || raw.includes("\n") || raw.includes("\r")) {
    return {
      ok: false,
      code: "malformed_header",
      reason: "X-Pfy-Signature contains unexpected characters",
    };
  }

  let hex = raw;
  const lower = raw.toLowerCase();
  if (lower.startsWith("sha256=")) {
    hex = raw.slice("sha256=".length).trim();
  } else if (lower.startsWith("sha-256=")) {
    hex = raw.slice("sha-256=".length).trim();
  }

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

  const normalizedHex = hex.toLowerCase();
  let digest: Buffer;
  try {
    digest = Buffer.from(normalizedHex, "hex");
  } catch {
    return {
      ok: false,
      code: "malformed_header",
      reason: "Invalid hex digest",
    };
  }
  if (digest.length !== DIGEST_BYTES) {
    return {
      ok: false,
      code: "malformed_header",
      reason: "Digest must be 32 bytes",
    };
  }

  const fullHeader = `${PRINTIFY_SIGNATURE_PREFIX}${normalizedHex}`;
  return { ok: true, hex: normalizedHex, digest, fullHeader, raw };
}

function isUsableSecret(secret: string | undefined | null): secret is string {
  return typeof secret === "string" && secret.length > 0 && secret.trim().length > 0;
}

/**
 * Resolve secrets from env / explicit opts.
 * primary: PRINTIFY_WEBHOOK_SECRET
 * previous: PRINTIFY_WEBHOOK_SECRET_PREVIOUS (rotation)
 */
export function resolveWebhookSecrets(
  explicit?: string | WebhookSecrets | null,
): WebhookSecrets {
  if (typeof explicit === "string") {
    return { primary: isUsableSecret(explicit) ? explicit : undefined };
  }
  if (explicit && typeof explicit === "object") {
    return {
      primary: isUsableSecret(explicit.primary) ? explicit.primary : undefined,
      previous: isUsableSecret(explicit.previous)
        ? explicit.previous
        : undefined,
    };
  }
  const primary = process.env.PRINTIFY_WEBHOOK_SECRET;
  const previous = process.env.PRINTIFY_WEBHOOK_SECRET_PREVIOUS;
  return {
    primary: isUsableSecret(primary) ? primary : undefined,
    previous: isUsableSecret(previous) ? previous : undefined,
  };
}

export function hasAnyWebhookSecret(secrets?: WebhookSecrets): boolean {
  const s = secrets ?? resolveWebhookSecrets();
  return Boolean(s.primary || s.previous);
}

/**
 * Verify against one secret. Compare both:
 * 1) raw digest bytes (preferred)
 * 2) full header string (Printify Python sample parity)
 */
function verifyAgainstSecret(
  rawBody: WebhookBody,
  parsed: Extract<ReturnType<typeof parseSignatureHeader>, { ok: true }>,
  secret: string,
  slot: SecretSlot,
  includeDiag: boolean,
): HmacVerifyResult | null {
  const expectedDigest = printifyHmacDigest(rawBody, secret);
  const expectedHex = expectedDigest.toString("hex");
  const expectedHeader = `${PRINTIFY_SIGNATURE_PREFIX}${expectedHex}`;

  const digestMatch = safeEqualBuffers(expectedDigest, parsed.digest);
  const headerMatch = safeEqualHeader(expectedHeader, parsed.fullHeader);

  if (digestMatch || headerMatch) {
    return {
      valid: true,
      code: "ok",
      reason: "ok",
      algorithm: "sha256",
      matchedSlot: slot,
      ...(includeDiag ? { _diag: { expectedHeader } } : {}),
    };
  }
  return null;
}

/**
 * Verify Printify webhook HMAC (single secret or rotation pair).
 *
 * @param rawBody - exact request body as received
 * @param signatureHeader - value of X-Pfy-Signature
 * @param secretOrSecrets - string secret, {primary,previous}, or null (env)
 */
export function verifyPrintifySignature(
  rawBody: WebhookBody,
  signatureHeader: string | null | undefined,
  secretOrSecrets?: string | WebhookSecrets | null,
): HmacVerifyResult {
  const algorithm = "sha256" as const;
  const includeDiag = process.env.PRINTIFY_HMAC_DIAG === "1";
  const secrets = resolveWebhookSecrets(secretOrSecrets);

  if (!secrets.primary && !secrets.previous) {
    return {
      valid: false,
      code: "no_secret",
      reason: "PRINTIFY_WEBHOOK_SECRET not set — signature cannot be verified",
      algorithm,
    };
  }

  // Prefer primary; empty whitespace already filtered
  if (secrets.primary !== undefined && !secrets.primary.trim() && !secrets.previous) {
    return {
      valid: false,
      code: "empty_secret",
      reason: "PRINTIFY_WEBHOOK_SECRET is empty",
      algorithm,
    };
  }

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed.ok) {
    return {
      valid: false,
      code: parsed.code,
      reason: parsed.reason,
      algorithm,
    };
  }

  if (secrets.primary) {
    const hit = verifyAgainstSecret(
      rawBody,
      parsed,
      secrets.primary,
      "primary",
      includeDiag,
    );
    if (hit) return hit;
  }
  if (secrets.previous) {
    const hit = verifyAgainstSecret(
      rawBody,
      parsed,
      secrets.previous,
      "previous",
      includeDiag,
    );
    if (hit) return hit;
  }

  // Always burn similar CPU on failure (both secrets already tried)
  return {
    valid: false,
    code: "mismatch",
    reason: "HMAC signature mismatch",
    algorithm,
    ...(includeDiag
      ? {
          _diag: {
            expectedHeader: secrets.primary
              ? signPrintifyBody(rawBody, secrets.primary)
              : undefined,
            providedPrefix: parsed.fullHeader.slice(0, 12),
          },
        }
      : {}),
  };
}

/**
 * Optional staleness check using payload.created_at (ISO).
 * Env: PRINTIFY_WEBHOOK_MAX_AGE_SEC (default 0 = disabled)
 */
export function checkEventFreshness(
  payload: { created_at?: unknown } | null | undefined,
  maxAgeSec?: number,
): { ok: true } | { ok: false; code: "stale_event"; reason: string; ageSec: number } {
  const max =
    maxAgeSec ??
    (Number(process.env.PRINTIFY_WEBHOOK_MAX_AGE_SEC) || 0);
  if (!max || max <= 0) return { ok: true };
  const raw = payload?.created_at;
  if (typeof raw !== "string" || !raw) return { ok: true };
  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) return { ok: true };
  const ageSec = Math.floor((Date.now() - ts) / 1000);
  // Allow small clock skew into the future (5 min)
  if (ageSec < -300) {
    return {
      ok: false,
      code: "stale_event",
      reason: "Event created_at is too far in the future",
      ageSec,
    };
  }
  if (ageSec > max) {
    return {
      ok: false,
      code: "stale_event",
      reason: `Event older than ${max}s (age ${ageSec}s)`,
      ageSec,
    };
  }
  return { ok: true };
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
 *   - PRINTIFY_WEBHOOK_STRICT=1 / ENFORCE_SIGNATURE=1 → strict
 *   - PRINTIFY_WEBHOOK_LOOSE=1 → loose even with secret
 */
export function shouldAcceptSignedWebhook(
  check: HmacVerifyResult,
  opts?: {
    policy?: SignaturePolicy;
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
  return {
    accept: true,
    policy,
    reason:
      check.matchedSlot === "previous"
        ? "signature verified (previous secret — rotate webhooks when ready)"
        : "signature verified",
  };
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

/** Public-safe view of verify result (no digests / expected headers). */
export function publicHmacView(check: HmacVerifyResult) {
  return {
    valid: check.valid,
    code: check.code,
    reason: check.reason,
    algorithm: check.algorithm,
    matched_slot: check.matchedSlot ?? null,
  };
}

/**
 * Full request verification helper for route handlers.
 * Tries primary + previous secrets from env unless overridden.
 */
export function verifyPrintifyRequest(
  rawBody: WebhookBody,
  request: Request,
  secretOrSecrets?: string | WebhookSecrets | null,
  policy?: SignaturePolicy,
): {
  check: HmacVerifyResult;
  decision: ReturnType<typeof shouldAcceptSignedWebhook>;
} {
  const check = verifyPrintifySignature(
    rawBody,
    getPrintifySignatureFromRequest(request),
    secretOrSecrets === undefined ? null : secretOrSecrets,
  );
  const decision = shouldAcceptSignedWebhook(check, { policy });
  return { check, decision };
}

/**
 * Read body as UTF-8 string while preserving bytes for HMAC.
 * Prefer this over request.json() so signature covers the exact wire body.
 */
export async function readRawWebhookBody(
  request: Request,
  maxBytes = 512 * 1024,
): Promise<
  | { ok: true; raw: string; bytes: Buffer }
  | { ok: false; code: "body_too_large"; reason: string }
> {
  const ab = await request.arrayBuffer();
  if (ab.byteLength > maxBytes) {
    return {
      ok: false,
      code: "body_too_large",
      reason: `Body exceeds ${maxBytes} bytes`,
    };
  }
  const bytes = Buffer.from(ab);
  return { ok: true, raw: bytes.toString("utf8"), bytes };
}
