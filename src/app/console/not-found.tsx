import Link from 'next/link'
import { ArrowLeft, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConsoleEmptyState } from '@/components/layout/console-empty-state'

export default function ConsoleNotFound() {
  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">404</p>
        <h1 className="mt-0.5 text-lg font-medium tracking-tight">Page not found</h1>
        <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
          This console route doesn&apos;t exist or the resource was removed.
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <ConsoleEmptyState
          icon={Layers}
          title="Nothing here"
          description="Check the URL, or head back to your projects and environments."
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/console">
            <ArrowLeft className="mr-1.5 size-3.5" />
            Overview
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/console/projects">Projects</Link>
        </Button>
      </div>
    </div>
  )
}
