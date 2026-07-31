'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { ConsolePageHeader } from '@/components/layout/console-page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ProfileFormState = {
  firstName: string
  lastName: string
  email: string
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })

  useEffect(() => {
    if (!user) return
    setProfileForm((current) => ({
      ...current,
      firstName: user.firstName,
      lastName: user.lastName || '',
      email: user.email,
    }))
  }, [user])

  if (!user) {
    return null
  }

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSavingProfile(true)

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim() || null,
          email: profileForm.email.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile.')
      }

      setUser(data.user)
      toast.success(data.message || 'Profile updated successfully.')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSavingPassword(true)

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profileForm.firstName.trim() || user.firstName,
          lastName: (profileForm.lastName.trim() || user.lastName) ?? null,
          email: profileForm.email.trim() || user.email,
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword,
          confirmNewPassword: profileForm.confirmNewPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.')
      }

      setUser(data.user)
      setProfileForm((current) => ({
        ...current,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }))
      toast.success(data.message || 'Password updated successfully.')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update password.')
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <ConsolePageHeader
        title="Profile"
        description="Update your account details and password."
      />

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-sm font-medium">Account details</CardTitle>
          <CardDescription className="text-xs">
            Role: <span className="uppercase tracking-wide">{user.role}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-4">
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={profileForm.firstName}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  required
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={profileForm.lastName}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  maxLength={50}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={isSavingProfile}>
                {isSavingProfile ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : null}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-sm font-medium">Change password</CardTitle>
          <CardDescription className="text-xs">
            Leave blank unless you want to set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-4">
          <form onSubmit={savePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={profileForm.currentPassword}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={profileForm.newPassword}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm new password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  value={profileForm.confirmNewPassword}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      confirmNewPassword: event.target.value,
                    }))
                  }
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={isSavingPassword}>
                {isSavingPassword ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : null}
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
