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
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-[2rem] font-medium tracking-[-0.05em] text-foreground text-balance lg:text-[2.5rem]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-[0.9375rem] leading-6 text-muted-foreground/90 text-balance">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? <div className="flex items-center gap-3 lg:pb-1">{actions}</div> : null}
    </div>
  )
}
