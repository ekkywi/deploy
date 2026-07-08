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
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 border-b border-border/70 bg-background/88 px-4 backdrop-blur-xl lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
                Deploy Console
              </p>
              <p className="truncate text-xs text-foreground/90">Operational workspace</p>
            </div>
            <DashboardHeader />
          </header>
          <div className="min-w-0 flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-1 px-4 py-5 sm:px-5 lg:px-8 lg:py-7">
              <div className="min-w-0 w-full">{children}</div>
            </div>
          </div>
        </main>
      </SidebarProvider>
    </AuthGuard>
  )
}
