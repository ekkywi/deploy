'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Layers,
  LayoutDashboard,
  Rocket,
  Server,
  ShieldAlert,
  Triangle,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const navItems = [
  {
    title: 'Overview',
    url: '/console',
    icon: LayoutDashboard,
  },
  {
    title: 'Projects',
    url: '/console/projects',
    icon: Layers,
  },
  {
    title: 'Activity',
    url: '/console/deployments',
    icon: Rocket,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex h-11 flex-row items-center border-b border-sidebar-border p-2">
        <Link
          href="/console"
          className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm font-medium text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-2! group-data-[collapsible=icon]:px-0"
        >
          <Triangle className="size-4 shrink-0 fill-current" aria-hidden />
          <span className="truncate group-data-[collapsible=icon]:hidden">Deploy</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-2 py-2 group-data-[collapsible=icon]:overflow-visible">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.url === '/console'
                        ? pathname === item.url
                        : pathname.startsWith(item.url)
                    }
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon aria-hidden />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.role === 'SYSADMIN' ? (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/console/admin/users')}
                    tooltip="Users"
                  >
                    <Link href="/console/admin/users">
                      <Users aria-hidden />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/console/admin/infrastructure')}
                    tooltip="Infrastructure"
                  >
                    <Link href="/console/admin/infrastructure">
                      <Server aria-hidden />
                      <span>Infrastructure</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/console/admin/system-logs')}
                    tooltip="Audit Logs"
                  >
                    <Link href="/console/admin/system-logs">
                      <ShieldAlert aria-hidden />
                      <span>Audit Logs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
    </Sidebar>
  )
}
