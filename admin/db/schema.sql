-- Admin Backend production schema.
-- This database stores business/admin data only. Matrix rooms, events,
-- devices and media metadata remain owned by Synapse.

create extension if not exists pgcrypto;

create table if not exists admin_roles (
  role text primary key,
  description text not null,
  can_write boolean not null default false,
  created_at timestamptz not null default now()
);

insert into admin_roles (role, description, can_write) values
  ('owner', 'System owner with full administrative access', true),
  ('admin', 'Operations administrator', true),
  ('auditor', 'Read-only auditor', false),
  ('support', 'Support operator for limited user support', false)
on conflict (role) do nothing;

create table if not exists admin_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role text not null references admin_roles(role),
  status text not null default 'active',
  last_login_at timestamptz,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admin_accounts(id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  ip text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  actor_role text,
  module text not null,
  action text not null,
  target text,
  result text not null default 'success',
  ip text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on audit_logs(created_at desc);
create index if not exists audit_logs_actor_idx on audit_logs(actor);
create index if not exists audit_logs_module_idx on audit_logs(module);

create table if not exists app_config (
  key text primary key,
  value jsonb not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists registration_tokens (
  token text primary key,
  usage_limit integer not null default 1,
  used integer not null default 0,
  disabled boolean not null default false,
  expires_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists operation_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  status text not null default 'pending',
  target text,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operation_jobs_status_idx on operation_jobs(status);
create index if not exists operation_jobs_kind_idx on operation_jobs(kind);
