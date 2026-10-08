import { Compass } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/feedback/empty-state"
import { Button } from "@/components/ui/button"
import { routes } from "@/config/routes"

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-sidebar p-6">
      <EmptyState
        icon={Compass}
        title="No encontramos esta página"
        description="Puede que el enlace esté mal escrito o que no tengas acceso a este negocio."
        action={
          <Button asChild>
            <Link href={routes.home}>Volver al inicio</Link>
          </Button>
        }
      />
    </main>
  )
}
