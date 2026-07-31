'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { LogOut, Settings, User } from 'lucide-react'

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-7 gap-2 px-1 text-muted-foreground hover:text-foreground">
          <Avatar className="size-5">
            <AvatarFallback className="bg-accent text-[10px] font-medium text-foreground">
              {initials || <User className="size-3" />}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-xs sm:inline">
            {user.firstName}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <p className="pt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {user.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/console/profile">
            <Settings className="mr-2 size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">
          <LogOut className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
