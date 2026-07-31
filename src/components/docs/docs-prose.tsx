import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function DocsProse({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <article
      className={cn(
        'max-w-3xl space-y-8 text-sm leading-6 text-muted-foreground',
        '[&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-foreground',
        '[&_h2]:mt-10 [&_h2]:scroll-mt-24 [&_h2]:border-t [&_h2]:border-border [&_h2]:pt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground',
        '[&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground',
        '[&_p]:text-muted-foreground',
        '[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5',
        '[&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5',
        '[&_li]:text-muted-foreground',
        '[&_strong]:font-medium [&_strong]:text-foreground',
        '[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-muted-foreground',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground',
        '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/40 [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-6 [&_pre]:text-foreground',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        '[&_table]:w-full [&_table]:border-collapse [&_table]:text-left',
        '[&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:font-medium [&_th]:text-foreground',
        '[&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
        className
      )}
    >
      {children}
    </article>
  )
}
