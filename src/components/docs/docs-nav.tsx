'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export const docsNav = [
  { href: '/docs', label: 'Getting started', exact: true },
  { href: '/docs/using-deploy', label: 'Using Deploy', exact: false },
  { href: '/docs/self-hosting', label: 'Self-hosting', exact: false },
  { href: '/docs/architecture', label: 'Architecture', exact: false },
] as const

export function DocsNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav className={cn('flex flex-col gap-1', className)}>
      {docsNav.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-sm transition-colors',
              isActive
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
