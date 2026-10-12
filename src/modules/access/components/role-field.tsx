"use client"

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form"

import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field"
import { cn } from "@/lib/utils"

import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "../domain/permissions"

/** Radio cards to pick what a teammate can do. */
export function RoleField<T extends FieldValues>({ control, name }: { control: Control<T>; name: FieldPath<T> }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid} className="gap-2">
          <FieldLegend variant="label">Rol</FieldLegend>
          <div className="grid gap-2">
            {ASSIGNABLE_ROLES.map((role) => (
              <label
                key={role}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border bg-card px-3.5 py-3 transition-colors hover:bg-muted/50",
                  field.value === role && "border-primary bg-primary/5 ring-1 ring-primary hover:bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  name={field.name}
                  value={role}
                  checked={field.value === role}
                  onChange={() => field.onChange(role)}
                  onBlur={field.onBlur}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
                  <span className="text-[13px] text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</span>
                </span>
              </label>
            ))}
          </div>
          {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
        </FieldSet>
      )}
    />
  )
}
