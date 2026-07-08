import { useState } from "react"
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle
} from '@/components/ui/sheet'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { AdminUser } from "./columns"
import { Loader2 } from "lucide-react"

interface UserEditSheetProps {
    user: AdminUser | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: (updateUser: AdminUser) => void
}

export function UserEditSheet({ user, open, onOpenChange, onSuccess }: UserEditSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <UserEditSheetContent
            key={user ? `${user.id}:${user.firstName}:${user.lastName ?? ''}:${user.globalRole}` : 'none'}
            user={user}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        </Sheet>
      )
}

interface UserEditSheetContentProps {
    user: AdminUser | null
    onOpenChange: (open: boolean) => void
    onSuccess: (updateUser: AdminUser) => void
}

function UserEditSheetContent({ user, onOpenChange, onSuccess }: UserEditSheetContentProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        globalRole: user?.globalRole || 'DEVELOPER'
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setIsLoading(true)
        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Update failed')

            toast.success('User updated successfully.')
            onSuccess(data.user)
            onOpenChange(false)
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Update failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <SheetContent className="sm:max-w-[420px] flex flex-col">
            <SheetHeader className="pr-10">
              <SheetTitle>Edit User Profile</SheetTitle>
              <SheetDescription>
                  Modify access and basic information for {user?.email}
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1">
              <div className="flex-1 space-y-5 px-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="role">Access Level (Role)</Label>
                  <Select
                    value={formData.globalRole}
                    onValueChange={(value) => setFormData({ ...formData, globalRole: value })}
                  >
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                        <SelectItem value="DEVELOPER">DEVELOPER</SelectItem>
                        <SelectItem value="MANAGER">MANAGER</SelectItem>
                        <SelectItem value="SYSADMIN">SYSADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[12px] text-muted-foreground italic">
                  * SYSADMIN has full access to system settings and user management.
                  </p>
                </div>
              </div>

              <SheetFooter className="flex-row justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
      )
}
