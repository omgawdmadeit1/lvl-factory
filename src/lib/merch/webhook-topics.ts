/** Printify webhook topics (API v1) */
export const PRINTIFY_WEBHOOK_TOPICS = [
  "shop:disconnected",
  "product:deleted",
  "product:created",
  "product:updated",
  "product:publish:started",
  "order:created",
  "order:updated",
  "order:sent-to-production",
  "order:shipment:created",
  "order:shipment:delivered",
] as const;

export type PrintifyWebhookTopic = (typeof PRINTIFY_WEBHOOK_TOPICS)[number];

export function isPrintifyTopic(v: string): v is PrintifyWebhookTopic {
  return (PRINTIFY_WEBHOOK_TOPICS as readonly string[]).includes(v);
}

export interface PrintifyWebhookPayload {
  id?: string;
  type?: string;
  created_at?: string;
  resource?: {
    id?: string | number;
    type?: string;
    data?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export interface StoredWebhookEvent {
  id: string;
  topic: string;
  resource_type: string | null;
  resource_id: string | null;
  shop_id: string | null;
  payload: PrintifyWebhookPayload;
  signature_valid: boolean;
  processed: boolean;
  process_notes: string | null;
  received_at: string;
}

export const WEBHOOK_RECEIVE_PATH = "/api/printify/webhooks" as const;
