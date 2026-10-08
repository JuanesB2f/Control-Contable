import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { routes } from "@/config/routes"
import { AuthCard } from "@/modules/auth/components/auth-card"
import { AuthFormSkeleton } from "@/modules/auth/components/auth-form-skeleton"
import { LoginForm } from "@/modules/auth/components/login-form"

export const metadata: Metadata = { title: "Iniciar sesión" }

export default function LoginPage() {
  return (
    <AuthCard
      title="Bienvenido de nuevo"
      description="Inicia sesión para ver cómo va tu negocio."
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link href={routes.signup} className="font-medium text-primary hover:underline">
            Crea una gratis
          </Link>
        </>
      }
    >
      <Suspense fallback={<AuthFormSkeleton fields={2} />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  )
}
