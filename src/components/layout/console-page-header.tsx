'use client'

import type { ReactNode } from 'react'

type ConsolePageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function ConsolePageHeader({
  eyebrow,
  title,
  description,
  actions,
}: ConsolePageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-[1.875rem] font-medium tracking-[-0.045em] text-foreground text-balance lg:text-[2.25rem]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-[0.9rem] leading-6 text-muted-foreground/84 text-balance">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? <div className="flex items-center gap-3 lg:pb-1">{actions}</div> : null}
    </div>
  )
}
