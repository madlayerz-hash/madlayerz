-- Adds Flow payment tracking columns to orders. Applied manually by the user
-- in the Supabase SQL Editor; this file documents that state in version control.

alter table orders
  add column flow_token text,
  add column flow_order_number bigint,
  add column paid_at timestamptz;

create unique index orders_flow_token_idx on orders (flow_token) where flow_token is not null;
