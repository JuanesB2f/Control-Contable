"use client"

import { ChevronsUpDown, UserPlus, UserRound, X } from "lucide-react"
import { useState } from "react"

import { UserAvatar } from "@/components/data/user-avatar"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CustomerFormDialog } from "@/modules/customers/components/customer-form-dialog"

export type CustomerOption = { id: string; name: string; phone: string | null }

type CustomerPickerProps = {
  customers: CustomerOption[]
  value: CustomerOption | null
  onChange: (customer: CustomerOption | null) => void
  canCreate: boolean
}

export function CustomerPicker({ customers, value, onChange, canCreate }: CustomerPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="h-11 min-w-0 flex-1 justify-start gap-2.5 px-3 max-sm:text-sm">
              {value ? (
                <UserAvatar name={value.name} className="size-7" />
              ) : (
                <span className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <UserRound className="size-4" />
                </span>
              )}
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="text-[11px] font-normal text-muted-foreground">Cliente</span>
                <span className="truncate text-sm">{value?.name ?? "Venta de mostrador"}</span>
              </span>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
            <Command>
              <CommandInput placeholder="Buscar cliente" value={search} onValueChange={setSearch} />
              <CommandList>
                <CommandEmpty>{canCreate ? "No está registrado todavía." : "Sin resultados."}</CommandEmpty>
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      keywords={[customer.name, customer.phone ?? ""]}
                      data-checked={value?.id === customer.id}
                      onSelect={() => {
                        onChange(customer)
                        setOpen(false)
                        setSearch("")
                      }}
                    >
                      <UserAvatar name={customer.name} className="size-6" />
                      <span className="min-w-0 flex-1 truncate">{customer.name}</span>
                      {customer.phone ? <span className="text-xs text-muted-foreground">{customer.phone}</span> : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {canCreate ? (
                  <CommandGroup forceMount>
                    <CommandItem
                      forceMount
                      value="__create__"
                      onSelect={() => {
                        setOpen(false)
                        setCreating(true)
                      }}
                      className="text-primary"
                    >
                      <UserPlus />
                      {search.trim() ? `Crear «${search.trim()}»` : "Nuevo cliente"}
                    </CommandItem>
                  </CommandGroup>
                ) : null}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {value ? (
          <Button variant="ghost" size="icon" aria-label="Quitar cliente" onClick={() => onChange(null)}>
            <X />
          </Button>
        ) : null}
      </div>

      {canCreate ? (
        <CustomerFormDialog
          open={creating}
          onOpenChange={setCreating}
          customer={null}
          initialName={search.trim()}
          onSaved={(customer) => {
            onChange({ ...customer, phone: null })
            setSearch("")
          }}
        />
      ) : null}
    </>
  )
}
