import Link from "next/link"

import { AppLogo } from "@/components/brand/app-logo"
import { siteConfig } from "@/config/site"

export default function MinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-sidebar px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent)]"
      />
      <div className="relative flex w-full max-w-[440px] flex-col items-center gap-8">
        <Link href="/" className="flex flex-col items-center gap-3 outline-none" aria-label={siteConfig.name}>
          <AppLogo className="size-12" />
          <span className="text-sm font-medium text-muted-foreground">{siteConfig.name}</span>
        </Link>
        {children}
      </div>
    </div>
  )
}
