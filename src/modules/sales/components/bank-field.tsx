"use client"

import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { COMMON_BANKS } from "../domain/payments"

const OTHER_BANK = "__other__"

type BankFieldProps = {
  id?: string
  value: string
  onChange: (bank: string) => void
  invalid?: boolean
}

/** Common banks in a list, with "Otro banco" to type any other one. */
export function BankField({ id, value, onChange, invalid }: BankFieldProps) {
  const [custom, setCustom] = useState(value !== "" && !COMMON_BANKS.some((bank) => bank === value))

  return (
    <div className="grid gap-2">
      <Select
        value={custom ? OTHER_BANK : value}
        onValueChange={(next) => {
          setCustom(next === OTHER_BANK)
          onChange(next === OTHER_BANK ? "" : next)
        }}
      >
        <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
          <SelectValue placeholder="Elige el banco" />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-72">
          {COMMON_BANKS.map((bank) => (
            <SelectItem key={bank} value={bank}>
              {bank}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_BANK}>Otro banco…</SelectItem>
        </SelectContent>
      </Select>
      {custom ? (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Nombre del banco"
          aria-label="Nombre del banco"
          aria-invalid={invalid}
          maxLength={60}
          autoFocus
        />
      ) : null}
    </div>
  )
}
