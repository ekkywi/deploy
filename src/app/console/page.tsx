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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Overview
          </p>
          <h1 className="text-3xl font-medium tracking-[-0.04em] text-foreground lg:text-4xl">
            Welcome back, {user.firstName}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Keep team access, releases, and operational ownership aligned from a single surface.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/38 px-3 py-1.5 text-sm text-muted-foreground">
          <Clock3 className="size-4" aria-hidden />
          Session active
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-medium">Operator snapshot</CardTitle>
            <CardDescription>
              Current account context for the active console session.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/80 bg-muted/35 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                User
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
                  {user.firstName?.[0]}
                </span>
                <div>
                  <p className="font-medium">{fullName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-muted/35 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
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
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <UserIcon className="size-5 text-foreground" aria-hidden />
              Current Session
            </CardTitle>
            <CardDescription>
              Credentials loaded into the current browser session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.16em]">Email</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.16em]">Authorization level</p>
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
                className="w-full justify-start rounded-full" 
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
