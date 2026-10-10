"use client"

import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { useOrgFormat } from "@/hooks/use-org-format"
import { parseDecimal } from "@/lib/money"

type AmountInputProps = {
  value: string
  onValueChange: (value: string) => void
  label: string
  id?: string
  placeholder?: string
  invalid?: boolean
  autoFocus?: boolean
  className?: string
}

/** Money field that shows thousands separators ("100.000") once the user leaves it. */
export function AmountInput({ value, onValueChange, label, id, placeholder, invalid, autoFocus, className }: AmountInputProps) {
  const format = useOrgFormat()
  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <InputGroupText className="font-normal">$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={() => {
          const amount = parseDecimal(value)
          if (Number.isFinite(amount) && amount >= 0) onValueChange(format.number(amount))
        }}
        onFocus={(event) => event.target.select()}
        inputMode="decimal"
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={invalid}
        autoFocus={autoFocus}
        className="pl-0! tabular-nums"
      />
    </InputGroup>
  )
}
