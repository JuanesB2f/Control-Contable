-- =============================================================================
-- Commerce: products, inventory, customers, sales and expenses.
--
-- Costs are sensitive: employees sell but must not learn what products cost.
-- Cost columns are never granted to clients; they are only exposed through the
-- security definer read functions below, which blank them out without
-- `costs.read`.
--
-- Stock only changes inside RPCs, and every change writes an inventory movement.
-- Product cost is a weighted average updated on every purchase, and each sale
-- line keeps a snapshot of the cost at the moment of the sale.
-- =============================================================================

create type public.payment_method as enum ('cash', 'card', 'transfer', 'other');
create type public.sale_status as enum ('completed', 'voided');
create type public.stock_movement_type as enum ('opening', 'purchase', 'sale', 'adjustment', 'void');
create type public.expense_category as enum (
  'rent', 'payroll', 'utilities', 'marketing', 'transport', 'supplies', 'taxes', 'other'
);

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  sku text check (sku is null or char_length(sku) between 1 and 40),
  category text check (category is null or char_length(category) <= 60),
  cost_price numeric(14, 2) not null default 0 check (cost_price >= 0),
  sale_price numeric(14, 2) not null check (sale_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_org_name_idx on public.products (organization_id, name);
create unique index products_org_sku_idx on public.products (organization_id, lower(sku)) where sku is not null;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- customers
-- -----------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  phone text check (phone is null or char_length(phone) <= 30),
  email text check (email is null or (email = lower(email) and char_length(email) <= 254)),
  document text check (document is null or char_length(document) <= 30),
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_org_name_idx on public.customers (organization_id, name);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- sales + sale_items
-- -----------------------------------------------------------------------------
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  number integer not null check (number > 0),
  customer_id uuid references public.customers (id) on delete set null,
  status public.sale_status not null default 'completed',
  payment_method public.payment_method not null default 'cash',
  subtotal numeric(14, 2) not null default 0 check (subtotal >= 0),
  discount numeric(14, 2) not null default 0 check (discount >= 0 and discount <= subtotal),
  total numeric(14, 2) not null default 0 check (total >= 0),
  cost_total numeric(14, 2) not null default 0 check (cost_total >= 0),
  notes text check (notes is null or char_length(notes) <= 500),
  sold_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references public.profiles (id) on delete set null,
  void_reason text check (void_reason is null or char_length(void_reason) <= 200),
  created_at timestamptz not null default now(),
  unique (organization_id, number)
);

create index sales_org_sold_at_idx on public.sales (organization_id, sold_at desc);
create index sales_customer_id_idx on public.sales (customer_id);

create table public.sale_items (
  id bigint generated always as identity primary key,
  sale_id uuid not null references public.sales (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0),
  line_total numeric(14, 2) not null check (line_total >= 0)
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);
create index sale_items_org_product_idx on public.sale_items (organization_id, product_id);

-- -----------------------------------------------------------------------------
-- inventory_movements (append-only ledger of every stock change)
-- -----------------------------------------------------------------------------
create table public.inventory_movements (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  type public.stock_movement_type not null,
  quantity integer not null check (quantity <> 0),
  unit_cost numeric(14, 2) check (unit_cost is null or unit_cost >= 0),
  stock_after integer not null check (stock_after >= 0),
  sale_id uuid references public.sales (id) on delete set null,
  note text check (note is null or char_length(note) <= 200),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index inventory_movements_org_created_idx on public.inventory_movements (organization_id, created_at desc);
create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);

-- -----------------------------------------------------------------------------
-- expenses
-- -----------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category public.expense_category not null,
  description text not null check (char_length(description) between 2 and 160),
  amount numeric(14, 2) not null check (amount > 0),
  spent_on date not null default current_date,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index expenses_org_spent_on_idx on public.expenses (organization_id, spent_on desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.expenses enable row level security;

create policy "Product readers can view products"
  on public.products for select to authenticated
  using (private.has_permission(organization_id, 'products.read'));

create policy "Customer readers can view customers"
  on public.customers for select to authenticated
  using (private.has_permission(organization_id, 'customers.read'));

create policy "Customer writers can add customers"
  on public.customers for insert to authenticated
  with check (private.has_permission(organization_id, 'customers.write'));

create policy "Customer writers can update customers"
  on public.customers for update to authenticated
  using (private.has_permission(organization_id, 'customers.write'))
  with check (private.has_permission(organization_id, 'customers.write'));

create policy "Customer writers can delete customers"
  on public.customers for delete to authenticated
  using (private.has_permission(organization_id, 'customers.write'));

create policy "Sales readers can view sales"
  on public.sales for select to authenticated
  using (private.has_permission(organization_id, 'sales.read'));

create policy "Sales readers can view sale items"
  on public.sale_items for select to authenticated
  using (private.has_permission(organization_id, 'sales.read'));

create policy "Inventory readers can view movements"
  on public.inventory_movements for select to authenticated
  using (private.has_permission(organization_id, 'inventory.read'));

create policy "Finance readers can view expenses"
  on public.expenses for select to authenticated
  using (private.has_permission(organization_id, 'finance.read'));

create policy "Finance writers can add expenses"
  on public.expenses for insert to authenticated
  with check (private.has_permission(organization_id, 'finance.write'));

create policy "Finance writers can delete expenses"
  on public.expenses for delete to authenticated
  using (private.has_permission(organization_id, 'finance.write'));

-- -----------------------------------------------------------------------------
-- Table privileges. Cost columns are deliberately left out of every grant.
-- -----------------------------------------------------------------------------
revoke all on
  public.products, public.customers, public.sales, public.sale_items,
  public.inventory_movements, public.expenses
from anon, authenticated;

grant select (
  id, organization_id, name, sku, category, sale_price, stock, min_stock, is_active, created_at, updated_at
) on public.products to authenticated;

grant select, delete on public.customers to authenticated;
grant insert (organization_id, name, phone, email, document, notes) on public.customers to authenticated;
grant update (name, phone, email, document, notes) on public.customers to authenticated;

grant select (
  id, organization_id, number, customer_id, status, payment_method, subtotal, discount, total,
  notes, sold_at, created_by, voided_at, voided_by, void_reason, created_at
) on public.sales to authenticated;

grant select (
  id, sale_id, organization_id, product_id, product_name, quantity, unit_price, line_total
) on public.sale_items to authenticated;

grant select (
  id, organization_id, product_id, type, quantity, stock_after, sale_id, note, created_by, created_at
) on public.inventory_movements to authenticated;

grant select, delete on public.expenses to authenticated;
grant insert (organization_id, category, description, amount, spent_on) on public.expenses to authenticated;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create function private.assert_permission(p_organization_id uuid, p_permission text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission(p_organization_id, p_permission) then
    raise exception 'Permission denied' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function private.assert_permission(uuid, text) from public;

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
create function public.create_product(
  p_organization_id uuid,
  p_name text,
  p_sku text,
  p_category text,
  p_cost_price numeric,
  p_sale_price numeric,
  p_min_stock integer,
  p_initial_stock integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
  v_initial_stock integer := coalesce(p_initial_stock, 0);
begin
  perform private.assert_permission(p_organization_id, 'products.write');

  if v_initial_stock < 0 then
    raise exception 'Invalid quantity' using errcode = 'P0001', hint = 'invalid_quantity';
  end if;

  insert into public.products (
    organization_id, name, sku, category, cost_price, sale_price, stock, min_stock, created_by
  )
  values (
    p_organization_id,
    btrim(p_name),
    nullif(btrim(p_sku), ''),
    nullif(btrim(p_category), ''),
    coalesce(p_cost_price, 0),
    p_sale_price,
    v_initial_stock,
    coalesce(p_min_stock, 0),
    (select auth.uid())
  )
  returning id into v_product_id;

  if v_initial_stock > 0 then
    insert into public.inventory_movements (organization_id, product_id, type, quantity, unit_cost, stock_after, note, created_by)
    values (p_organization_id, v_product_id, 'opening', v_initial_stock, coalesce(p_cost_price, 0), v_initial_stock, 'Inventario inicial', (select auth.uid()));
  end if;

  perform private.write_audit_log(
    p_organization_id, 'product.created', 'product', v_product_id::text,
    jsonb_build_object('name', btrim(p_name))
  );

  return v_product_id;
end;
$$;

create function public.update_product(
  p_product_id uuid,
  p_name text,
  p_sku text,
  p_category text,
  p_cost_price numeric,
  p_sale_price numeric,
  p_min_stock integer,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_changes jsonb := '{}'::jsonb;
begin
  select * into v_product from public.products p where p.id = p_product_id for update;

  if not found or not private.has_permission(v_product.organization_id, 'products.write') then
    raise exception 'Product not found' using errcode = 'P0001', hint = 'product_not_found';
  end if;

  if v_product.sale_price is distinct from p_sale_price then
    v_changes := v_changes || jsonb_build_object('sale_price', jsonb_build_object('from', v_product.sale_price, 'to', p_sale_price));
  end if;
  if v_product.cost_price is distinct from p_cost_price then
    v_changes := v_changes || jsonb_build_object('cost_price', jsonb_build_object('from', v_product.cost_price, 'to', p_cost_price));
  end if;
  if v_product.is_active is distinct from p_is_active then
    v_changes := v_changes || jsonb_build_object('is_active', jsonb_build_object('from', v_product.is_active, 'to', p_is_active));
  end if;

  update public.products
  set name = btrim(p_name),
      sku = nullif(btrim(p_sku), ''),
      category = nullif(btrim(p_category), ''),
      cost_price = p_cost_price,
      sale_price = p_sale_price,
      min_stock = coalesce(p_min_stock, 0),
      is_active = p_is_active
  where id = p_product_id;

  perform private.write_audit_log(
    v_product.organization_id, 'product.updated', 'product', p_product_id::text,
    jsonb_build_object('name', btrim(p_name), 'changes', v_changes)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Inventory: purchases update the weighted average cost; adjustments correct counts.
-- -----------------------------------------------------------------------------
create function public.record_stock_movement(
  p_product_id uuid,
  p_type public.stock_movement_type,
  p_quantity integer,
  p_unit_cost numeric,
  p_note text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_new_stock integer;
  v_new_cost numeric(14, 2);
begin
  select * into v_product from public.products p where p.id = p_product_id for update;

  if not found or not private.has_permission(v_product.organization_id, 'inventory.adjust') then
    raise exception 'Product not found' using errcode = 'P0001', hint = 'product_not_found';
  end if;

  if p_type not in ('purchase', 'adjustment') or p_quantity is null or p_quantity = 0 then
    raise exception 'Invalid movement' using errcode = 'P0001', hint = 'invalid_movement';
  end if;

  if p_type = 'purchase' and (p_quantity < 0 or p_unit_cost is null or p_unit_cost < 0) then
    raise exception 'Invalid purchase' using errcode = 'P0001', hint = 'invalid_movement';
  end if;

  v_new_stock := v_product.stock + p_quantity;
  if v_new_stock < 0 then
    raise exception 'Insufficient stock' using errcode = 'P0001', hint = 'insufficient_stock', detail = v_product.name;
  end if;

  v_new_cost := v_product.cost_price;
  if p_type = 'purchase' then
    v_new_cost := case
      when v_product.stock <= 0 then p_unit_cost
      else round((v_product.stock * v_product.cost_price + p_quantity * p_unit_cost) / v_new_stock, 2)
    end;
  end if;

  update public.products set stock = v_new_stock, cost_price = v_new_cost where id = p_product_id;

  insert into public.inventory_movements (organization_id, product_id, type, quantity, unit_cost, stock_after, note, created_by)
  values (
    v_product.organization_id, p_product_id, p_type, p_quantity,
    case when p_type = 'purchase' then p_unit_cost end,
    v_new_stock, nullif(btrim(p_note), ''), (select auth.uid())
  );

  perform private.write_audit_log(
    v_product.organization_id,
    case when p_type = 'purchase' then 'inventory.purchased' else 'inventory.adjusted' end,
    'product', p_product_id::text,
    jsonb_build_object('name', v_product.name, 'quantity', p_quantity, 'stock_after', v_new_stock)
  );

  return v_new_stock;
end;
$$;

-- -----------------------------------------------------------------------------
-- Sales
-- p_items: [{ "product_id": uuid, "quantity": int, "unit_price": numeric }]
-- -----------------------------------------------------------------------------
create function public.create_sale(
  p_organization_id uuid,
  p_customer_id uuid,
  p_payment_method public.payment_method,
  p_discount numeric,
  p_notes text,
  p_items jsonb
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

create function public.void_sale(p_sale_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.sales;
  v_item record;
  v_stock integer;
begin
  select * into v_sale from public.sales s where s.id = p_sale_id for update;

  if not found or not private.has_permission(v_sale.organization_id, 'sales.void') then
    raise exception 'Sale not found' using errcode = 'P0001', hint = 'sale_not_found';
  end if;
  if v_sale.status = 'voided' then
    return;
  end if;

  for v_item in
    select si.product_id, si.quantity
    from public.sale_items si
    where si.sale_id = p_sale_id and si.product_id is not null
    order by si.product_id
  loop
    update public.products p
    set stock = p.stock + v_item.quantity
    where p.id = v_item.product_id
    returning p.stock into v_stock;

    if found then
      insert into public.inventory_movements (organization_id, product_id, type, quantity, stock_after, sale_id, note, created_by)
      values (v_sale.organization_id, v_item.product_id, 'void', v_item.quantity, v_stock, p_sale_id, 'Venta anulada', (select auth.uid()));
    end if;
  end loop;

  update public.sales
  set status = 'voided', voided_at = now(), voided_by = (select auth.uid()), void_reason = nullif(btrim(p_reason), '')
  where id = p_sale_id;

  perform private.write_audit_log(
    v_sale.organization_id, 'sale.voided', 'sale', p_sale_id::text,
    jsonb_build_object('number', v_sale.number, 'total', v_sale.total, 'reason', nullif(btrim(p_reason), ''))
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Read models (cost fields are null without `costs.read`)
-- -----------------------------------------------------------------------------
create function public.list_products(p_organization_id uuid)
returns table (
  id uuid,
  name text,
  sku text,
  category text,
  sale_price numeric,
  cost_price numeric,
  stock integer,
  min_stock integer,
  is_active boolean,
  units_sold_30d integer,
  revenue_30d numeric,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with access as (
    select
      private.has_permission(p_organization_id, 'products.read') as can_read,
      private.has_permission(p_organization_id, 'costs.read') as can_see_costs
  ),
  recent as (
    select si.product_id, sum(si.quantity)::integer as units, sum(si.line_total) as revenue
    from public.sale_items si
    join public.sales s on s.id = si.sale_id
    where si.organization_id = p_organization_id
      and s.status = 'completed'
      and s.sold_at >= now() - interval '30 days'
    group by si.product_id
  )
  select
    p.id, p.name, p.sku, p.category, p.sale_price,
    case when a.can_see_costs then p.cost_price end,
    p.stock, p.min_stock, p.is_active,
    coalesce(r.units, 0), coalesce(r.revenue, 0),
    p.created_at
  from public.products p
  cross join access a
  left join recent r on r.product_id = p.id
  where a.can_read and p.organization_id = p_organization_id
  order by p.is_active desc, p.name;
$$;

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
  favorite_product text
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
      max(s.sold_at) as last_purchase_at
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
    f.product_name
  from public.customers c
  cross join access a
  left join stats st on st.customer_id = c.id
  left join favorites f on f.customer_id = c.id
  where a.can_read and c.organization_id = p_organization_id
  order by coalesce(st.total_spent, 0) desc, c.name;
$$;

create function public.list_sales(
  p_organization_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 500
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
  profit numeric,
  notes text,
  sold_at timestamptz,
  void_reason text,
  items jsonb
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
    s.subtotal, s.discount, s.total,
    case when a.can_see_costs then s.total - s.cost_total end,
    s.notes, s.sold_at, s.void_reason,
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
    ), '[]'::jsonb)
  from public.sales s
  cross join access a
  left join public.customers c on c.id = s.customer_id
  left join public.profiles p on p.id = s.created_by
  where a.can_read
    and s.organization_id = p_organization_id
    and s.sold_at >= p_from
    and s.sold_at < p_to
  order by s.sold_at desc
  limit least(greatest(coalesce(p_limit, 500), 1), 1000);
$$;

create function public.list_stock_movements(p_organization_id uuid, p_limit integer default 100)
returns table (
  id bigint,
  product_id uuid,
  product_name text,
  type public.stock_movement_type,
  quantity integer,
  unit_cost numeric,
  stock_after integer,
  note text,
  sale_number integer,
  actor_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with access as (
    select
      private.has_permission(p_organization_id, 'inventory.read') as can_read,
      private.has_permission(p_organization_id, 'costs.read') as can_see_costs
  )
  select
    m.id, m.product_id, pr.name, m.type, m.quantity,
    case when a.can_see_costs then m.unit_cost end,
    m.stock_after, m.note, s.number,
    coalesce(p.full_name, p.email),
    m.created_at
  from public.inventory_movements m
  cross join access a
  join public.products pr on pr.id = m.product_id
  left join public.sales s on s.id = m.sale_id
  left join public.profiles p on p.id = m.created_by
  where a.can_read and m.organization_id = p_organization_id
  order by m.created_at desc, m.id desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

-- Aggregates for a period. p_bucket: 'day' | 'month' (local to the organization).
create function public.get_sales_analytics(
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
        select ps.payment_method as method, count(*) as sales_count, sum(ps.total) as total
        from period_sales ps
        group by ps.payment_method
      ) as pm
    )
  )
  from access a;
$$;

create function public.get_finance_summary(
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
revoke execute on function public.create_product(uuid, text, text, text, numeric, numeric, integer, integer) from public, anon;
revoke execute on function public.update_product(uuid, text, text, text, numeric, numeric, integer, boolean) from public, anon;
revoke execute on function public.record_stock_movement(uuid, public.stock_movement_type, integer, numeric, text) from public, anon;
revoke execute on function public.create_sale(uuid, uuid, public.payment_method, numeric, text, jsonb) from public, anon;
revoke execute on function public.void_sale(uuid, text) from public, anon;
revoke execute on function public.list_products(uuid) from public, anon;
revoke execute on function public.list_customers(uuid) from public, anon;
revoke execute on function public.list_sales(uuid, timestamptz, timestamptz, integer) from public, anon;
revoke execute on function public.list_stock_movements(uuid, integer) from public, anon;
revoke execute on function public.get_sales_analytics(uuid, timestamptz, timestamptz, text) from public, anon;
revoke execute on function public.get_finance_summary(uuid, timestamptz, timestamptz, text) from public, anon;

grant execute on function public.create_product(uuid, text, text, text, numeric, numeric, integer, integer) to authenticated;
grant execute on function public.update_product(uuid, text, text, text, numeric, numeric, integer, boolean) to authenticated;
grant execute on function public.record_stock_movement(uuid, public.stock_movement_type, integer, numeric, text) to authenticated;
grant execute on function public.create_sale(uuid, uuid, public.payment_method, numeric, text, jsonb) to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;
grant execute on function public.list_products(uuid) to authenticated;
grant execute on function public.list_customers(uuid) to authenticated;
grant execute on function public.list_sales(uuid, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.list_stock_movements(uuid, integer) to authenticated;
grant execute on function public.get_sales_analytics(uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.get_finance_summary(uuid, timestamptz, timestamptz, text) to authenticated;
