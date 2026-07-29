/**
 * Server-only S3 client via Vercel OIDC → AWS STS (no static AWS keys).
 *
 * Requires (production):
 *   - Project OIDC federation enabled (team issuer)
 *   - AWS_ROLE_ARN, AWS_REGION, AWS_S3_BUCKET
 *   - IAM trust: owner:tesla-trek:project:lvl-factory:environment:production
 *
 * Local without OIDC: returns configured=false; do not call clients.
 */
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

export type AwsS3Config = {
  configured: boolean;
  region: string | null;
  roleArn: string | null;
  bucket: string | null;
  prefix: string;
  missing: string[];
};

function env(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env[name];
  return v?.trim() ? v.trim() : undefined;
}

/** Read config without constructing SDK clients. */
export function getAwsS3Config(): AwsS3Config {
  const region = env("AWS_REGION") || env("AWS_DEFAULT_REGION") || null;
  const roleArn = env("AWS_ROLE_ARN") || null;
  const bucket = env("AWS_S3_BUCKET") || null;
  let prefix = env("AWS_S3_PREFIX") || "factory/";
  if (prefix && !prefix.endsWith("/")) prefix = `${prefix}/`;

  const missing: string[] = [];
  if (!roleArn) missing.push("AWS_ROLE_ARN");
  if (!region) missing.push("AWS_REGION");
  if (!bucket) missing.push("AWS_S3_BUCKET");

  return {
    configured: missing.length === 0,
    region,
    roleArn,
    bucket,
    prefix,
    missing,
  };
}

let cachedClient: S3Client | null = null;
let cachedKey: string | null = null;

/**
 * Lazy S3 client using Vercel OIDC credentials provider.
 * Throws if env is incomplete (call getAwsS3Config first).
 */
export async function getS3Client(): Promise<S3Client> {
  const cfg = getAwsS3Config();
  if (!cfg.configured || !cfg.roleArn || !cfg.region) {
    throw new Error(
      `AWS S3 not configured — missing ${cfg.missing.join(", ")}. ` +
        "See DOMAIN.md § AWS OIDC integration / infra/aws/lvl-factory-oidc.yaml",
    );
  }

  const key = `${cfg.region}|${cfg.roleArn}`;
  if (cachedClient && cachedKey === key) return cachedClient;

  // Dynamic import so builds without native OIDC still typecheck
  const { awsCredentialsProvider } = await import(
    "@vercel/oidc-aws-credentials-provider"
  );

  cachedClient = new S3Client({
    region: cfg.region,
    credentials: awsCredentialsProvider({
      roleArn: cfg.roleArn,
      // Match common STS audience; IAM trust uses https://vercel.com/tesla-trek by default.
      // If assume fails with audience mismatch, set AWS_OIDC_AUDIENCE.
      ...(env("AWS_OIDC_AUDIENCE")
        ? { audience: env("AWS_OIDC_AUDIENCE")! }
        : {}),
    }),
  });
  cachedKey = key;
  return cachedClient;
}

function objectKey(key: string, prefix: string): string {
  const clean = key.replace(/^\/+/, "");
  if (clean.startsWith(prefix)) return clean;
  return `${prefix}${clean}`;
}

/** Put UTF-8 or binary body under the configured prefix. */
export async function putFactoryObject(opts: {
  key: string;
  body: string | Uint8Array | Buffer;
  contentType?: string;
}): Promise<{ bucket: string; key: string }> {
  const cfg = getAwsS3Config();
  if (!cfg.bucket) throw new Error("AWS_S3_BUCKET missing");
  const client = await getS3Client();
  const key = objectKey(opts.key, cfg.prefix);
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: opts.body,
      ContentType: opts.contentType || "application/octet-stream",
    }),
  );
  return { bucket: cfg.bucket, key };
}

/** Get object bytes (full body). Prefer streaming for large files. */
export async function getFactoryObject(key: string): Promise<{
  bucket: string;
  key: string;
  contentType?: string;
  body: Uint8Array;
}> {
  const cfg = getAwsS3Config();
  if (!cfg.bucket) throw new Error("AWS_S3_BUCKET missing");
  const client = await getS3Client();
  const fullKey = objectKey(key, cfg.prefix);
  const out = await client.send(
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: fullKey,
    }),
  );
  const bytes = out.Body
    ? new Uint8Array(await out.Body.transformToByteArray())
    : new Uint8Array();
  return {
    bucket: cfg.bucket,
    key: fullKey,
    contentType: out.ContentType,
    body: bytes,
  };
}

/** Head-bucket probe — verifies OIDC assume + List/Head permission. */
export async function probeS3Access(): Promise<{
  ok: boolean;
  error?: string;
  bucket?: string;
  region?: string;
}> {
  const cfg = getAwsS3Config();
  if (!cfg.configured || !cfg.bucket) {
    return {
      ok: false,
      error: `not configured: missing ${cfg.missing.join(", ") || "bucket"}`,
    };
  }
  try {
    const client = await getS3Client();
    await client.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
    return { ok: true, bucket: cfg.bucket, region: cfg.region || undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: msg.slice(0, 400),
      bucket: cfg.bucket,
      region: cfg.region || undefined,
    };
  }
}
