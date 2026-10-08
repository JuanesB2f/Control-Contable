import type { Metadata } from "next"
import Link from "next/link"

import { routes } from "@/config/routes"
import { AuthCard } from "@/modules/auth/components/auth-card"
import { SignupForm } from "@/modules/auth/components/signup-form"

export const metadata: Metadata = { title: "Crear cuenta" }

export default function SignupPage() {
  return (
    <AuthCard
      title="Crea tu cuenta"
      description="Ventas, inventario y finanzas de tu negocio en un solo lugar."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href={routes.login} className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  )
}
