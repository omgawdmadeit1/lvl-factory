#!/usr/bin/env node
/**
 * Print apply instructions for the lvl-factory AWS OIDC stack.
 *
 * Requires AWS_ACCOUNT_ID (12 digits):
 *   export AWS_ACCOUNT_ID=123456789012
 *   # or: cp infra/aws/config.example.env infra/aws/config.env && edit
 *
 *   npm run aws:oidc:print
 *   S3_BUCKET=my-bucket npm run aws:oidc:print
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function loadDotEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const fileCfg = {
  ...loadDotEnv(join(ROOT, "infra/aws/config.env")),
  ...loadDotEnv(join(ROOT, ".env.vercel")),
  ...loadDotEnv(join(ROOT, ".env")),
};

const TEAM = "tesla-trek";
const PROJECT = "lvl-factory";
const REGION =
  process.env.AWS_REGION || fileCfg.AWS_REGION || "us-east-1";
const ACCOUNT_RAW =
  process.env.AWS_ACCOUNT_ID || fileCfg.AWS_ACCOUNT_ID || "";
const BUCKET =
  process.env.S3_BUCKET ||
  process.env.AWS_S3_BUCKET ||
  fileCfg.AWS_S3_BUCKET ||
  "";
const PREFIX =
  process.env.AWS_S3_PREFIX || fileCfg.AWS_S3_PREFIX || "factory/";
const ROLE =
  process.env.AWS_ROLE_NAME ||
  fileCfg.AWS_ROLE_NAME ||
  "lvl-factory-runtime-prod";

/** @returns {{ ok: true, id: string } | { ok: false, detail: string }} */
function validateAccountId(raw) {
  const id = String(raw || "").trim();
  if (!id) {
    return {
      ok: false,
      detail: "AWS_ACCOUNT_ID is missing",
    };
  }
  if (!/^\d{12}$/.test(id)) {
    return {
      ok: false,
      detail: `AWS_ACCOUNT_ID must be exactly 12 digits (got ${JSON.stringify(id)})`,
    };
  }
  if (id === "000000000000" || id === "123456789012") {
    return {
      ok: false,
      detail: "AWS_ACCOUNT_ID looks like a placeholder, not a real account",
    };
  }
  return { ok: true, id };
}

const account = validateAccountId(ACCOUNT_RAW);
if (!account.ok) {
  console.error("");
  console.error("ERROR [2]: missing AWS account ID");
  console.error(`  ${account.detail}`);
  console.error("");
  console.error("How to fix:");
  console.error("  1. AWS Console → top-right account menu → copy Account ID");
  console.error("     or: aws sts get-caller-identity --query Account --output text");
  console.error("  2. export AWS_ACCOUNT_ID=12digits");
  console.error("     or: cp infra/aws/config.example.env infra/aws/config.env");
  console.error("         # set AWS_ACCOUNT_ID=… then re-run");
  console.error("");
  console.error("Docs: DOMAIN.md § AWS OIDC integration");
  process.exit(2);
}

const ACCOUNT = account.id;
const bucketOk = Boolean(BUCKET && !/^YOUR_/i.test(BUCKET));
const roleArnHint = `arn:aws:iam::${ACCOUNT}:role/${ROLE}`;

console.log(`AWS OIDC apply guide — ${TEAM}/${PROJECT}
Region:    ${REGION}
Account:   ${ACCOUNT}  ✓
Bucket:    ${bucketOk ? BUCKET : "(set AWS_S3_BUCKET / S3_BUCKET)"}
Prefix:    ${PREFIX}
Role:      ${ROLE}
Role ARN:  ${roleArnHint}

────────────────────────────────────────────────────────────
1) Create the S3 bucket (if needed)
────────────────────────────────────────────────────────────
${
  bucketOk
    ? `aws s3api create-bucket --bucket ${BUCKET} --region ${REGION} \\
  $([ "${REGION}" = "us-east-1" ] || echo "--create-bucket-configuration LocationConstraint=${REGION}")

aws s3api put-public-access-block --bucket ${BUCKET} --public-access-block-configuration \\
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true`
    : `# Set bucket first:
#   export AWS_S3_BUCKET=your-unique-bucket-name
#   npm run aws:oidc:print`
}

────────────────────────────────────────────────────────────
2) Deploy IAM IdP + least-privilege role
────────────────────────────────────────────────────────────
${
  bucketOk
    ? `aws cloudformation deploy \\
  --stack-name lvl-factory-oidc \\
  --template-file infra/aws/lvl-factory-oidc.yaml \\
  --parameter-overrides \\
    S3BucketName=${BUCKET} \\
    BucketPrefix=${PREFIX} \\
    RoleName=${ROLE} \\
  --capabilities CAPABILITY_NAMED_IAM \\
  --region ${REGION}

aws cloudformation describe-stacks --stack-name lvl-factory-oidc --region ${REGION} \\
  --query "Stacks[0].Outputs" --output table`
    : "# (needs AWS_S3_BUCKET)"
}

────────────────────────────────────────────────────────────
3) Capture RoleArn (should match ${roleArnHint})
────────────────────────────────────────────────────────────
ROLE_ARN=$(aws cloudformation describe-stacks --stack-name lvl-factory-oidc --region ${REGION} \\
  --query "Stacks[0].Outputs[?OutputKey=='RoleArn'].OutputValue" --output text)
echo "AWS_ROLE_ARN=$ROLE_ARN"

────────────────────────────────────────────────────────────
4) Enable Vercel OIDC federation
────────────────────────────────────────────────────────────
export VERCEL_TOKEN=vcp_…   # team tesla-trek
npm run vercel:oidc:enable

────────────────────────────────────────────────────────────
5) Sync env → Vercel (PRODUCTION scope)
────────────────────────────────────────────────────────────
cat >> .env.vercel <<EOF
AWS_ACCOUNT_ID=${ACCOUNT}
AWS_ROLE_ARN=${roleArnHint}
AWS_REGION=${REGION}
AWS_S3_BUCKET=${bucketOk ? BUCKET : "YOUR_BUCKET"}
AWS_S3_PREFIX=${PREFIX}
EOF

npm run vercel:env:dry
npm run vercel:env:sync
# Redeploy production.

────────────────────────────────────────────────────────────
6) Verify
────────────────────────────────────────────────────────────
curl -sS https://factory.lvlltd.com/api/aws/status | jq .
# ?probe=1 after redeploy for live STS assume

Trust subject:
  owner:${TEAM}:project:${PROJECT}:environment:production
`);
if (!bucketOk) process.exitCode = 3;
