import { createFileRoute } from "@tanstack/react-router";
import { getAwsS3Config, probeS3Access } from "@/lib/aws/s3.server";

/**
 * GET /api/aws/status
 * Safe config inventory + optional live OIDC→S3 probe (?probe=1).
 * Never returns secrets or role session tokens.
 */
export const Route = createFileRoute("/api/aws/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const probe = url.searchParams.get("probe") === "1";
        const cfg = getAwsS3Config();

        const body: Record<string, unknown> = {
          service: "s3",
          auth: "vercel-oidc",
          team: "tesla-trek",
          project: "lvl-factory",
          trust_sub:
            "owner:tesla-trek:project:lvl-factory:environment:production",
          configured: cfg.configured,
          region: cfg.region,
          bucket: cfg.bucket,
          prefix: cfg.prefix,
          role_arn_set: Boolean(cfg.roleArn),
          role_arn_suffix: cfg.roleArn
            ? cfg.roleArn.split("/").pop() || null
            : null,
          missing: cfg.missing,
          docs: "DOMAIN.md § AWS OIDC integration",
        };

        if (probe) {
          if (!cfg.configured) {
            body.probe = {
              ok: false,
              skipped: true,
              reason: "missing env",
            };
          } else {
            body.probe = await probeS3Access();
          }
        }

        return Response.json(body, {
          headers: {
            "cache-control": "no-store",
          },
          status: cfg.configured ? 200 : 503,
        });
      },
    },
  },
});
