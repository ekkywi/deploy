'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Layers, LayoutDashboard, Rocket, Users, Server, ShieldAlert, Triangle } from 'lucide-react'
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
    title: 'Deployments',
    url: '/console/deployments',
    icon: Rocket,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex h-12 flex-row items-center gap-0 border-b border-sidebar-border px-3 py-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <div className="flex items-center gap-2 font-medium text-sidebar-foreground">
          <Triangle className="size-4 fill-current" aria-hidden />
          <span className="text-sm tracking-tight group-data-[collapsible=icon]:hidden">
            Deploy
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="space-y-1">
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.url === '/console' ? pathname === item.url : pathname.startsWith(item.url)}
                    tooltip={item.title}
                    className="h-8 px-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!"
                  >
                    <Link href={item.url}>
                      <item.icon aria-hidden className="size-4 shrink-0 stroke-[1.5]" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.role === 'SYSADMIN' && (
          <SidebarGroup className="space-y-1">
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/console/admin/users')}
                    tooltip="Users"
                    className="h-8 px-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!"
                  >
                    <Link href="/console/admin/users">
                      <Users aria-hidden className="size-4 shrink-0 stroke-[1.5]" />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/console/admin/infrastructure')}
                    tooltip="Infrastructure"
                    className="h-8 px-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!"
                  >
                    <Link href="/console/admin/infrastructure">
                      <Server aria-hidden className="size-4 shrink-0 stroke-[1.5]" />
                      <span>Infrastructure</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/console/admin/system-logs')}
                    tooltip="Audit Logs"
                    className="h-8 px-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!"
                  >
                    <Link href="/console/admin/system-logs">
                      <ShieldAlert aria-hidden className="size-4 shrink-0 stroke-[1.5]" />
                      <span>Audit Logs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
