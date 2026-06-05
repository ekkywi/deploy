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
import { LogOut, ShieldAlert, ShieldCheck, User as UserIcon } from 'lucide-react'

export default function DashboardPage() {
  const { user, logout } = useAuthStore()

  if (!user) return null

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Welcome back, {user.firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          This is your Control Plane control center.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <UserIcon className="size-5 text-primary" aria-hidden />
              Current Session
            </CardTitle>
            <CardDescription>
              Credential details stored in client memory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">EMAIL</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">AUTHORIZATION LEVEL</p>
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

            <div className="pt-4 border-t border-border mt-4">
              <Button 
                variant="destructive" 
                className="w-full justify-start" 
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