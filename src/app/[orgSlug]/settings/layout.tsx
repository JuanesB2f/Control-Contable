import { PageContainer, PageHeader } from "@/components/layout/page-header"
import { SettingsNav } from "@/modules/settings/components/settings-nav"

export default function SettingsLayout({ children }: LayoutProps<"/[orgSlug]/settings">) {
  return (
    <PageContainer className="max-w-4xl gap-6">
      <PageHeader title="Configuración" />
      <SettingsNav />
      {children}
    </PageContainer>
  )
}
