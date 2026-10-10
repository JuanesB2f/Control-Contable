-- =============================================================================
-- Sale payments (abonos)
--
-- A sale can be paid in several installments. Every payment is an append-only
-- row with its date, method, bank (for transfers) and an optional receipt photo,
-- so each sale keeps a dated trail of how it was paid. `sales.paid_total` caches
-- the sum and only changes inside the functions below.
--
-- Unpaid balances must belong to a customer, so walk-in sales are paid in full.
-- Receipts live in the private `payment-receipts` bucket under
-- `{organization_id}/{sale_id}/{random}.{ext}` and can't be replaced or deleted.
-- =============================================================================

alter table public.sales
  add column paid_total numeric(14, 2) not null default 0 check (paid_total >= 0);

update public.sales set paid_total = total;

alter table public.sales
  add constraint sales_paid_total_within_total check (paid_total <= total);

grant select (paid_total) on public.sales to authenticated;

create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  method public.payment_method not null,
  bank text check (bank is null or char_length(bank) between 2 and 60),
  reference text check (reference is null or char_length(reference) <= 60),
  note text check (note is null or char_length(note) <= 200),
  receipt_path text check (receipt_path is null or char_length(receipt_path) <= 300),
  paid_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint sale_payments_bank_only_for_transfers check (method = 'transfer' or bank is null)
);

create index sale_payments_sale_idx on public.sale_payments (sale_id, paid_at);
create index sale_payments_org_paid_at_idx on public.sale_payments (organization_id, paid_at desc);

alter table public.sale_payments enable row level security;

create policy "Sales readers can view payments"
  on public.sale_payments for select to authenticated
  using (private.has_permission(organization_id, 'sales.read'));

revoke all on public.sale_payments from anon, authenticated;
grant select on public.sale_payments to authenticated;

-- Sales recorded before installments existed were paid in full when they were made.
insert into public.sale_payments (organization_id, sale_id, amount, method, paid_at, created_by, created_at)
select s.organization_id, s.id, s.total, s.payment_method, s.sold_at, s.created_by, s.created_at
from public.sales s
where s.total > 0;

-- -----------------------------------------------------------------------------
-- Receipt storage
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- True when `p_path` sits in the folder of a sale where the current user holds `p_permission`.
create function private.can_access_payment_receipt(p_path text, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sales s
    where s.organization_id::text = (storage.foldername(p_path))[1]
      and s.id::text = (storage.foldername(p_path))[2]
      and private.has_permission(s.organization_id, p_permission)
  );
$$;

revoke execute on function private.can_access_payment_receipt(text, text) from public, anon;
grant execute on function private.can_access_payment_receipt(text, text) to authenticated;

create policy "Sales readers can view payment receipts"
  on storage.objects for select to authenticated
  using (bucket_id = 'payment-receipts' and private.can_access_payment_receipt(name, 'sales.read'));

create policy "Sellers can upload payment receipts"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-receipts' and private.can_access_payment_receipt(name, 'sales.create'));

-- -----------------------------------------------------------------------------
-- create_sale: the amount paid now may be less than the total (or zero).
-- -----------------------------------------------------------------------------
drop function public.create_sale(uuid, public.payment_method, numeric, jsonb, uuid, text);

create function public.create_sale(
  p_organization_id uuid,
  p_payment_method public.payment_method,
  p_discount numeric,
  p_items jsonb,
  p_customer_id uuid default null,
  p_notes text default null,
  p_paid_amount numeric default null,
  p_bank text default null,
  p_reference text default null
)
returns table (sale_id uuid, sale_number integer, payment_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_sale_id uuid;
  v_number integer;
  v_item record;
  v_product public.products;
  v_subtotal numeric(14, 2) := 0;
  v_cost numeric(14, 2) := 0;
  v_discount numeric(14, 2) := coalesce(p_discount, 0);
  v_total numeric(14, 2);
  v_paid numeric(14, 2);
  v_bank text := nullif(btrim(p_bank), '');
  v_payment_id uuid;
begin
  perform private.assert_permission(p_organization_id, 'sales.create');

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Empty sale' using errcode = 'P0001', hint = 'empty_sale';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'Too many items' using errcode = 'P0001', hint = 'invalid_sale_item';
  end if;

  if p_customer_id is not null and not exists (
    select 1 from public.customers c where c.id = p_customer_id and c.organization_id = p_organization_id
  ) then
    raise exception 'Customer not found' using errcode = 'P0001', hint = 'customer_not_found';
  end if;

  -- Serializes numbering per organization so receipts are consecutive.
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 0));
  select coalesce(max(s.number), 0) + 1 into v_number from public.sales s where s.organization_id = p_organization_id;

  insert into public.sales (organization_id, number, customer_id, payment_method, notes, created_by)
  values (p_organization_id, v_number, p_customer_id, p_payment_method, nullif(btrim(p_notes), ''), v_user_id)
  returning id into v_sale_id;

  -- Locking products in id order avoids deadlocks between concurrent sales.
  for v_item in
    select
      (e ->> 'product_id')::uuid as product_id,
      (e ->> 'quantity')::integer as quantity,
      (e ->> 'unit_price')::numeric(14, 2) as unit_price
    from jsonb_array_elements(p_items) as e
    order by 1
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0
      or v_item.unit_price is null or v_item.unit_price < 0 then
      raise exception 'Invalid item' using errcode = 'P0001', hint = 'invalid_sale_item';
    end if;

    select * into v_product
    from public.products p
    where p.id = v_item.product_id and p.organization_id = p_organization_id
    for update;

    if not found or not v_product.is_active then
      raise exception 'Product not found' using errcode = 'P0001', hint = 'product_not_found';
    end if;
    if v_product.stock < v_item.quantity then
      raise exception 'Insufficient stock' using errcode = 'P0001', hint = 'insufficient_stock', detail = v_product.name;
    end if;

    update public.products set stock = stock - v_item.quantity where id = v_product.id;

    insert into public.sale_items (sale_id, organization_id, product_id, product_name, quantity, unit_price, unit_cost, line_total)
    values (
      v_sale_id, p_organization_id, v_product.id, v_product.name, v_item.quantity,
      v_item.unit_price, v_product.cost_price, v_item.quantity * v_item.unit_price
    );

    insert into public.inventory_movements (organization_id, product_id, type, quantity, unit_cost, stock_after, sale_id, created_by)
    values (
      p_organization_id, v_product.id, 'sale', -v_item.quantity, v_product.cost_price,
      v_product.stock - v_item.quantity, v_sale_id, v_user_id
    );

    v_subtotal := v_subtotal + v_item.quantity * v_item.unit_price;
    v_cost := v_cost + v_item.quantity * v_product.cost_price;
  end loop;

  if v_discount < 0 or v_discount > v_subtotal then
    raise exception 'Invalid discount' using errcode = 'P0001', hint = 'invalid_discount';
  end if;

  v_total := v_subtotal - v_discount;
  v_paid := round(coalesce(p_paid_amount, v_total), 2);

  if v_paid < 0 or v_paid > v_total then
    raise exception 'Invalid payment' using errcode = 'P0001', hint = 'invalid_payment';
  end if;
  if v_paid < v_total and p_customer_id is null then
    raise exception 'Credit needs a customer' using errcode = 'P0001', hint = 'credit_requires_customer';
  end if;
  if v_paid > 0 and p_payment_method = 'transfer' and v_bank is null then
    raise exception 'Bank required' using errcode = 'P0001', hint = 'bank_required';
  end if;

  update public.sales
  set subtotal = v_subtotal, discount = v_discount, total = v_total, cost_total = v_cost, paid_total = v_paid
  where id = v_sale_id;

  if v_paid > 0 then
    insert into public.sale_payments (organization_id, sale_id, amount, method, bank, reference, created_by)
    values (
      p_organization_id, v_sale_id, v_paid, p_payment_method,
      case when p_payment_method = 'transfer' then v_bank end,
      nullif(btrim(p_reference), ''), v_user_id
    )
    returning id into v_payment_id;
  end if;

  if v_paid < v_total then
    perform private.write_audit_log(
      p_organization_id, 'sale.credit_opened', 'sale', v_sale_id::text,
      jsonb_build_object('number', v_number, 'total', v_total, 'paid', v_paid)
    );
  end if;

  return query select v_sale_id, v_number, v_payment_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Installments
-- -----------------------------------------------------------------------------
create function public.add_sale_payment(
  p_sale_id uuid,
  p_amount numeric,
  p_method public.payment_method,
  p_bank text default null,
  p_reference text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.sales;
  v_amount numeric(14, 2) := round(coalesce(p_amount, 0), 2);
  v_bank text := nullif(btrim(p_bank), '');
  v_balance numeric(14, 2);
  v_payment_id uuid;
begin
  select * into v_sale from public.sales s where s.id = p_sale_id for update;

  if not found or not private.has_permission(v_sale.organization_id, 'sales.create') then
    raise exception 'Sale not found' using errcode = 'P0001', hint = 'sale_not_found';
  end if;
  if v_sale.status = 'voided' then
    raise exception 'Sale voided' using errcode = 'P0001', hint = 'sale_voided';
  end if;

  v_balance := v_sale.total - v_sale.paid_total;
  if v_amount <= 0 then
    raise exception 'Invalid payment' using errcode = 'P0001', hint = 'invalid_payment';
  end if;
  if v_amount > v_balance then
    raise exception 'Payment exceeds balance' using errcode = 'P0001', hint = 'payment_exceeds_balance';
  end if;
  if p_method = 'transfer' and v_bank is null then
    raise exception 'Bank required' using errcode = 'P0001', hint = 'bank_required';
  end if;

  insert into public.sale_payments (organization_id, sale_id, amount, method, bank, reference, note, created_by)
  values (
    v_sale.organization_id, p_sale_id, v_amount, p_method,
    case when p_method = 'transfer' then v_bank end,
    nullif(btrim(p_reference), ''), nullif(btrim(p_note), ''), (select auth.uid())
  )
  returning id into v_payment_id;

  update public.sales set paid_total = paid_total + v_amount where id = p_sale_id;

  perform private.write_audit_log(
    v_sale.organization_id, 'sale.payment_added', 'sale', p_sale_id::text,
    jsonb_build_object('number', v_sale.number, 'amount', v_amount, 'method', p_method, 'balance', v_balance - v_amount)
  );

  return v_payment_id;
end;
$$;

-- A receipt can be attached once; afterwards it is part of the record.
create function public.set_payment_receipt(p_payment_id uuid, p_receipt_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.sale_payments;
  v_number integer;
  v_path text := nullif(btrim(p_receipt_path), '');
begin
  select * into v_payment from public.sale_payments sp where sp.id = p_payment_id for update;

  if not found or not private.has_permission(v_payment.organization_id, 'sales.create') then
    raise exception 'Payment not found' using errcode = 'P0001', hint = 'payment_not_found';
  end if;
  if v_payment.receipt_path is not null then
    raise exception 'Receipt already attached' using errcode = 'P0001', hint = 'receipt_exists';
  end if;
  if v_path is null
    or v_path not like v_payment.organization_id::text || '/' || v_payment.sale_id::text || '/%' then
    raise exception 'Invalid receipt path' using errcode = 'P0001', hint = 'invalid_receipt';
  end if;

  update public.sale_payments set receipt_path = v_path where id = p_payment_id;

  select s.number into v_number from public.sales s where s.id = v_payment.sale_id;
  perform private.write_audit_log(
    v_payment.organization_id, 'sale.receipt_attached', 'sale', v_payment.sale_id::text,
    jsonb_build_object('number', v_number, 'amount', v_payment.amount)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Read models
-- -----------------------------------------------------------------------------
drop function public.list_sales(uuid, timestamptz, timestamptz, integer);

-- With p_pending_only the date range is ignored and every completed sale with a balance is returned.
create function public.list_sales(
  p_organization_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 500,
  p_pending_only boolean default false
)
returns table (
  id uuid,
  number integer,
  status public.sale_status,
  payment_method public.payment_method,
  customer_id uuid,
  customer_name text,
  seller_name text,
  subtotal numeric,
  discount numeric,
  total numeric,
  paid_total numeric,
  profit numeric,
  notes text,
  sold_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  items jsonb,
  payments jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with access as (
    select
      private.has_permission(p_organization_id, 'sales.read') as can_read,
      private.has_permission(p_organization_id, 'costs.read') as can_see_costs
  )
  select
    s.id, s.number, s.status, s.payment_method, s.customer_id, c.name,
    coalesce(p.full_name, p.email),
    s.subtotal, s.discount, s.total, s.paid_total,
    case when a.can_see_costs then s.total - s.cost_total end,
    s.notes, s.sold_at, s.voided_at, s.void_reason,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'product_id', si.product_id,
          'name', si.product_name,
          'quantity', si.quantity,
          'unit_price', si.unit_price,
          'line_total', si.line_total,
          'unit_cost', case when a.can_see_costs then si.unit_cost end
        )
        order by si.id
      )
      from public.sale_items si
      where si.sale_id = s.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', sp.id,
          'amount', sp.amount,
          'method', sp.method,
          'bank', sp.bank,
          'reference', sp.reference,
          'note', sp.note,
          'receipt_path', sp.receipt_path,
          'paid_at', sp.paid_at,
          'received_by', coalesce(rp.full_name, rp.email)
        )
        order by sp.paid_at, sp.created_at
      )
      from public.sale_payments sp
      left join public.profiles rp on rp.id = sp.created_by
      where sp.sale_id = s.id
    ), '[]'::jsonb)
  from public.sales s
  cross join access a
  left join public.customers c on c.id = s.customer_id
  left join public.profiles p on p.id = s.created_by
  where a.can_read
    and s.organization_id = p_organization_id
    and case
      when coalesce(p_pending_only, false) then s.status = 'completed' and s.paid_total < s.total
      else s.sold_at >= p_from and s.sold_at < p_to
    end
  order by s.sold_at desc
  limit least(greatest(coalesce(p_limit, 500), 1), 1000);
$$;

drop function public.list_customers(uuid);

create function public.list_customers(p_organization_id uuid)
returns table (
  id uuid,
  name text,
  phone text,
  email text,
  document text,
  notes text,
  created_at timestamptz,
  orders integer,
  total_spent numeric,
  first_purchase_at timestamptz,
  last_purchase_at timestamptz,
  favorite_product text,
  balance_due numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with access as (
    select
      private.has_permission(p_organization_id, 'customers.read') as can_read,
      private.has_permission(p_organization_id, 'sales.read') as can_read_sales
  ),
  stats as (
    select
      s.customer_id,
      count(*)::integer as orders,
      sum(s.total) as total_spent,
      min(s.sold_at) as first_purchase_at,
      max(s.sold_at) as last_purchase_at,
      sum(s.total - s.paid_total) as balance_due
    from public.sales s
    cross join access a
    where a.can_read_sales
      and s.organization_id = p_organization_id
      and s.status = 'completed'
      and s.customer_id is not null
    group by s.customer_id
  ),
  favorites as (
    select distinct on (ranked.customer_id) ranked.customer_id, ranked.product_name
    from (
      select s.customer_id, si.product_name, sum(si.quantity) as units
      from public.sale_items si
      join public.sales s on s.id = si.sale_id
      cross join access a
      where a.can_read_sales
        and s.organization_id = p_organization_id
        and s.status = 'completed'
        and s.customer_id is not null
      group by s.customer_id, si.product_name
    ) as ranked
    order by ranked.customer_id, ranked.units desc, ranked.product_name
  )
  select
    c.id, c.name, c.phone, c.email, c.document, c.notes, c.created_at,
    coalesce(st.orders, 0), coalesce(st.total_spent, 0), st.first_purchase_at, st.last_purchase_at,
    f.product_name,
    coalesce(st.balance_due, 0)
  from public.customers c
  cross join access a
  left join stats st on st.customer_id = c.id
  left join favorites f on f.customer_id = c.id
  where a.can_read and c.organization_id = p_organization_id
  order by coalesce(st.total_spent, 0) desc, c.name;
$$;

-- Payment mix now reflects the money actually received in the period, installments included.
create or replace function public.get_sales_analytics(
  p_organization_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_bucket text default 'day'
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with access as (
    select
      private.has_permission(p_organization_id, 'sales.read') as can_read,
      private.has_permission(p_organization_id, 'costs.read') as can_see_costs,
      (select o.timezone from public.organizations o where o.id = p_organization_id) as tz,
      case when p_bucket = 'month' then 'month' else 'day' end as bucket
  ),
  period_sales as (
    select s.*
    from public.sales s
    cross join access a
    where a.can_read
      and s.organization_id = p_organization_id
      and s.status = 'completed'
      and s.sold_at >= p_from
      and s.sold_at < p_to
  ),
  previous_sales as (
    select s.total, s.cost_total
    from public.sales s
    cross join access a
    where a.can_read
      and s.organization_id = p_organization_id
      and s.status = 'completed'
      and s.sold_at >= p_from - (p_to - p_from)
      and s.sold_at < p_from
  ),
  period_items as (
    select si.*
    from public.sale_items si
    join period_sales ps on ps.id = si.sale_id
  ),
  period_payments as (
    select sp.method, sp.amount
    from public.sale_payments sp
    join public.sales s on s.id = sp.sale_id
    cross join access a
    where a.can_read
      and sp.organization_id = p_organization_id
      and s.status = 'completed'
      and sp.paid_at >= p_from
      and sp.paid_at < p_to
  )
  select jsonb_build_object(
    'can_see_costs', a.can_see_costs,
    'summary', (
      select jsonb_build_object(
        'revenue', coalesce(sum(ps.total), 0),
        'sales_count', count(*),
        'discounts', coalesce(sum(ps.discount), 0),
        'customers', count(distinct ps.customer_id),
        'cost', case when a.can_see_costs then coalesce(sum(ps.cost_total), 0) end,
        'profit', case when a.can_see_costs then coalesce(sum(ps.total - ps.cost_total), 0) end,
        'units', (select coalesce(sum(pi.quantity), 0) from period_items pi)
      )
      from period_sales ps
    ),
    'previous', (
      select jsonb_build_object(
        'revenue', coalesce(sum(pv.total), 0),
        'sales_count', count(*),
        'profit', case when a.can_see_costs then coalesce(sum(pv.total - pv.cost_total), 0) end
      )
      from previous_sales pv
    ),
    'series', (
      select coalesce(jsonb_agg(row_to_json(d) order by d.key), '[]'::jsonb)
      from (
        select
          to_char(date_trunc(a.bucket, ps.sold_at at time zone a.tz), 'YYYY-MM-DD') as key,
          sum(ps.total) as revenue,
          case when a.can_see_costs then sum(ps.total - ps.cost_total) end as profit,
          count(*) as sales_count
        from period_sales ps
        group by 1
      ) as d
    ),
    'top_products', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.revenue desc), '[]'::jsonb)
      from (
        select
          pi.product_id,
          max(pi.product_name) as name,
          sum(pi.quantity) as units,
          sum(pi.line_total) as revenue,
          case when a.can_see_costs then sum(pi.line_total - pi.quantity * pi.unit_cost) end as profit
        from period_items pi
        group by pi.product_id
        order by sum(pi.line_total) desc
        limit 10
      ) as t
    ),
    'top_customers', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.total desc), '[]'::jsonb)
      from (
        select
          c.id as customer_id,
          c.name,
          count(*) as orders,
          sum(ps.total) as total,
          max(ps.sold_at) as last_purchase_at
        from period_sales ps
        join public.customers c on c.id = ps.customer_id
        group by c.id, c.name
        order by sum(ps.total) desc
        limit 10
      ) as t
    ),
    'heatmap', (
      select coalesce(jsonb_agg(row_to_json(h)), '[]'::jsonb)
      from (
        select
          extract(isodow from ps.sold_at at time zone a.tz)::integer as weekday,
          extract(hour from ps.sold_at at time zone a.tz)::integer as hour,
          count(*) as sales_count,
          sum(ps.total) as revenue
        from period_sales ps
        group by 1, 2
      ) as h
    ),
    'payment_methods', (
      select coalesce(jsonb_agg(row_to_json(pm) order by pm.total desc), '[]'::jsonb)
      from (
        select pp.method, count(*) as sales_count, sum(pp.amount) as total
        from period_payments pp
        group by pp.method
      ) as pm
    )
  )
  from access a;
$$;

-- `collected` is the money received in the period; `receivable` is everything still owed today.
create or replace function public.get_finance_summary(
  p_organization_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_bucket text default 'day'
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with access as (
    select
      private.has_permission(p_organization_id, 'finance.read') as can_read,
      (select o.timezone from public.organizations o where o.id = p_organization_id) as tz,
      case when p_bucket = 'month' then 'month' else 'day' end as bucket
  ),
  period_sales as (
    select s.sold_at, s.total, s.cost_total, s.discount
    from public.sales s
    cross join access a
    where a.can_read
      and s.organization_id = p_organization_id
      and s.status = 'completed'
      and s.sold_at >= p_from
      and s.sold_at < p_to
  ),
  period_payments as (
    select sp.amount
    from public.sale_payments sp
    join public.sales s on s.id = sp.sale_id
    cross join access a
    where a.can_read
      and sp.organization_id = p_organization_id
      and s.status = 'completed'
      and sp.paid_at >= p_from
      and sp.paid_at < p_to
  ),
  open_balances as (
    select s.total - s.paid_total as balance
    from public.sales s
    cross join access a
    where a.can_read
      and s.organization_id = p_organization_id
      and s.status = 'completed'
      and s.paid_total < s.total
  ),
  period_expenses as (
    select e.category, e.amount, e.spent_on
    from public.expenses e
    cross join access a
    where a.can_read
      and e.organization_id = p_organization_id
      and e.spent_on >= (p_from at time zone a.tz)::date
      and e.spent_on <= (p_to at time zone a.tz)::date
  ),
  period_purchases as (
    select m.quantity * m.unit_cost as amount
    from public.inventory_movements m
    cross join access a
    where a.can_read
      and m.organization_id = p_organization_id
      and m.type = 'purchase'
      and m.created_at >= p_from
      and m.created_at < p_to
  ),
  series as (
    select x.key, sum(x.revenue) as revenue, sum(x.cogs) as cogs, sum(x.expenses) as expenses
    from (
      select
        to_char(date_trunc(a.bucket, ps.sold_at at time zone a.tz), 'YYYY-MM-DD') as key,
        ps.total as revenue,
        ps.cost_total as cogs,
        0::numeric as expenses
      from period_sales ps
      cross join access a
      union all
      select
        to_char(date_trunc(a.bucket, pe.spent_on::timestamp), 'YYYY-MM-DD'),
        0,
        0,
        pe.amount
      from period_expenses pe
      cross join access a
    ) as x
    group by x.key
  )
  select jsonb_build_object(
    'revenue', (select coalesce(sum(ps.total), 0) from period_sales ps),
    'discounts', (select coalesce(sum(ps.discount), 0) from period_sales ps),
    'cogs', (select coalesce(sum(ps.cost_total), 0) from period_sales ps),
    'collected', (select coalesce(sum(pp.amount), 0) from period_payments pp),
    'receivable', (select coalesce(sum(ob.balance), 0) from open_balances ob),
    'expenses', (select coalesce(sum(pe.amount), 0) from period_expenses pe),
    'purchases', (select coalesce(sum(pp.amount), 0) from period_purchases pp),
    'expenses_by_category', (
      select coalesce(jsonb_agg(row_to_json(ec) order by ec.total desc), '[]'::jsonb)
      from (
        select pe.category, sum(pe.amount) as total
        from period_expenses pe
        group by pe.category
      ) as ec
    ),
    'series', (select coalesce(jsonb_agg(row_to_json(s) order by s.key), '[]'::jsonb) from series s)
  );
$$;

-- -----------------------------------------------------------------------------
-- Function privileges
-- -----------------------------------------------------------------------------
revoke execute on function public.create_sale(uuid, public.payment_method, numeric, jsonb, uuid, text, numeric, text, text) from public, anon;
revoke execute on function public.add_sale_payment(uuid, numeric, public.payment_method, text, text, text) from public, anon;
revoke execute on function public.set_payment_receipt(uuid, text) from public, anon;
revoke execute on function public.list_sales(uuid, timestamptz, timestamptz, integer, boolean) from public, anon;
revoke execute on function public.list_customers(uuid) from public, anon;

grant execute on function public.create_sale(uuid, public.payment_method, numeric, jsonb, uuid, text, numeric, text, text) to authenticated;
grant execute on function public.add_sale_payment(uuid, numeric, public.payment_method, text, text, text) to authenticated;
grant execute on function public.set_payment_receipt(uuid, text) to authenticated;
grant execute on function public.list_sales(uuid, timestamptz, timestamptz, integer, boolean) to authenticated;
grant execute on function public.list_customers(uuid) to authenticated;
