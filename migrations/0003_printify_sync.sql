-- Printify webhook sync: product mirror + sync runs audit

create table if not exists printify_products_mirror (
  id text primary key,
  shop_id text,
  title text,
  status text,
  visible boolean not null default true,
  slug text,
  price_cents int,
  external jsonb not null default '{}'::jsonb,
  last_topic text,
  payload jsonb not null,
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists printify_products_mirror_shop_idx
  on printify_products_mirror (shop_id);

create index if not exists printify_products_mirror_updated_idx
  on printify_products_mirror (updated_at desc);

create table if not exists printify_sync_runs (
  id text primary key,
  kind text not null,
  ok boolean not null default true,
  summary jsonb not null default '{}'::jsonb,
  notes text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists printify_sync_runs_started_idx
  on printify_sync_runs (started_at desc);

-- Enrich orders mirror with optional line summary
alter table printify_orders_mirror
  add column if not exists total_cents int;

alter table printify_orders_mirror
  add column if not exists line_count int;

alter table printify_orders_mirror
  add column if not exists external_id text;
