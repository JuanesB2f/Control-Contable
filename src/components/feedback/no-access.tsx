import { LockKeyhole } from "lucide-react"

import { EmptyState } from "./empty-state"

export function NoAccess({ description }: { description?: string }) {
  return (
    <EmptyState
      icon={LockKeyhole}
      title="No tienes acceso a esta sección"
      description={description ?? "Pide a un administrador de tu negocio que te dé los permisos necesarios."}
    />
  )
}
