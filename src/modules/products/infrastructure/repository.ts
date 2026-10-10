import "server-only"

import type { SupabaseServerClient } from "@/lib/supabase/server"

import { PRODUCT_IMAGE_BUCKET } from "../domain/image"
import type { Product } from "../domain/types"

export async function listProducts(supabase: SupabaseServerClient, organizationId: string): Promise<Product[]> {
  const { data, error } = await supabase.rpc("list_products", { p_organization_id: organizationId })
  if (error) throw error

  const images = supabase.storage.from(PRODUCT_IMAGE_BUCKET)
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    salePrice: row.sale_price,
    costPrice: row.cost_price,
    stock: row.stock,
    minStock: row.min_stock,
    isActive: row.is_active,
    unitsSold30d: row.units_sold_30d,
    revenue30d: row.revenue_30d,
    createdAt: row.created_at,
    imageUrl: row.image_path ? images.getPublicUrl(row.image_path).data.publicUrl : null,
  }))
}

export async function uploadProductImage(supabase: SupabaseServerClient, path: string, file: Blob, contentType: string) {
  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, { contentType, cacheControl: "31536000", upsert: false })
}

export async function removeProductImages(supabase: SupabaseServerClient, paths: string[]) {
  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths)
}
