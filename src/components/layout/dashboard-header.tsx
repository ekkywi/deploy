'use client'

import { useAuthStore } from '@/store/useAuthStore'
import { LogOut, User } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export function DashboardHeader() {
  const { user, logout } = useAuthStore()

  if (!user) return null

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()

  return (
    <div className="flex items-center gap-3">
      <div className="hidden rounded-md border border-border/60 bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground/78 sm:inline-flex">
        {user.role}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 px-1.5">
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                {initials || <User className="size-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-none">
                  {user.firstName} {user.lastName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium leading-none">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              <div className="pt-1">
                  <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/28 px-2 py-1 text-[10px] font-semibold tracking-wide text-foreground/90">
                  {user.role}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={logout} 
            variant="destructive"
            className="cursor-pointer"
          >
            <LogOut className="mr-2 size-4" />
            <span>End Session</span>
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
