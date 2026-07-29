import { Badge } from "@/components/ui/badge";
import type { PackStatus } from "@/lib/factory/types";

const map: Record<
  PackStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "primary" }
> = {
  draft: { label: "Draft", variant: "default" },
  processing: { label: "Processing", variant: "info" },
  ready: { label: "Ready", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  published: { label: "Published", variant: "primary" },
  rejected: { label: "Rejected", variant: "danger" },
};

export function StatusBadge({ status }: { status: PackStatus }) {
  const m = map[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
