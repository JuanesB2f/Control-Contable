"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { settingsSections } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { useCan, useOrg } from "@/modules/access/components/org-provider"

/** iOS-style segmented control linking the settings sections the user can access. */
export function SettingsNav() {
  const pathname = usePathname()
  const { organization } = useOrg()
  const can = useCan()
  const sections = settingsSections.filter((section) => !section.permission || can(section.permission))

  return (
    <nav aria-label="Secciones de configuración" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex min-w-max gap-0.5 rounded-[10px] bg-muted p-0.5">
        {sections.map((section) => {
          const href = section.href(organization.slug)
          const active = pathname === href
          return (
            <Link
              key={section.id}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-all hover:text-foreground",
                active && "bg-background text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.1),0_1px_1px_rgb(0_0_0/0.04)] dark:bg-[#636366]",
              )}
            >
              {section.title}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
