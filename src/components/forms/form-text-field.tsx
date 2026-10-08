"use client"

import { useId } from "react"
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"

type FormTextFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: React.ReactNode
  description?: React.ReactNode
  /** Static text shown before the value, e.g. a URL prefix. */
  prefix?: string
} & Omit<React.ComponentProps<"input">, "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "id" | "prefix">

export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  prefix,
  ...inputProps
}: FormTextFieldProps<T>) {
  const id = useId()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const controlProps = {
          ...inputProps,
          ...field,
          value: field.value ?? "",
          id,
          "aria-invalid": fieldState.invalid,
        }
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {prefix ? (
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText className="font-normal">{prefix}</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput {...controlProps} className="pl-0!" />
              </InputGroup>
            ) : (
              <Input {...controlProps} />
            )}
            {fieldState.invalid ? (
              <FieldError errors={[fieldState.error]} />
            ) : description ? (
              <FieldDescription>{description}</FieldDescription>
            ) : null}
          </Field>
        )
      }}
    />
  )
}
