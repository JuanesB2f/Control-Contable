import type { Metadata } from "next"
import Link from "next/link"

import { routes } from "@/config/routes"
import { AuthCard } from "@/modules/auth/components/auth-card"
import { ForgotPasswordForm } from "@/modules/auth/components/forgot-password-form"

export const metadata: Metadata = { title: "Recuperar contraseña" }

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recupera tu acceso"
      description="Te enviaremos un enlace para crear una nueva contraseña."
      footer={
        <Link href={routes.login} className="font-medium text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
