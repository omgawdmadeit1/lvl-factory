import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  Loader2,
  Radio,
  RefreshCw,
  Webhook,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRINTIFY_WEBHOOK_TOPICS } from "@/lib/merch/webhook-topics";
import type { StoredWebhookEvent } from "@/lib/merch/webhook-topics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/webhooks")({
  component: WebhooksPage,
});

interface CredStatus {
  hasToken: boolean;
  hasShopId: boolean;
  hasWebhookSecret: boolean;
  webhookUrl: string;
  topics: string[];
}

interface EventsResponse {
  ok: boolean;
  endpoint?: string;
  status?: CredStatus;
  events?: StoredWebhookEvent[];
  orders?: Array<Record<string, unknown>>;
  error?: string;
}

interface SubResponse {
  ok: boolean;
  status?: CredStatus;
  remote?: Array<{ id: string; topic: string; url: string }>;
  note?: string;
  error?: string;
  created?: unknown[];
  skipped?: string[];
  errors?: string[];
}

function WebhooksPage() {
  const [events, setEvents] = useState<StoredWebhookEvent[]>([]);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [remote, setRemote] = useState<
    Array<{ id: string; topic: string; url: string }>
  >([]);
  const [status, setStatus] = useState<CredStatus | null>(null);
  const [endpoint, setEndpoint] = useState("/api/printify/webhooks");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [simTopic, setSimTopic] = useState<string>("order:created");
  const [note, setNote] = useState<string | null>(null);
  const [wafInfo, setWafInfo] = useState<Record<string, unknown> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, subRes] = await Promise.all([
        fetch("/api/printify/webhooks").then((r) => r.json() as Promise<EventsResponse>),
        fetch("/api/printify/subscriptions").then(
          (r) => r.json() as Promise<SubResponse>,
        ),
      ]);
      if (evRes.events) setEvents(evRes.events);
      if (evRes.orders) setOrders(evRes.orders);
      if (evRes.endpoint) setEndpoint(evRes.endpoint);
      if (evRes.status) setStatus(evRes.status);
      if ((evRes as { waf?: Record<string, unknown> }).waf) setWafInfo((evRes as { waf?: Record<string, unknown> }).waf ?? null);
      if (subRes.remote) setRemote(subRes.remote);
      if (subRes.status) setStatus(subRes.status);
      if (subRes.note) setNote(subRes.note);
      if (!evRes.ok && evRes.error) toast.error(evRes.error);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function postAction(body: Record<string, unknown>, label: string) {
    setBusy(label);
    try {
      const res = await fetch("/api/printify/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as SubResponse & {
        result?: { notes?: string };
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error || `Failed: ${label}`);
      } else {
        toast.success(
          data.result?.notes ||
            (Array.isArray(data.created)
              ? `Created ${data.created.length} webhook(s)`
              : `${label} ok`),
        );
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">Printify</Badge>
            <Badge variant="default">webhooks</Badge>
            <Badge variant="success">HMAC ready</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Printify webhooks
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Receive product and order events from Printify into the LVL factory.
            Endpoint is public under factory.lvlltd.com (Cloudflare). Signature
            uses <code className="text-fg">PRINTIFY_WEBHOOK_SECRET</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </Button>
          <Button asChild variant="secondary">
            <Link to="/pipeline">Merch pipeline</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/merch" search={{}}>
              Shop
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="API token"
          ok={Boolean(status?.hasToken)}
          detail={status?.hasToken ? "Set" : "PRINTIFY_API_TOKEN"}
        />
        <Stat
          label="Shop id"
          ok={Boolean(status?.hasShopId)}
          detail={status?.hasShopId ? "Set" : "PRINTIFY_SHOP_ID"}
        />
        <Stat
          label="Webhook secret"
          ok={Boolean(status?.hasWebhookSecret)}
          detail={status?.hasWebhookSecret ? "HMAC on" : "Optional / loose"}
        />
        <Stat
          label="Remote hooks"
          ok={remote.length > 0}
          detail={`${remote.length} subscribed`}
        />
      </div>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="size-4" />
            Receive URL
          </CardTitle>
          <CardDescription>
            Point every Printify topic at this HTTPS URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="break-all rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-fg">
            {endpoint}
          </p>
          {note ? (
            <p className="text-xs text-warning">{note}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                void postAction({ action: "install_all" }, "install_all")
              }
              disabled={busy !== null || !status?.hasToken}
            >
              {busy === "install_all" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Radio className="size-4" />
              )}
              Install all topics
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void postAction(
                  { action: "local_simulate", topic: simTopic },
                  "local_simulate",
                )
              }
              disabled={busy !== null}
            >
              {busy === "local_simulate" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Bell className="size-4" />
              )}
              Local simulate
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void postAction({ action: "hmac_roundtrip" }, "hmac_roundtrip")
              }
              disabled={busy !== null}
            >
              {busy === "hmac_roundtrip" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              HMAC self-test
            </Button>
            <div className="w-full max-w-xs sm:w-48">
              <Select value={simTopic} onValueChange={setSimTopic}>
                <SelectTrigger>
                  <SelectValue placeholder="Topic" />
                </SelectTrigger>
                <SelectContent>
                  {PRINTIFY_WEBHOOK_TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-subtle">
            Topics: {PRINTIFY_WEBHOOK_TOPICS.join(" · ")}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-base">Cloudflare WAF</CardTitle>
          <CardDescription>
            Edge worker + zone rules protect /api/printify/*
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted">
          <ul className="list-inside list-disc space-y-1">
            <li>Worker rate limit: 60 POST/min/IP on webhooks</li>
            <li>Body cap 512KB · method allowlist · optional signature gate</li>
            <li>Zone rules: cloudflare/waf/printify-webhooks-rules.json</li>
            <li>Apply: node scripts/apply-cloudflare-waf.mjs</li>
            <li>Deploy proxy: wrangler deploy -c cloudflare/workers/lvl-factory-proxy/wrangler.toml</li>
          </ul>
          {wafInfo ? (
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-bg p-2 font-mono text-[10px] text-subtle">
              {JSON.stringify(wafInfo, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>


      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base">Remote subscriptions</CardTitle>
            <CardDescription>
              Live list from Printify when token is configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {remote.length === 0 ? (
              <p className="text-sm text-muted">
                No remote webhooks yet. Set credentials and install all topics.
              </p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto">
                {remote.map((w) => (
                  <li
                    key={w.id}
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-fg">{w.topic}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2"
                        disabled={busy !== null}
                        onClick={() =>
                          void postAction(
                            { action: "delete", webhookId: w.id },
                            "delete",
                          )
                        }
                      >
                        Delete
                      </Button>
                    </div>
                    <p className="mt-1 break-all font-mono text-[10px] text-subtle">
                      {w.url}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted">
                      {w.id}
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2 h-7"
                      disabled={busy !== null}
                      onClick={() =>
                        void postAction(
                          { action: "simulate", webhookId: w.id },
                          "simulate",
                        )
                      }
                    >
                      Simulate via Printify
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base">Event log</CardTitle>
            <CardDescription>
              Last {events.length} deliveries (PGLite / Neon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted">
                No events yet. Run local simulate to verify the pipeline.
              </p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-fg">{e.topic}</span>
                      <Badge
                        variant={e.signature_valid ? "success" : "warning"}
                      >
                        {e.signature_valid ? "sig ok" : "sig loose"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted">{e.process_notes}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-subtle break-all">
                      {e.resource_type}/{e.resource_id} · {e.received_at}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {orders.length > 0 ? (
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base">Mirrored orders</CardTitle>
            <CardDescription>
              Updated from order:* webhook topics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {orders.map((o) => (
                <li
                  key={String(o.id)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs"
                >
                  <span className="font-mono text-fg">{String(o.id)}</span>
                  <span className="text-muted">{String(o.last_topic ?? o.status)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <Card className="border-border bg-surface">
      <CardContent className="flex items-start gap-3 p-4">
        <CheckCircle2
          className={cn(
            "mt-0.5 size-4 shrink-0",
            ok ? "text-success" : "text-subtle",
          )}
        />
        <div className="min-w-0">
          <p className="text-xs text-muted">{label}</p>
          <p className="truncate text-sm font-medium text-fg">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
