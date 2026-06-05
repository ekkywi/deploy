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
      <SidebarHeader className="h-14 lg:h-[60px] border-b border-sidebar-border flex flex-col justify-center px-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2 font-semibold text-sidebar-primary group-data-[collapsible=icon]:justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5 shrink-0"
            aria-hidden
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="text-base tracking-tight group-data-[collapsible=icon]:hidden">
            DEPLOY CONSOLE
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url}
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

        {user?.role === 'SYSADMIN' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/console/admin'}
                    tooltip="User Management"
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
      </SidebarContent>
    </Sidebar>
  )
}