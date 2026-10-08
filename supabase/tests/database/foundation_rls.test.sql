begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.com', '{"full_name":"Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'beto@example.com', '{"full_name":"Beto"}'),
  ('00000000-0000-0000-0000-00000000000c', 'carla@example.com', '{}');

create temporary table fixtures (key text primary key, value text);
grant all on fixtures to authenticated;

-- Ana (owner) creates her organization
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
insert into fixtures select 'org_a', id::text from public.create_organization('Tienda Ana', 'tienda-ana');
insert into fixtures select 'invite_b', token from public.create_invitation(
  (select value::uuid from fixtures where key = 'org_a'), 'beto@example.com', 'employee');

select is((select count(*) from public.organizations)::int, 1, 'owner sees her organization');
select is(
  (select count(*) from public.audit_logs where action = 'organization.created')::int, 1,
  'organization creation is audited');
select throws_ok(
  $$ select public.create_organization('Copia', 'tienda-ana') $$, '23505', null,
  'duplicate slugs are rejected');
select throws_ok(
  $$ select public.create_organization('Login', 'login') $$, '23514', null,
  'reserved slugs are rejected');
select throws_ok(
  $$ select token_hash from public.organization_invitations $$, '42501', null,
  'invitation token hashes are never readable');
select throws_ok(
  $$ insert into public.audit_logs (organization_id, action, entity)
     select value::uuid, 'fake.entry', 'x' from fixtures where key = 'org_a' $$,
  '42501', null, 'audit log cannot be written directly');

-- Carla (outsider) creates her own organization and must not see Ana's data
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
select lives_ok($$ select public.create_organization('Negocio Carla', 'negocio-carla') $$, 'outsider creates own organization');
select is((select count(*) from public.organizations)::int, 1, 'outsider only sees her own organization');
select is(
  (select count(*) from public.organization_members where organization_id = (select value::uuid from fixtures where key = 'org_a'))::int,
  0, 'outsider cannot see members of another organization');
select is_empty(
  $$ update public.organizations set name = 'Hacked'
     where id = (select value::uuid from fixtures where key = 'org_a') returning id $$,
  'outsider cannot update another organization');
select throws_ok(
  $$ select public.create_invitation((select value::uuid from fixtures where key = 'org_a'), 'x@example.com', 'admin') $$,
  '42501', null, 'outsider cannot invite into another organization');
select throws_ok(
  $$ select public.accept_invitation((select value from fixtures where key = 'invite_b')) $$,
  'P0001', 'Invitation belongs to another email', 'invitations are bound to the invited email');

-- Beto accepts his invitation and joins as employee
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
select is(
  public.accept_invitation((select value from fixtures where key = 'invite_b')), 'tienda-ana',
  'invited user accepts and gets the organization slug');
select throws_ok(
  $$ select public.accept_invitation((select value from fixtures where key = 'invite_b')) $$,
  'P0001', 'Invitation already used', 'invitations are single use');
select is((select count(*) from public.organizations)::int, 1, 'employee sees the organization he joined');
select is(
  (select count(*) from public.audit_logs)::int, 0, 'employee cannot read the audit log');
select is(
  (select count(*) from public.organization_invitations)::int, 0, 'employee cannot list invitations');
select is_empty(
  $$ update public.organizations set name = 'Hack'
     where id = (select value::uuid from fixtures where key = 'org_a') returning id $$,
  'employee cannot change organization settings');
select throws_ok(
  $$ select public.update_member_role((select value::uuid from fixtures where key = 'org_a'),
       '00000000-0000-0000-0000-00000000000a', 'admin') $$,
  '42501', null, 'employee cannot change roles');

-- Ana promotes Beto; Beto (admin) still cannot touch the owner
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
select lives_ok(
  $$ select public.update_member_role((select value::uuid from fixtures where key = 'org_a'),
       '00000000-0000-0000-0000-00000000000b', 'admin') $$,
  'owner promotes a member to admin');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
select throws_ok(
  $$ select public.update_member_role((select value::uuid from fixtures where key = 'org_a'),
       '00000000-0000-0000-0000-00000000000a', 'employee') $$,
  'P0001', 'The owner role cannot be changed', 'admins cannot demote the owner');
select throws_ok(
  $$ select public.remove_member((select value::uuid from fixtures where key = 'org_a'),
       '00000000-0000-0000-0000-00000000000a') $$,
  'P0001', 'The owner cannot be removed', 'admins cannot remove the owner');

-- Ana removes Beto, who immediately loses access
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
select lives_ok(
  $$ select public.remove_member((select value::uuid from fixtures where key = 'org_a'),
       '00000000-0000-0000-0000-00000000000b') $$,
  'owner removes a member');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
select is((select count(*) from public.organizations)::int, 0, 'removed member loses access immediately');

select * from finish();
rollback;
