import { z } from "zod"

import { BUSINESS_TYPES, COUNTRY_CODES, CURRENCY_CODES, TIMEZONES } from "./options"
import { SLUG_MAX_LENGTH, SLUG_MIN_LENGTH, SLUG_PATTERN, isReservedSlug } from "./slug"

const nameSchema = z
  .string()
  .trim()
  .min(2, "Escribe al menos 2 caracteres.")
  .max(80, "Máximo 80 caracteres.")

const businessTypeSchema = z.enum(BUSINESS_TYPES).optional()

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(SLUG_MIN_LENGTH, `Usa al menos ${SLUG_MIN_LENGTH} caracteres.`)
  .max(SLUG_MAX_LENGTH, `Máximo ${SLUG_MAX_LENGTH} caracteres.`)
  .regex(SLUG_PATTERN, "Solo letras minúsculas, números y guiones.")
  .refine((slug) => !isReservedSlug(slug), "Esta dirección está reservada. Elige otra.")

export const createOrganizationSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
  businessType: businessTypeSchema,
  country: z.enum(COUNTRY_CODES, "Selecciona un país."),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

export const updateOrganizationSchema = z.object({
  name: nameSchema,
  businessType: businessTypeSchema,
  country: z.enum(COUNTRY_CODES, "Selecciona un país."),
  currency: z.enum(CURRENCY_CODES, "Selecciona una moneda."),
  timezone: z.string().refine((value) => TIMEZONES.includes(value), "Selecciona una zona horaria."),
})

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
