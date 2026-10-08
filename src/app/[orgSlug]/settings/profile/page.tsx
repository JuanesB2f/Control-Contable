import type { Metadata } from "next"

import { UserAvatar } from "@/components/data/user-avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileForm } from "@/modules/account/components/profile-form"
import { requireUser } from "@/modules/access/application/session"
import { UpdatePasswordForm } from "@/modules/auth/components/update-password-form"

export const metadata: Metadata = { title: "Tu perfil" }

export default async function ProfilePage() {
  const user = await requireUser()
  const displayName = user.fullName ?? user.email

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="flex items-center gap-4">
          <UserAvatar name={displayName} imageUrl={user.avatarUrl} className="size-14 text-base" />
          <div className="min-w-0">
            <CardTitle className="truncate text-[17px] font-semibold">{displayName}</CardTitle>
            <CardDescription className="truncate">{user.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ProfileForm fullName={user.fullName} email={user.email} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold">Contraseña</CardTitle>
          <CardDescription>Usa una contraseña que no utilices en otros sitios.</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
