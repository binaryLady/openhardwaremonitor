-- TTM stack schema for the OHM dashboard — HARDENED (run in the Supabase SQL
-- editor; idempotent, safe to re-run). Shares the database with other TTM
-- sites; everything here is prefixed ohm_.
--
-- Security model (no client ever gets direct table access):
--   · anon key in the browser can only call whitelisted RPCs
--   · writes go through SECURITY DEFINER functions with validation + caps
--   · visitor PII is NEVER readable with the anon key
--   · operator reads/writes (Mission Control) require the OPERATOR TOKEN —
--     a secret you set once below; the admin UI asks for it and keeps it
--     in sessionStorage only
--   · is_admin can only be granted here in the SQL editor, never from a client

create extension if not exists pgcrypto;

-- ── tables ──────────────────────────────────────────────────────────────────

create table if not exists public.ohm_visitors (
  id          bigint generated always as identity primary key,
  email       text not null unique,
  name        text not null,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  user_agent  text,
  is_admin    boolean not null default false
);
alter table public.ohm_visitors
  add column if not exists is_admin boolean not null default false;

create table if not exists public.ohm_telemetry_events (
  id          bigint generated always as identity primary key,
  event       text not null,
  props       jsonb not null default '{}'::jsonb,
  session_id  text,
  page        text,
  visitor_email text,
  ts          timestamptz not null default now()
);
create index if not exists ohm_telemetry_events_ts_idx on public.ohm_telemetry_events (ts desc);
create index if not exists ohm_telemetry_events_event_idx on public.ohm_telemetry_events (event);

create table if not exists public.ohm_site_config (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Operator secret: single row, sha-256 of the token. RLS with no policies =
-- unreadable and unwritable by any client role; only this SQL editor
-- (service role) and the SECURITY DEFINER functions below can touch it.
create table if not exists public.ohm_admin_secrets (
  id          smallint primary key default 1 check (id = 1),
  token_hash  text not null,
  updated_at  timestamptz not null default now()
);

-- ── row level security: everything locked; site_config readable ─────────────

alter table public.ohm_visitors         enable row level security;
alter table public.ohm_telemetry_events enable row level security;
alter table public.ohm_site_config      enable row level security;
alter table public.ohm_admin_secrets    enable row level security;

-- remove every demo-grade policy from earlier versions of this file
drop policy if exists "anon can insert ohm visitors"        on public.ohm_visitors;
drop policy if exists "anon can update own ohm visitor row" on public.ohm_visitors;
drop policy if exists "anon can read ohm visitors (demo)"   on public.ohm_visitors;
drop policy if exists "anon can insert ohm telemetry"       on public.ohm_telemetry_events;
drop policy if exists "anon can read ohm telemetry (demo)"  on public.ohm_telemetry_events;
drop policy if exists "anon can insert site_config (demo)"  on public.ohm_site_config;
drop policy if exists "anon can update site_config (demo)"  on public.ohm_site_config;
drop policy if exists "anon can read site_config"           on public.ohm_site_config;

-- whitelabel config is public by nature — read-only for everyone
create policy "anyone can read site_config" on public.ohm_site_config
  for select to anon, authenticated using (true);

-- ── operator token ──────────────────────────────────────────────────────────
-- SET YOUR TOKEN (run once, and again to rotate). Choose something long and
-- random, e.g. from a password manager. The admin UI will ask for this value.
--
--   insert into public.ohm_admin_secrets (id, token_hash)
--   values (1, encode(digest('PASTE-A-LONG-RANDOM-TOKEN-HERE', 'sha256'), 'hex'))
--   on conflict (id) do update
--     set token_hash = excluded.token_hash, updated_at = now();

create or replace function public.ohm_check_admin(p_token text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from ohm_admin_secrets
    where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
  );
$$;
revoke execute on function public.ohm_check_admin(text) from public, anon, authenticated;

-- ── public RPCs (the only things the anon key can do) ───────────────────────

-- Gate sign-in: validated upsert of the safe columns only. is_admin is
-- untouchable from here.
create or replace function public.ohm_gate_signin(p_name text, p_email text, p_ua text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(trim(p_name), '') = '' or length(p_name) > 120
     or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(p_email) > 254 then
    raise exception 'invalid sign-in';
  end if;
  insert into ohm_visitors (name, email, last_seen, user_agent)
  values (trim(p_name), lower(trim(p_email)), now(), left(coalesce(p_ua, ''), 250))
  on conflict (email) do update
    set name = excluded.name, last_seen = now(), user_agent = excluded.user_agent;
end;
$$;
grant execute on function public.ohm_gate_signin(text, text, text) to anon, authenticated;

-- Telemetry: batched insert with hard caps on batch size and field lengths.
create or replace function public.ohm_track(p_events jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if jsonb_typeof(p_events) is distinct from 'array'
     or jsonb_array_length(p_events) > 25 then
    raise exception 'invalid batch';
  end if;
  insert into ohm_telemetry_events (event, props, session_id, page, visitor_email)
  select left(e->>'event', 64),
         case when length(coalesce(e->'props', '{}'::jsonb)::text) <= 2000
              then coalesce(e->'props', '{}'::jsonb) else '{}'::jsonb end,
         left(e->>'session_id', 64),
         left(e->>'page', 200),
         left(e->>'visitor_email', 254)
  from jsonb_array_elements(p_events) e
  where coalesce(e->>'event', '') <> '';
end;
$$;
grant execute on function public.ohm_track(jsonb) to anon, authenticated;

-- Admin-flag probe for the client gate: boolean only, no PII exposed.
create or replace function public.ohm_is_admin(p_email text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from ohm_visitors
    where email = lower(trim(coalesce(p_email, ''))) and is_admin
  );
$$;
grant execute on function public.ohm_is_admin(text) to anon, authenticated;

-- ── operator RPCs (token-gated) ─────────────────────────────────────────────

create or replace function public.ohm_admin_stats(p_token text)
returns table (total_events bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not ohm_check_admin(p_token) then raise exception 'unauthorized'; end if;
  return query select count(*)::bigint from ohm_telemetry_events;
end;
$$;
grant execute on function public.ohm_admin_stats(text) to anon, authenticated;

create or replace function public.ohm_admin_visitors(p_token text)
returns table (name text, email text, first_seen timestamptz, last_seen timestamptz, is_admin boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not ohm_check_admin(p_token) then raise exception 'unauthorized'; end if;
  return query
    select v.name, v.email, v.first_seen, v.last_seen, v.is_admin
    from ohm_visitors v order by v.last_seen desc limit 100;
end;
$$;
grant execute on function public.ohm_admin_visitors(text) to anon, authenticated;

create or replace function public.ohm_admin_events(p_token text, p_limit int default 100)
returns table (ts timestamptz, event text, page text, session_id text, visitor_email text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not ohm_check_admin(p_token) then raise exception 'unauthorized'; end if;
  return query
    select t.ts, t.event, t.page, t.session_id, t.visitor_email
    from ohm_telemetry_events t
    order by t.ts desc limit least(greatest(coalesce(p_limit, 100), 1), 1000);
end;
$$;
grant execute on function public.ohm_admin_events(text, int) to anon, authenticated;

-- Whitelabel publish: token-gated, keys whitelisted, size-capped.
create or replace function public.ohm_publish_config(p_token text, p_config jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare k text;
begin
  if not ohm_check_admin(p_token) then raise exception 'unauthorized'; end if;
  if jsonb_typeof(p_config) is distinct from 'object' then
    raise exception 'invalid config';
  end if;
  for k in select jsonb_object_keys(p_config) loop
    if k not in ('brand', 'theme', 'gate') then
      raise exception 'unknown config key %', k;
    end if;
    if length((p_config->k)::text) > 20000 then
      raise exception 'config value too large for %', k;
    end if;
    insert into ohm_site_config (key, value) values (k, p_config->k)
    on conflict (key) do update set value = excluded.value, updated_at = now();
  end loop;
end;
$$;
grant execute on function public.ohm_publish_config(text, jsonb) to anon, authenticated;

-- ── seeds ───────────────────────────────────────────────────────────────────

insert into public.ohm_site_config (key, value) values
  ('brand', '{"tagline": "", "footer_name": "", "footer_hidden": false, "page_title": ""}'),
  ('theme', '{"default": "ttm", "tokens": {}}'),
  ('gate',  '{"enabled": true, "title": "", "body": "", "fine": ""}')
on conflict (key) do nothing;

-- Grant admin (SQL editor only — no client path can do this):
--   update public.ohm_visitors set is_admin = true where email = 'you@example.com';
