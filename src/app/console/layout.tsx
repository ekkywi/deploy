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
          <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-3 lg:px-4">
            <SidebarTrigger className="size-8" />
            <div className="min-w-0 flex-1" />
            <DashboardHeader />
          </header>
          <div className="min-w-0 flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-[1200px] min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
              <div className="min-w-0 w-full">{children}</div>
            </div>
          </div>
        </main>
      </SidebarProvider>
    </AuthGuard>
  )
}
