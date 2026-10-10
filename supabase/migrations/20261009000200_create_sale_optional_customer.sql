-- Walk-in sales have no customer: the customer and notes move to the end of the
-- signature with defaults so clients can omit them instead of sending null.
drop function public.create_sale(uuid, uuid, public.payment_method, numeric, text, jsonb);

create function public.create_sale(
  p_organization_id uuid,
  p_payment_method public.payment_method,
  p_discount numeric,
  p_items jsonb,
  p_customer_id uuid default null,
  p_notes text default null
)
returns table (sale_id uuid, sale_number integer)
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

  update public.sales
  set subtotal = v_subtotal, discount = v_discount, total = v_subtotal - v_discount, cost_total = v_cost
  where id = v_sale_id;

  return query select v_sale_id, v_number;
end;
$$;

revoke execute on function public.create_sale(uuid, public.payment_method, numeric, jsonb, uuid, text) from public, anon;
grant execute on function public.create_sale(uuid, public.payment_method, numeric, jsonb, uuid, text) to authenticated;
