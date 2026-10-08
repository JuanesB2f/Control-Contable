-- =============================================================================
-- Access control: permission catalog, authorization helpers, RLS and grants.
-- Authorization always checks permissions, never role names.
-- =============================================================================

insert into public.role_permissions (role, permission)
select r.role::public.app_role, p.permission
from (values ('owner'), ('admin')) as r (role)
cross join (values
  ('dashboard.read'),
  ('customers.read'), ('customers.write'),
  ('products.read'), ('products.write'), ('costs.read'),
  ('inventory.read'), ('inventory.adjust'),
  ('sales.read'), ('sales.create'), ('sales.void'),
  ('finance.read'), ('finance.write'),
  ('intelligence.read'), ('reports.read'), ('social.manage'),
  ('members.read'), ('members.manage'),
  ('settings.manage'), ('audit.read')
) as p (permission);

insert into public.role_permissions (role, permission) values
  ('owner', 'organization.delete'),
  ('employee', 'dashboard.read'),
  ('employee', 'customers.read'),
  ('employee', 'customers.write'),
  ('employee', 'products.read'),
  ('employee', 'inventory.read'),
  ('employee', 'sales.read'),
  ('employee', 'sales.create'),
  ('employee', 'members.read');

-- -----------------------------------------------------------------------------
-- Authorization helpers (used by RLS policies and RPCs)
-- -----------------------------------------------------------------------------
create function private.is_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create function private.has_permission(p_organization_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.role_permissions rp on rp.role = m.role
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and rp.permission = p_permission
  );
$$;

create function private.shares_organization_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and theirs.user_id = p_user_id
  );
$$;

create function private.write_audit_log(
  p_organization_id uuid,
  p_action text,
  p_entity text,
  p_entity_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (organization_id, user_id, action, entity, entity_id, metadata)
  values (p_organization_id, (select auth.uid()), p_action, p_entity, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;

revoke execute on all functions in schema private from public;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.has_permission(uuid, text) to authenticated;
grant execute on function private.shares_organization_with(uuid) to authenticated;

-- Settings changes are audited from the database so they can't be bypassed.
create function private.audit_organization_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changes jsonb;
begin
  select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)), '{}'::jsonb)
  into v_changes
  from jsonb_each(to_jsonb(new)) as n
  join jsonb_each(to_jsonb(old)) as o using (key)
  where n.value is distinct from o.value
    and n.key <> 'updated_at';

  if v_changes <> '{}'::jsonb then
    perform private.write_audit_log(
      new.id, 'organization.updated', 'organization', new.id::text,
      jsonb_build_object('changes', v_changes)
    );
  end if;
  return new;
end;
$$;

create trigger organizations_audit_update
  after update on public.organizations
  for each row execute function private.audit_organization_update();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_logs enable row level security;

create policy "Members can view their organizations"
  on public.organizations for select to authenticated
  using (private.is_member(id));

create policy "Settings managers can update their organization"
  on public.organizations for update to authenticated
  using (private.has_permission(id, 'settings.manage'))
  with check (private.has_permission(id, 'settings.manage'));

create policy "Users can view their own and teammates profiles"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_organization_with(id));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Members can view their organization members"
  on public.organization_members for select to authenticated
  using (private.is_member(organization_id));

create policy "Member managers can view invitations"
  on public.organization_invitations for select to authenticated
  using (private.has_permission(organization_id, 'members.manage'));

create policy "Authenticated users can read the permission catalog"
  on public.role_permissions for select to authenticated
  using (true);

create policy "Auditors can view the audit log"
  on public.audit_logs for select to authenticated
  using (private.has_permission(organization_id, 'audit.read'));

-- -----------------------------------------------------------------------------
-- Table privileges (defense in depth on top of RLS)
-- Writes to memberships, invitations and the audit log only happen via RPCs.
-- -----------------------------------------------------------------------------
revoke all on
  public.organizations,
  public.profiles,
  public.organization_members,
  public.organization_invitations,
  public.role_permissions,
  public.audit_logs
from anon;

revoke insert, update, delete, truncate on
  public.organizations,
  public.profiles,
  public.organization_members,
  public.organization_invitations,
  public.role_permissions,
  public.audit_logs
from authenticated;

revoke select on public.organization_invitations from authenticated;
grant select (
  id, organization_id, email, role, invited_by, expires_at,
  accepted_at, accepted_by, revoked_at, created_at
) on public.organization_invitations to authenticated;

grant update (name, business_type, country, currency, timezone, locale)
  on public.organizations to authenticated;
grant update (full_name, avatar_url)
  on public.profiles to authenticated;
