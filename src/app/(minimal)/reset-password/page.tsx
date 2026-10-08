import type { Metadata } from "next"

import { routes } from "@/config/routes"
import { AuthCard } from "@/modules/auth/components/auth-card"
import { UpdatePasswordForm } from "@/modules/auth/components/update-password-form"

export const metadata: Metadata = { title: "Nueva contraseña" }

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Crea una nueva contraseña" description="Elige una contraseña segura que no uses en otros sitios.">
      <UpdatePasswordForm redirectTo={routes.home} submitLabel="Guardar y continuar" />
    </AuthCard>
  )
}
