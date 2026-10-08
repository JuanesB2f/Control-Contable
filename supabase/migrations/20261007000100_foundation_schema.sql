-- =============================================================================
-- Foundation schema: tenancy (organizations), identity (profiles), membership,
-- invitations, role catalog and audit log.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- Security definer helpers live here. This schema is NOT exposed through the
-- Data API, so its functions can't be invoked as RPC by clients.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
alter default privileges in schema private revoke execute on functions from public;

create type public.app_role as enum ('owner', 'admin', 'employee');
create type public.member_status as enum ('active', 'suspended');

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  -- Slugs are the first URL segment (/{slug}/dashboard), so app routes are reserved.
  slug text not null unique check (
    char_length(slug) between 3 and 48
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and slug not in (
      'api', 'app', 'auth', 'login', 'signup', 'logout', 'onboarding', 'invite',
      'forgot-password', 'reset-password', 'settings', 'account', 'admin', 'www',
      'static', 'public', 'assets', 'help', 'support', 'billing', 'monitoring'
    )
  ),
  business_type text check (business_type is null or char_length(business_type) <= 60),
  country text not null default 'CO' check (country ~ '^[A-Z]{2}$'),
  currency text not null default 'COP' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'America/Bogota',
  locale text not null default 'es-CO' check (locale ~ '^[a-z]{2}-[A-Z]{2}$'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organizations_created_by_idx on public.organizations (created_by);

create function private.validate_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names tz where tz.name = new.timezone) then
    raise exception 'Invalid timezone: %', new.timezone
      using errcode = '22023', hint = 'invalid_timezone';
  end if;
  return new;
end;
$$;

create trigger organizations_validate
  before insert or update of timezone on public.organizations
  for each row execute function private.validate_organization();

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- profiles (1:1 with auth.users, readable by teammates)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (full_name is null or char_length(full_name) <= 120),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create function private.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, email, full_name)
    values (
      new.id,
      lower(new.email),
      nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), '')
    );
  elsif new.email is distinct from old.email then
    update public.profiles set email = lower(new.email) where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.sync_profile_from_auth_user();

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function private.sync_profile_from_auth_user();

-- -----------------------------------------------------------------------------
-- organization_members
-- -----------------------------------------------------------------------------
create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  status public.member_status not null default 'active',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);
create unique index organization_members_single_owner_idx
  on public.organization_members (organization_id) where role = 'owner';

create trigger organization_members_set_updated_at
  before update on public.organization_members
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- organization_invitations (only a SHA-256 hash of the token is stored)
-- -----------------------------------------------------------------------------
create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) <= 254),
  role public.app_role not null check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index organization_invitations_org_created_idx
  on public.organization_invitations (organization_id, created_at desc);
create unique index organization_invitations_pending_email_idx
  on public.organization_invitations (organization_id, email)
  where accepted_at is null and revoked_at is null;

-- -----------------------------------------------------------------------------
-- role_permissions (global catalog: a role is a set of permissions)
-- -----------------------------------------------------------------------------
create table public.role_permissions (
  role public.app_role not null,
  permission text not null check (permission ~ '^[a-z_]+\.[a-z_]+$'),
  primary key (role, permission)
);

-- -----------------------------------------------------------------------------
-- audit_logs (append-only)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_user_id_idx on public.audit_logs (user_id);
