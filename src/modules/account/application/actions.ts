"use server"

import { revalidatePath } from "next/cache"

import { fail, failValidation, ok, type ActionResult } from "@/lib/action-result"
import { mapDatabaseError } from "@/lib/supabase/errors"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/modules/access/application/session"

import { updateProfileSchema, type UpdateProfileInput } from "../domain/schemas"

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("unauthenticated", "Tu sesión expiró. Vuelve a iniciar sesión.")

  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) return failValidation(parsed.error)

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.fullName }).eq("id", user.id)
  if (error) return mapDatabaseError(error)

  revalidatePath("/", "layout")
  return ok()
}
