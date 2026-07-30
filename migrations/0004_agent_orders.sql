-- Agent commerce: quotes, orders, payment proofs, Printify fulfillment linkage

create table if not exists agent_orders (
  id text primary key,
  external_ref text,
  status text not null default 'quoted',
  sku text not null,
  product_id text,
  printify_product_id text,
  variant_id text,
  size text,
  quantity int not null default 1,
  face_usd numeric(12, 2) not null,
  agent_fee_usd numeric(12, 2) not null default 0.50,
  shipping_estimate_usd numeric(12, 2) not null default 0,
  total_usd numeric(12, 2) not null,
  currency text not null default 'USD',
  ship_to jsonb not null default '{}'::jsonb,
  buyer_email text,
  buyer_ref text,
  rail text,
  tx_hash text,
  payment_proof jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  printify_order_id text,
  printify_status text,
  fulfill_mode text,
  fulfill_error text,
  fulfill_payload jsonb not null default '{}'::jsonb,
  quote jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_orders_status_idx on agent_orders (status);
create index if not exists agent_orders_sku_idx on agent_orders (sku);
create index if not exists agent_orders_created_idx on agent_orders (created_at desc);
create index if not exists agent_orders_tx_idx on agent_orders (tx_hash);
create index if not exists agent_orders_external_idx on agent_orders (external_ref);

create table if not exists agent_order_events (
  id text primary key,
  order_id text not null references agent_orders (id) on delete cascade,
  kind text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_order_events_order_idx
  on agent_order_events (order_id, created_at desc);
