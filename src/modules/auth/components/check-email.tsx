import { MailCheck } from "lucide-react"

export function CheckEmail({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center animate-in fade-in-0 zoom-in-95 duration-300">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MailCheck className="size-7" strokeWidth={1.75} />
      </span>
      <div className="space-y-1.5">
        <p className="text-[17px] font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground text-pretty">{children}</p>
      </div>
    </div>
  )
}
