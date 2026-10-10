"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { fail, failValidation, ok, type ActionResult } from "@/lib/action-result"
import { IMAGE_EXTENSIONS, inspectUploadedImage } from "@/lib/images"
import { roundMoney } from "@/lib/money"
import { isUniqueViolation, mapDatabaseError } from "@/lib/supabase/errors"
import { authorizeOrgAction } from "@/modules/access/application/org-context"

import { removeProductImages, uploadProductImage } from "../infrastructure/repository"
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "../domain/schemas"

const SKU_TAKEN = fail("conflict", "Ese código ya lo usa otro producto.", { sku: "Ese código ya lo usa otro producto." })

function revalidateCatalog(orgSlug: string) {
  revalidatePath(`/${orgSlug}`, "layout")
}

export async function createProduct(orgSlug: string, input: CreateProductInput): Promise<ActionResult<{ id: string }>> {
  const auth = await authorizeOrgAction(orgSlug, "products.write")
  if (!auth.ok) return auth

  const parsed = createProductSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const values = parsed.data
  const { data, error } = await auth.supabase.rpc("create_product", {
    p_organization_id: auth.context.organization.id,
    p_name: values.name,
    p_sku: values.sku ?? "",
    p_category: values.category ?? "",
    p_cost_price: roundMoney(values.costPrice),
    p_sale_price: roundMoney(values.salePrice),
    p_min_stock: values.minStock,
    p_initial_stock: values.initialStock,
  })

  if (error) return isUniqueViolation(error) ? SKU_TAKEN : mapDatabaseError(error)

  revalidateCatalog(orgSlug)
  return ok({ id: data })
}

export async function updateProduct(orgSlug: string, input: UpdateProductInput): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "products.write")
  if (!auth.ok) return auth

  const parsed = updateProductSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const values = parsed.data
  const { error } = await auth.supabase.rpc("update_product", {
    p_product_id: values.productId,
    p_name: values.name,
    p_sku: values.sku ?? "",
    p_category: values.category ?? "",
    p_cost_price: roundMoney(values.costPrice),
    p_sale_price: roundMoney(values.salePrice),
    p_min_stock: values.minStock,
    p_is_active: values.isActive,
  })

  if (error) return isUniqueViolation(error) ? SKU_TAKEN : mapDatabaseError(error)

  revalidateCatalog(orgSlug)
  return ok()
}

/** Expects `productId` and `photo` in the form data. Replaces the current photo, if any. */
export async function setProductImage(orgSlug: string, formData: FormData): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "products.write")
  if (!auth.ok) return auth

  const productId = z.uuid().safeParse(formData.get("productId"))
  const photo = formData.get("photo")
  if (!productId.success || !(photo instanceof Blob)) return fail("validation", "Elige una foto.")
  const type = await inspectUploadedImage(photo)
  if (!type) return fail("validation", "Usa una foto JPG, PNG o WebP de menos de 900 KB.")

  const path = `${auth.context.organization.id}/${productId.data}/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[type]}`
  const upload = await uploadProductImage(auth.supabase, path, photo, type)
  if (upload.error) return fail("forbidden", "No pudimos guardar la foto de ese producto.")

  const { data: previous, error } = await auth.supabase.rpc("set_product_image", {
    p_product_id: productId.data,
    p_image_path: path,
  })
  if (error) {
    await removeProductImages(auth.supabase, [path])
    return mapDatabaseError(error)
  }
  if (previous) await removeProductImages(auth.supabase, [previous])

  revalidateCatalog(orgSlug)
  return ok()
}

export async function removeProductImage(orgSlug: string, productId: string): Promise<ActionResult> {
  const auth = await authorizeOrgAction(orgSlug, "products.write")
  if (!auth.ok) return auth

  const id = z.uuid().safeParse(productId)
  if (!id.success) return fail("validation", "Producto inválido.")

  const { data: previous, error } = await auth.supabase.rpc("set_product_image", { p_product_id: id.data, p_image_path: "" })
  if (error) return mapDatabaseError(error)
  if (previous) await removeProductImages(auth.supabase, [previous])

  revalidateCatalog(orgSlug)
  return ok()
}
