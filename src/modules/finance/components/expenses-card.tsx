"use client"

import { Plus, ReceiptText, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { EmptyState } from "@/components/feedback/empty-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useOrgFormat } from "@/hooks/use-org-format"
import { useCan, useOrg } from "@/modules/access/components/org-provider"

import { deleteExpense } from "../application/actions"
import { EXPENSE_CATEGORY_LABELS, type Expense } from "../domain/finance"
import { EXPENSE_CATEGORY_ICONS } from "./expense-icons"
import { ExpenseFormDialog } from "./expense-form-dialog"

export function ExpensesCard({ expenses, today }: { expenses: Expense[]; today: string }) {
  const { organization } = useOrg()
  const can = useCan()
  const format = useOrgFormat()
  const canWrite = can("finance.write")
  const [formOpen, setFormOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Expense | null>(null)
  const [pending, startTransition] = useTransition()

  const dateFormatter = new Intl.DateTimeFormat(organization.locale, { day: "numeric", month: "short", timeZone: "UTC" })
  const formatDay = (key: string) => {
    const [year, month, day] = key.split("-").map(Number)
    return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)))
  }

  const remove = () => {
    if (!toDelete) return
    startTransition(async () => {
      const result = await deleteExpense(organization.slug, toDelete.id)
      if (!result.ok) {
        toast.error(result.error.message)
        return
      }
      toast.success("Gasto eliminado")
      setToDelete(null)
    })
  }

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-[15px] font-semibold">Gastos del negocio</CardTitle>
        <CardDescription>Lo que pagaste para operar en este periodo.</CardDescription>
        {canWrite ? (
          <CardAction>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus data-icon="inline-start" />
              Gasto
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      {expenses.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Sin gastos registrados"
          description="Registra arriendo, servicios o publicidad para conocer tu ganancia neta real."
          className="border-t"
        />
      ) : (
        <ul className="max-h-105 divide-y divide-border/70 overflow-y-auto border-t">
          {expenses.map((expense) => {
            const Icon = EXPENSE_CATEGORY_ICONS[expense.category]
            return (
              <li key={expense.id} className="group flex items-center gap-3 px-4 py-3 sm:px-6">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-chart-3/15 text-[#a27800] dark:text-chart-3">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{expense.description}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {EXPENSE_CATEGORY_LABELS[expense.category]} · {formatDay(expense.spentOn)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{format.money(expense.amount)}</span>
                {canWrite ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Eliminar ${expense.description}`}
                    className="text-muted-foreground hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    onClick={() => setToDelete(expense)}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {canWrite ? <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} today={today} /> : null}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `${toDelete.description} · ${format.money(toDelete.amount)}. ` : ""}Tus números se recalculan al instante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                remove()
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
