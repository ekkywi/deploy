'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'

const TIERS = ['ALL', 'DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const
const LIFECYCLES = ['ALL', 'ACTIVE', 'SUSPENDED', 'DELETING'] as const

export function EnvironmentsToolbar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const q = searchParams.get('q') ?? ''
  const tier = searchParams.get('tier') ?? 'ALL'
  const lifecycle = searchParams.get('lifecycle') ?? 'ALL'
  const [searchValue, setSearchValue] = useState(q)

  useEffect(() => {
    setSearchValue(q)
  }, [q])

  const updateParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === 'ALL') next.delete(key)
      else next.set(key, value)
    }
    const query = next.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname)
    })
  }

  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-center ${isPending ? 'opacity-70' : ''}`}
    >
      <Input
        type="search"
        placeholder="Search project or environment…"
        value={searchValue}
        className="h-8 max-w-sm text-xs"
        onChange={(event) => {
          const value = event.target.value
          setSearchValue(value)
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            updateParams({ q: value.trim() })
          }, 300)
        }}
      />
      <div className="flex flex-wrap gap-2">
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring/30"
          value={tier}
          onChange={(event) => updateParams({ tier: event.target.value })}
          aria-label="Filter by tier"
        >
          {TIERS.map((value) => (
            <option key={value} value={value}>
              {value === 'ALL' ? 'All tiers' : value.charAt(0) + value.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring/30"
          value={lifecycle}
          onChange={(event) => updateParams({ lifecycle: event.target.value })}
          aria-label="Filter by lifecycle"
        >
          {LIFECYCLES.map((value) => (
            <option key={value} value={value}>
              {value === 'ALL'
                ? 'All states'
                : value.charAt(0) + value.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
