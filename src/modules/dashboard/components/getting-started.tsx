import { ArrowRight, Check } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type GettingStartedStep = {
  id: string
  title: string
  description: string
  done: boolean
  href?: string
  cta?: string
  comingSoon?: boolean
}

export function GettingStarted({ steps }: { steps: GettingStartedStep[] }) {
  const completed = steps.filter((step) => step.done).length
  const progress = Math.round((completed / steps.length) * 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[17px] font-semibold">Primeros pasos</CardTitle>
        <CardDescription>
          {completed} de {steps.length} completados
        </CardDescription>
        <div
          className="col-span-full mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de configuración"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="px-2">
        <ol className="flex flex-col">
          {steps.map((step) => (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors",
                !step.done && step.href && "hover:bg-muted/70",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  step.done ? "border-transparent bg-success text-white" : "border-border bg-background",
                )}
              >
                {step.done ? <Check className="size-3.5" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", step.done && "text-muted-foreground line-through decoration-1")}>
                  {step.title}
                </p>
                <p className="text-[13px] text-muted-foreground">{step.description}</p>
              </div>
              {step.comingSoon ? (
                <Badge variant="secondary" className="font-normal text-muted-foreground">
                  Pronto
                </Badge>
              ) : !step.done && step.href ? (
                <Link
                  href={step.href}
                  className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-primary hover:underline"
                >
                  {step.cta}
                  <ArrowRight className="size-3.5" />
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
