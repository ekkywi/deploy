import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <DashboardSidebar />
        <main className="flex min-w-0 w-full flex-1 flex-col overflow-hidden bg-background">
          <header className="sticky top-0 z-20 flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
            <SidebarTrigger className="size-7" />
            <div className="min-w-0 flex-1" />
            <Link
              href="/docs"
              className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <BookOpen className="size-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Docs</span>
            </Link>
            <DashboardHeader />
          </header>
          <div className="min-w-0 flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-[1400px] min-w-0 flex-1 px-4 py-4 sm:px-5 lg:px-6">
              <div className="min-w-0 w-full">{children}</div>
            </div>
          </div>
        </main>
      </SidebarProvider>
    </AuthGuard>
  )
}
