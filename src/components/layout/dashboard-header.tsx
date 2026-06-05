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
    <div className="flex items-center gap-4">
      <DropdownMenu>
        
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative size-8 rounded-full">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials || <User className="size-4" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium leading-none">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
                  {user.role}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={logout} 
            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
          >
            <LogOut className="mr-2 size-4" />
            <span>End Session</span>
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}