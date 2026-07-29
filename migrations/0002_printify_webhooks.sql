-- Printify webhook event log + local subscription mirror for LVL merch pipeline.

create table if not exists printify_webhook_events (
  id text primary key,
  topic text not null,
  resource_type text,
  resource_id text,
  shop_id text,
  payload jsonb not null,
  signature_valid boolean not null default false,
  processed boolean not null default false,
  process_notes text,
  received_at timestamptz not null default now()
);

create index if not exists printify_webhook_events_topic_idx
  on printify_webhook_events (topic);

create index if not exists printify_webhook_events_received_idx
  on printify_webhook_events (received_at desc);

create index if not exists printify_webhook_events_resource_idx
  on printify_webhook_events (resource_type, resource_id);

create table if not exists printify_webhook_subscriptions (
  id text primary key,
  shop_id text not null,
  topic text not null,
  url text not null,
  secret_set boolean not null default false,
  status text not null default 'active',
  raw jsonb,
  updated_at timestamptz not null default now(),
  unique (shop_id, topic, url)
);

create table if not exists printify_orders_mirror (
  id text primary key,
  shop_id text,
  status text,
  last_topic text,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
