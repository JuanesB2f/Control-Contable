import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type SubmitButtonProps = React.ComponentProps<typeof Button> & { pending: boolean }

export function SubmitButton({ pending, children, disabled, ...props }: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
      {children}
    </Button>
  )
}
