-- =============================================================================
-- Product photos
-- Files live in the public `product-images` bucket under
-- `{organization_id}/{product_id}/{random}.{ext}`; every upload gets a new name,
-- so cached copies never go stale. Writes require `products.write`.
-- =============================================================================

alter table public.products
  add column image_path text check (image_path is null or char_length(image_path) <= 300);

grant select (image_path) on public.products to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- True when `p_path` sits in the folder of a product the current user can edit.
create function private.can_write_product_image(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.products p
    where p.organization_id::text = (storage.foldername(p_path))[1]
      and p.id::text = (storage.foldername(p_path))[2]
      and private.has_permission(p.organization_id, 'products.write')
  );
$$;

revoke execute on function private.can_write_product_image(text) from public, anon;
grant execute on function private.can_write_product_image(text) to authenticated;

create policy "Product writers can read product image objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and private.can_write_product_image(name));

create policy "Product writers can upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and private.can_write_product_image(name));

create policy "Product writers can delete product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and private.can_write_product_image(name));

-- Points the product at a new photo (or none with an empty path) and returns the previous path
-- so the caller can delete the old file.
create function public.set_product_image(p_product_id uuid, p_image_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_path text := nullif(btrim(p_image_path), '');
begin
  select * into v_product from public.products p where p.id = p_product_id for update;

  if not found or not private.has_permission(v_product.organization_id, 'products.write') then
    raise exception 'Product not found' using errcode = 'P0001', hint = 'product_not_found';
  end if;

  if v_path is not null and v_path not like v_product.organization_id::text || '/' || p_product_id::text || '/%' then
    raise exception 'Invalid image path' using errcode = 'P0001', hint = 'invalid_image';
  end if;

  update public.products set image_path = v_path where id = p_product_id;

  return v_product.image_path;
end;
$$;

revoke execute on function public.set_product_image(uuid, text) from public, anon;
grant execute on function public.set_product_image(uuid, text) to authenticated;

drop function public.list_products(uuid);

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
  created_at timestamptz,
  image_path text
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
    p.created_at,
    p.image_path
  from public.products p
  cross join access a
  left join recent r on r.product_id = p.id
  where a.can_read and p.organization_id = p_organization_id
  order by p.is_active desc, p.name;
$$;

revoke execute on function public.list_products(uuid) from public, anon;
grant execute on function public.list_products(uuid) to authenticated;
