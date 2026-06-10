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
        <main className="flex w-full flex-1 flex-col overflow-hidden bg-background">
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-border/80 bg-background/90 px-4 backdrop-blur lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Deploy Console
              </p>
              <p className="truncate text-sm text-foreground">Operational workspace</p>
            </div>
            <DashboardHeader />
          </header>
          <div className="flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-6 lg:px-6 lg:py-8">
              <div className="w-full rounded-[1.75rem] border border-border/70 bg-card/95 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <div className="p-5 lg:p-7">{children}</div>
              </div>
            </div>
          </div>
        </main>
      </SidebarProvider>
    </AuthGuard>
  )
}
