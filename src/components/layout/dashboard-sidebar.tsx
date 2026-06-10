'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Layers, LayoutDashboard, Rocket, Users } from 'lucide-react'
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
    title: 'Projects & Nodes',
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
    <Sidebar collapsible='icon'>
      <SidebarHeader className="flex h-16 flex-col justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-3 font-medium text-sidebar-primary group-data-[collapsible=icon]:justify-center">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
            D
          </span>
          <span className="group-data-[collapsible=icon]:hidden">
            <span className="block text-sm tracking-tight">Deploy</span>
            <span className="block text-xs font-normal text-muted-foreground">Control plane</span>
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
                    className="h-10 rounded-xl px-3"
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

        {user?.role === 'SYSADMIN' && (
          <SidebarGroup className='space-y-1'>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith('/console/admin')}
                    tooltip="User Management"
                    className="h-10 rounded-xl px-3"
                  >
                    <Link href="/console/admin/users">
                      <Users aria-hidden />
                      <span>User Management</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="mt-auto px-2 pb-3 pt-6 group-data-[collapsible=icon]:hidden">
          <div className="rounded-2xl border border-sidebar-border bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">Focused delivery</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Keep approvals, releases, and ownership visible from one operational workspace.
            </p>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
