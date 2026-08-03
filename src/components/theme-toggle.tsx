'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const themes = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const

export function ThemeToggle({
  className,
  align = 'end',
}: {
  className?: string
  align?: 'start' | 'center' | 'end'
}) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const active = themes.find((item) => item.value === theme) ?? themes[0]
  const TriggerIcon =
    !mounted
      ? Monitor
      : theme === 'system'
        ? Monitor
        : resolvedTheme === 'dark'
          ? Moon
          : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'size-7 text-muted-foreground hover:text-foreground',
            className
          )}
          aria-label="Toggle theme"
        >
          <TriggerIcon className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[8.5rem]">
        {themes.map((item) => {
          const Icon = item.icon
          const isActive = mounted && active.value === item.value
          return (
            <DropdownMenuItem
              key={item.value}
              onSelect={() => setTheme(item.value)}
              className="cursor-pointer gap-2"
            >
              <Icon className="size-3.5" />
              <span className="flex-1">{item.label}</span>
              {isActive ? (
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  On
                </span>
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
