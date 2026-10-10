"use client"

import { Search } from "lucide-react"

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

type SearchFieldProps = {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  className?: string
  autoFocus?: boolean
}

export function SearchField({ value, onValueChange, placeholder, className, autoFocus }: SearchFieldProps) {
  return (
    <InputGroup className={cn("h-9 rounded-xl bg-muted/60", className)}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
      />
    </InputGroup>
  )
}