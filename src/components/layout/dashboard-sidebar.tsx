'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Layers, LayoutDashboard, Rocket, Users, Server, Box, ShieldAlert } from 'lucide-react'
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
    title: 'Environments',
    url: '/console/environments',
    icon: Box,
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
    <Sidebar collapsible='icon'>
      <SidebarHeader className="flex h-16 flex-col justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:px-1.5">
        <div className="flex items-center gap-3 font-medium text-sidebar-primary group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
            D
          </span>
          <span className="group-data-[collapsible=icon]:hidden">
            <span className="block text-[13px] tracking-[-0.02em]">Deploy</span>
            <span className="block text-[10px] font-normal text-muted-foreground/80">Control plane</span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup className='space-y-1'>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.url === '/console' ? pathname === item.url : pathname.startsWith(item.url)}
                    tooltip={item.title}
                    className="h-10 rounded-xl px-3 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!"
                  >
                    <Link href={item.url}>
                      <item.icon aria-hidden className="shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.role === 'SYSADMIN' && (
          <SidebarGroup className='space-y-1'>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/console/admin/users')}
                    tooltip="User Management"
                    className="h-10 rounded-xl px-3 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!"
                  >
                    <Link href="/console/admin/users">
                      <Users aria-hidden className="shrink-0" />
                      <span>User Management</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/console/admin/infrastructure')}
                    tooltip="Infrastructure"
                    className="h-10 rounded-xl px-3 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!"
                  >
                    <Link href="/console/admin/infrastructure">
                      <Server aria-hidden className="shrink-0" />
                      <span>Infrastructure</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/console/admin/system-logs')}
                    tooltip="System Logs"
                    className="h-10 rounded-xl px-3 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0!"
                  >
                    <Link href="/console/admin/system-logs">
                      <ShieldAlert aria-hidden className="shrink-0" />
                      <span>System Logs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="mt-auto px-2 pb-3 pt-6 group-data-[collapsible=icon]:hidden">
          <div className="rounded-2xl border border-sidebar-border bg-muted/40 p-4">
            <p className="text-[13px] font-medium text-foreground/90">Focused delivery</p>
            <p className="mt-1 text-[13px] leading-5 text-muted-foreground/80">
              Keep approvals, releases, and ownership visible from one operational workspace.
            </p>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}