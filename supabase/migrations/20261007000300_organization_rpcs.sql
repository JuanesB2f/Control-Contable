-- =============================================================================
-- Transactional operations on organizations and memberships.
-- Business errors use errcode P0001 plus a stable HINT the app maps to messages.
-- =============================================================================

create function public.create_organization(
  p_name text,
  p_slug text,
  p_business_type text default null,
  p_country text default 'CO',
  p_currency text default 'COP',
  p_timezone text default 'America/Bogota'
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_organization public.organizations;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if (select count(*) from public.organizations o where o.created_by = v_user_id) >= 10 then
    raise exception 'Organization limit reached' using errcode = 'P0001', hint = 'organization_limit';
  end if;

  insert into public.organizations (name, slug, business_type, country, currency, timezone, created_by)
  values (
    btrim(p_name),
    lower(btrim(p_slug)),
    nullif(btrim(p_business_type), ''),
    upper(p_country),
    upper(p_currency),
    p_timezone,
    v_user_id
  )
  returning * into v_organization;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization.id, v_user_id, 'owner');

  perform private.write_audit_log(
    v_organization.id, 'organization.created', 'organization', v_organization.id::text,
    jsonb_build_object('name', v_organization.name, 'slug', v_organization.slug)
  );

  return v_organization;
end;
$$;

create function public.create_invitation(
  p_organization_id uuid,
  p_email text,
  p_role public.app_role
)
returns table (invitation_id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_invitation_id uuid;
begin
  if not private.has_permission(p_organization_id, 'members.manage') then
    raise exception 'Permission denied' using errcode = '42501';
  end if;

  if p_role = 'owner' then
    raise exception 'Owners cannot be invited' using errcode = 'P0001', hint = 'invalid_role';
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid email' using errcode = 'P0001', hint = 'invalid_email';
  end if;

  if exists (
    select 1
    from public.organization_members m
    join public.profiles p on p.id = m.user_id
    where m.organization_id = p_organization_id and p.email = v_email
  ) then
    raise exception 'Already a member' using errcode = 'P0001', hint = 'already_member';
  end if;

  if (
    select count(*)
    from public.organization_invitations i
    where i.organization_id = p_organization_id
      and i.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Too many invitations' using errcode = 'P0001', hint = 'rate_limited';
  end if;

  update public.organization_invitations i
  set revoked_at = now()
  where i.organization_id = p_organization_id
    and i.email = v_email
    and i.accepted_at is null
    and i.revoked_at is null;

  insert into public.organization_invitations (organization_id, email, role, token_hash, invited_by)
  values (
    p_organization_id,
    v_email,
    p_role,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    (select auth.uid())
  )
  returning id into v_invitation_id;

  perform private.write_audit_log(
    p_organization_id, 'member.invited', 'invitation', v_invitation_id::text,
    jsonb_build_object('email', v_email, 'role', p_role)
  );

  return query select v_invitation_id, v_token;
end;
$$;

create function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.organization_invitations;
begin
  select * into v_invitation
  from public.organization_invitations i
  where i.id = p_invitation_id
  for update;

  if not found or not private.has_permission(v_invitation.organization_id, 'members.manage') then
    raise exception 'Invitation not found' using errcode = 'P0001', hint = 'invitation_not_found';
  end if;

  if v_invitation.accepted_at is not null or v_invitation.revoked_at is not null then
    return;
  end if;

  update public.organization_invitations set revoked_at = now() where id = p_invitation_id;

  perform private.write_audit_log(
    v_invitation.organization_id, 'member.invitation_revoked', 'invitation', p_invitation_id::text,
    jsonb_build_object('email', v_invitation.email)
  );
end;
$$;

create function public.get_invitation(p_token text)
returns table (
  organization_name text,
  email text,
  role public.app_role,
  inviter_name text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.name,
    i.email,
    i.role,
    coalesce(p.full_name, p.email),
    case
      when i.revoked_at is not null then 'revoked'
      when i.accepted_at is not null then 'accepted'
      when i.expires_at < now() then 'expired'
      else 'pending'
    end
  from public.organization_invitations i
  join public.organizations o on o.id = i.organization_id
  left join public.profiles p on p.id = i.invited_by
  where (select auth.uid()) is not null
    and i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

create function public.accept_invitation(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_user_email text;
  v_invitation public.organization_invitations;
  v_slug text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select lower(u.email) into v_user_email from auth.users u where u.id = v_user_id;

  select * into v_invitation
  from public.organization_invitations i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found or v_invitation.revoked_at is not null then
    raise exception 'Invitation not found' using errcode = 'P0001', hint = 'invitation_not_found';
  end if;
  if v_invitation.accepted_at is not null then
    raise exception 'Invitation already used' using errcode = 'P0001', hint = 'invitation_used';
  end if;
  if v_invitation.expires_at < now() then
    raise exception 'Invitation expired' using errcode = 'P0001', hint = 'invitation_expired';
  end if;
  if v_invitation.email is distinct from v_user_email then
    raise exception 'Invitation belongs to another email' using errcode = 'P0001', hint = 'invitation_email_mismatch';
  end if;

  insert into public.organization_members (organization_id, user_id, role, invited_by)
  values (v_invitation.organization_id, v_user_id, v_invitation.role, v_invitation.invited_by)
  on conflict (organization_id, user_id) do nothing;

  update public.organization_invitations
  set accepted_at = now(), accepted_by = v_user_id
  where id = v_invitation.id;

  perform private.write_audit_log(
    v_invitation.organization_id, 'member.joined', 'member', v_user_id::text,
    jsonb_build_object('role', v_invitation.role, 'invitation_id', v_invitation.id)
  );

  select o.slug into v_slug from public.organizations o where o.id = v_invitation.organization_id;
  return v_slug;
end;
$$;

create function public.update_member_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_role public.app_role;
begin
  if not private.has_permission(p_organization_id, 'members.manage') then
    raise exception 'Permission denied' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'Ownership cannot be assigned here' using errcode = 'P0001', hint = 'invalid_role';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'Cannot change your own role' using errcode = 'P0001', hint = 'cannot_change_self';
  end if;

  select m.role into v_current_role
  from public.organization_members m
  where m.organization_id = p_organization_id and m.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Member not found' using errcode = 'P0001', hint = 'member_not_found';
  end if;
  if v_current_role = 'owner' then
    raise exception 'The owner role cannot be changed' using errcode = 'P0001', hint = 'cannot_change_owner';
  end if;
  if v_current_role = p_role then
    return;
  end if;

  update public.organization_members
  set role = p_role
  where organization_id = p_organization_id and user_id = p_user_id;

  perform private.write_audit_log(
    p_organization_id, 'member.role_changed', 'member', p_user_id::text,
    jsonb_build_object('from', v_current_role, 'to', p_role)
  );
end;
$$;

create function public.remove_member(p_organization_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.organization_members;
begin
  if not private.has_permission(p_organization_id, 'members.manage') then
    raise exception 'Permission denied' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'Cannot remove yourself' using errcode = 'P0001', hint = 'cannot_change_self';
  end if;

  select * into v_member
  from public.organization_members m
  where m.organization_id = p_organization_id and m.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Member not found' using errcode = 'P0001', hint = 'member_not_found';
  end if;
  if v_member.role = 'owner' then
    raise exception 'The owner cannot be removed' using errcode = 'P0001', hint = 'cannot_change_owner';
  end if;

  delete from public.organization_members
  where organization_id = p_organization_id and user_id = p_user_id;

  perform private.write_audit_log(
    p_organization_id, 'member.removed', 'member', p_user_id::text,
    jsonb_build_object('role', v_member.role)
  );
end;
$$;

-- Only signed-in users may call these RPCs.
revoke execute on function public.create_organization(text, text, text, text, text, text) from public, anon;
revoke execute on function public.create_invitation(uuid, text, public.app_role) from public, anon;
revoke execute on function public.revoke_invitation(uuid) from public, anon;
revoke execute on function public.get_invitation(text) from public, anon;
revoke execute on function public.accept_invitation(text) from public, anon;
revoke execute on function public.update_member_role(uuid, uuid, public.app_role) from public, anon;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;

grant execute on function public.create_organization(text, text, text, text, text, text) to authenticated;
grant execute on function public.create_invitation(uuid, text, public.app_role) to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.get_invitation(text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.update_member_role(uuid, uuid, public.app_role) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
