import { Card, CardContent } from "@/components/ui/card"

type AuthCardProps = {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="flex w-full flex-col gap-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div className="space-y-2 text-center">
        <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-[15px] text-muted-foreground text-pretty">{description}</p> : null}
      </div>
      <Card className="w-full">
        <CardContent>{children}</CardContent>
      </Card>
      {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  )
}
