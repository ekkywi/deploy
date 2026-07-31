'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Plus, Trash2, KeyRound } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type EnvVar = {
  id: string
  key: string
  value: string
  isSecret: boolean
}

export function EnvVarsManager({
  projectId,
  environmentId,
  initialVars,
}: {
  projectId: string
  environmentId: string
  initialVars: EnvVar[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deletingVar, setDeletingVar] = useState<EnvVar | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [isSecret, setIsSecret] = useState(false)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [dirtyHint, setDirtyHint] = useState(false)

  const handleAdd = async () => {
    const trimmedKey = key.trim().toUpperCase()
    const trimmedValue = value.trim()

    if (!trimmedKey || !trimmedValue) return

    const isLocalhost = /localhost|127\.0\.0\.1/i.test(trimmedValue)
    if (isLocalhost) {
      toast.error("Cannot use 'localhost'. Use your server's actual LAN/Public IP address instead.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${environmentId}/variables`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: trimmedKey, value: trimmedValue, isSecret }),
        }
      )

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to add variable.')
      }

      toast.success(data?.message || 'Variable added successfully.')
      setKey('')
      setValue('')
      setIsSecret(false)
      setDirtyHint(true)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Network error. Failed to reach the server.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingVar) return

    setIsDeleting(true)

    try {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${environmentId}/variables?varId=${deletingVar.id}`,
        { method: 'DELETE' }
      )

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete variable.')
      }

      toast.success(data?.message || 'Variable deleted successfully.')
      setDeletingVar(null)
      setDirtyHint(true)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete variable.')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" /> Environment Variables
        </CardTitle>
        <CardDescription>
          Variables injected at container runtime on the next deploy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {dirtyHint ? (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Variables changed. Redeploy this environment for changes to take effect.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Key</label>
            <Input
              placeholder="DATABASE_URL"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Value</label>
            <Input
              placeholder="postgresql://..."
              type={isSecret ? 'password' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant={isSecret ? 'secondary' : 'outline'}
              size="sm"
              className="h-9 w-full sm:w-auto"
              onClick={() => setIsSecret((prev) => !prev)}
            >
              {isSecret ? 'Secret' : 'Plain'}
            </Button>
          </div>
          <div className="flex items-end">
            <Button
              className="h-9 w-full sm:w-auto"
              onClick={() => void handleAdd()}
              disabled={loading || !key.trim() || !value.trim()}
            >
              {loading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Plus className="mr-1 size-4" />}
              Add
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          {initialVars.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No environment variables yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {initialVars.map((env) => {
                const revealed = revealedIds.has(env.id)
                const showValue = !env.isSecret || revealed

                return (
                  <div
                    key={env.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{env.key}</span>
                        {env.isSecret ? (
                          <Badge variant="outline" className="text-[10px]">
                            Secret
                          </Badge>
                        ) : null}
                      </div>
                      <span className="truncate font-mono text-sm text-muted-foreground">
                        {showValue ? env.value : '••••••••••••••••'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      {env.isSecret ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => toggleReveal(env.id)}
                          aria-label={revealed ? 'Hide value' : 'Reveal value'}
                        >
                          {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setDeletingVar(env)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog
        open={Boolean(deletingVar)}
        onOpenChange={(open) => !open && setDeletingVar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variable?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingVar ? (
                <>
                  This will permanently delete <strong>{deletingVar.key}</strong> from this
                  environment.
                </>
              ) : (
                'This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
