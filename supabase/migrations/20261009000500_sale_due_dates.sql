-- =============================================================================
-- Due dates for balances
--
-- A sale left with a balance carries the date the customer promised to pay the
-- rest (local calendar day of the organization). Each installment may move the
-- promise, and it can also be changed on its own; every change is audited.
-- =============================================================================

alter table public.sales add column due_date date;

grant select (due_date) on public.sales to authenticated;

create function private.organization_today(p_organization_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone o.timezone)::date from public.organizations o where o.id = p_organization_id;
$$;

revoke execute on function private.organization_today(uuid) from public, anon;

-- -----------------------------------------------------------------------------
-- create_sale: accepts the due date of the balance.
-- -----------------------------------------------------------------------------
drop function public.create_sale(uuid, public.payment_method, numeric, jsonb, uuid, text, numeric, text, text);

create function public.create_sale(
  p_organization_id uuid,
  p_payment_method public.payment_method,
  p_discount numeric,
  p_items jsonb,
  p_customer_id uuid default null,
  p_notes text default null,
  p_paid_amount numeric default null,
  p_bank text default null,
  p_reference text default null,
  p_due_date date default null
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
  if v_paid < v_total and p_due_date is not null and p_due_date < private.organization_today(p_organization_id) then
    raise exception 'Due date in the past' using errcode = 'P0001', hint = 'invalid_due_date';
  end if;
  if v_paid > 0 and p_payment_method = 'transfer' and v_bank is null then
    raise exception 'Bank required' using errcode = 'P0001', hint = 'bank_required';
  end if;

  update public.sales
  set subtotal = v_subtotal, discount = v_discount, total = v_total, cost_total = v_cost, paid_total = v_paid,
      due_date = case when v_paid < v_total then p_due_date end
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
      jsonb_build_object('number', v_number, 'total', v_total, 'paid', v_paid, 'due_date', p_due_date)
    );
  end if;

  return query select v_sale_id, v_number, v_payment_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- add_sale_payment: may move the due date of what is left.
-- -----------------------------------------------------------------------------
drop function public.add_sale_payment(uuid, numeric, public.payment_method, text, text, text);

create function public.add_sale_payment(
  p_sale_id uuid,
  p_amount numeric,
  p_method public.payment_method,
  p_bank text default null,
  p_reference text default null,
  p_note text default null,
  p_due_date date default null
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
  if p_due_date is not null and p_due_date < private.organization_today(v_sale.organization_id) then
    raise exception 'Due date in the past' using errcode = 'P0001', hint = 'invalid_due_date';
  end if;

  insert into public.sale_payments (organization_id, sale_id, amount, method, bank, reference, note, created_by)
  values (
    v_sale.organization_id, p_sale_id, v_amount, p_method,
    case when p_method = 'transfer' then v_bank end,
    nullif(btrim(p_reference), ''), nullif(btrim(p_note), ''), (select auth.uid())
  )
  returning id into v_payment_id;

  update public.sales
  set paid_total = paid_total + v_amount,
      due_date = case when v_amount < v_balance then coalesce(p_due_date, due_date) end
  where id = p_sale_id;

  perform private.write_audit_log(
    v_sale.organization_id, 'sale.payment_added', 'sale', p_sale_id::text,
    jsonb_build_object('number', v_sale.number, 'amount', v_amount, 'method', p_method, 'balance', v_balance - v_amount)
  );

  return v_payment_id;
end;
$$;

-- Moves (or clears) the date the customer promised to pay the balance.
create function public.set_sale_due_date(p_sale_id uuid, p_due_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.sales;
begin
  select * into v_sale from public.sales s where s.id = p_sale_id for update;

  if not found or not private.has_permission(v_sale.organization_id, 'sales.create') then
    raise exception 'Sale not found' using errcode = 'P0001', hint = 'sale_not_found';
  end if;
  if v_sale.status = 'voided' or v_sale.paid_total >= v_sale.total then
    raise exception 'Nothing owed' using errcode = 'P0001', hint = 'sale_settled';
  end if;
  if p_due_date is not null and p_due_date < private.organization_today(v_sale.organization_id) then
    raise exception 'Due date in the past' using errcode = 'P0001', hint = 'invalid_due_date';
  end if;
  if v_sale.due_date is not distinct from p_due_date then
    return;
  end if;

  update public.sales set due_date = p_due_date where id = p_sale_id;

  perform private.write_audit_log(
    v_sale.organization_id, 'sale.due_date_changed', 'sale', p_sale_id::text,
    jsonb_build_object('number', v_sale.number, 'from', v_sale.due_date, 'to', p_due_date)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- list_sales: returns the due date; balances come soonest-due first.
-- -----------------------------------------------------------------------------
drop function public.list_sales(uuid, timestamptz, timestamptz, integer, boolean);

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
  due_date date,
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
    s.subtotal, s.discount, s.total, s.paid_total, s.due_date,
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
  order by
    case when coalesce(p_pending_only, false) then s.due_date end asc nulls last,
    s.sold_at desc
  limit least(greatest(coalesce(p_limit, 500), 1), 1000);
$$;

revoke execute on function public.create_sale(uuid, public.payment_method, numeric, jsonb, uuid, text, numeric, text, text, date) from public, anon;
revoke execute on function public.add_sale_payment(uuid, numeric, public.payment_method, text, text, text, date) from public, anon;
revoke execute on function public.set_sale_due_date(uuid, date) from public, anon;
revoke execute on function public.list_sales(uuid, timestamptz, timestamptz, integer, boolean) from public, anon;

grant execute on function public.create_sale(uuid, public.payment_method, numeric, jsonb, uuid, text, numeric, text, text, date) to authenticated;
grant execute on function public.add_sale_payment(uuid, numeric, public.payment_method, text, text, text, date) to authenticated;
grant execute on function public.set_sale_due_date(uuid, date) to authenticated;
grant execute on function public.list_sales(uuid, timestamptz, timestamptz, integer, boolean) to authenticated;
