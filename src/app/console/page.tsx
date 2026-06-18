'use client'

import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock3, LogOut, ShieldAlert, ShieldCheck, User as UserIcon } from 'lucide-react'

export default function DashboardPage() {
  const { user, logout } = useAuthStore()

  if (!user) return null

  const fullName = `${user.firstName} ${user.lastName || ''}`.trim()

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
            Overview
          </p>
          <h1 className="font-heading text-[2rem] font-medium tracking-[-0.05em] text-foreground text-balance lg:text-[2.5rem]">
            Welcome back, {user.firstName}
          </h1>
          <p className="max-w-2xl text-[0.9375rem] leading-6 text-muted-foreground/90 text-balance">
            Keep team access, releases, and operational ownership aligned from a single surface.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/32 px-3 py-1.5 text-xs text-muted-foreground/80">
          <Clock3 className="size-3.5" aria-hidden />
          Session active
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-[15px] font-medium tracking-[-0.02em]">Operator snapshot</CardTitle>
            <CardDescription className="text-sm leading-6">
              Current account context for the active console session.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/80 bg-muted/35 p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                User
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
                  {user.firstName?.[0]}
                </span>
                <div>
                  <p className="text-sm font-medium">{fullName}</p>
                  <p className="text-[13px] text-muted-foreground/80">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-muted/35 p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                Authorization
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant={user.role === 'SYSADMIN' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
                {user.role === 'SYSADMIN' ? (
                  <ShieldCheck className="size-4 text-emerald-600" aria-hidden />
                ) : (
                  <ShieldAlert className="size-4 text-amber-500" aria-hidden />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.02em]">
              <UserIcon className="size-[18px] text-foreground" aria-hidden />
              Current Session
            </CardTitle>
            <CardDescription className="text-sm leading-6">
              Credentials loaded into the current browser session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">Email</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">Authorization level</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={user.role === 'SYSADMIN' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
                {user.role === 'SYSADMIN' ? (
                  <ShieldCheck className="size-4 text-emerald-500" aria-hidden />
                ) : (
                  <ShieldAlert className="size-4 text-amber-500" aria-hidden />
                )}
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <Button 
                variant="outline" 
                className="w-full justify-start rounded-full text-sm" 
                onClick={logout}
              >
                <LogOut className="mr-2 size-4" aria-hidden />
                End Session
              </Button>
            </div>
            
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
