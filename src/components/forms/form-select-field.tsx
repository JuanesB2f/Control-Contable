"use client"

import { useId } from "react"
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type SelectOption = { value: string; label: string }

type FormSelectFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: React.ReactNode
  options: readonly SelectOption[]
  placeholder?: string
  description?: React.ReactNode
  disabled?: boolean
  onValueChange?: (value: string) => void
}

export function FormSelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder = "Selecciona una opción",
  description,
  disabled,
  onValueChange,
}: FormSelectFieldProps<T>) {
  const id = useId()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Select
            name={field.name}
            value={field.value ?? ""}
            disabled={disabled}
            onValueChange={(value) => {
              field.onChange(value)
              onValueChange?.(value)
            }}
          >
            <SelectTrigger id={id} aria-invalid={fieldState.invalid} onBlur={field.onBlur} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
        </Field>
      )}
    />
  )
}
