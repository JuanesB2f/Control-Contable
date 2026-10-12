-- =============================================================================
-- Owners and admins can create a ready-to-use account for a teammate (email +
-- password) instead of sending an invitation. The account is confirmed and
-- joins the organization right away. Existing accounts are never touched: they
-- must be invited so their owner accepts.
-- =============================================================================

create function public.create_member_account(
  p_organization_id uuid,
  p_email text,
  p_password text,
  p_full_name text,
  p_role public.app_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_full_name text := nullif(left(btrim(coalesce(p_full_name, '')), 120), '');
  v_user_id uuid;
begin
  if not private.has_permission(p_organization_id, 'members.manage') then
    raise exception 'Permission denied' using errcode = '42501';
  end if;

  if p_role = 'owner' then
    raise exception 'Owners cannot be created' using errcode = 'P0001', hint = 'invalid_role';
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'Invalid email' using errcode = 'P0001', hint = 'invalid_email';
  end if;

  if v_full_name is null or char_length(v_full_name) < 2 then
    raise exception 'Name required' using errcode = 'P0001', hint = 'invalid_name';
  end if;

  if p_password is null
    or char_length(p_password) < 8
    or octet_length(p_password) > 72
    or p_password !~ '[A-Za-z]'
    or p_password !~ '[0-9]' then
    raise exception 'Weak password' using errcode = 'P0001', hint = 'weak_password';
  end if;

  if (
    select count(*)
    from public.audit_logs a
    where a.organization_id = p_organization_id
      and a.action = 'member.account_created'
      and a.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Too many accounts' using errcode = 'P0001', hint = 'accounts_rate_limited';
  end if;

  select u.id into v_user_id from auth.users u where lower(u.email) = v_email;
  if found then
    if exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id and m.user_id = v_user_id
    ) then
      raise exception 'Already a member' using errcode = 'P0001', hint = 'already_member';
    end if;
    raise exception 'Email already registered' using errcode = 'P0001', hint = 'email_taken';
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb, jsonb_build_object('full_name', v_full_name), now(), now(),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    now(), now(), now()
  );

  insert into public.organization_members (organization_id, user_id, role, invited_by)
  values (p_organization_id, v_user_id, p_role, (select auth.uid()));

  perform private.write_audit_log(
    p_organization_id, 'member.account_created', 'member', v_user_id::text,
    jsonb_build_object('email', v_email, 'role', p_role, 'full_name', v_full_name)
  );

  return v_user_id;
end;
$$;

revoke execute on function public.create_member_account(uuid, text, text, text, public.app_role) from public, anon;
grant execute on function public.create_member_account(uuid, text, text, text, public.app_role) to authenticated;
