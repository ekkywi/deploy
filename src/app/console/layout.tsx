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
        <main className="flex flex-1 flex-col overflow-hidden w-full bg-muted/20">
          <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
            
            <DashboardHeader />
            
          </header>
          <div className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </AuthGuard>
  )
}