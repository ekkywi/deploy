'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, KeyRound } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
    id: string,
    key: string,
    value: string,
    isSecret: boolean
}

export function EnvVarsManager({
    projectId,
    environmentId,
    initialVars
}: {
    projectId: string,
    environmentId: string,
    initialVars: EnvVar[]
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [deletingVar, setDeletingVar] = useState<EnvVar | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [key, setKey] = useState('')
    const [value, setValue] = useState('')

    const handleAdd = async () => {
        const trimmedKey = key.trim().toUpperCase()
        const trimmedValue = value.trim()

        if (!trimmedKey || !trimmedValue) return

        const isLocalhost = /localhost|127\.0\.0\.1/i.test(trimmedValue);
        if (isLocalhost) {
            toast.error("Cannot use 'localhost'. Use your server's actual LAN/Public IP address instead.");
            return;
        }

        setLoading(true)

        try {
            const res = await fetch(`/api/projects/${projectId}/environments/${environmentId}/variables`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: trimmedKey, value: trimmedValue, isSecret: false }),
            })

            const data = await res.json().catch(() => null)

            if (!res.ok) {
                throw new Error(data?.error || 'Failed to add variable.')
            }

            toast.success(data?.message || 'Variable added successfully.')
            setKey('')
            setValue('')
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Network error. Failed to reach the server.')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingVar) return

        setIsDeleting(true)

        try {
            const res = await fetch(`/api/projects/${projectId}/environments/${environmentId}/variables?varId=${deletingVar.id}`, {
                method: 'DELETE',
            })

            const data = await res.json().catch(() => null)

            if (!res.ok) {
                throw new Error(data?.error || 'Failed to delete variable.')
            }

            toast.success(data?.message || 'Variable deleted successfully.')
            setDeletingVar(null)
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete variable.')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <KeyRound className="size-5" /> Environment Variables
                </CardTitle>
                <CardDescription>
                    Provide environment variables required for this environment to build and run successfully.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Key</label>
                        <Input
                            placeholder="DATABASE_URL"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Value</label>
                        <Input
                            placeholder="postgresql://..."
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleAdd} disabled={loading || !key.trim() || !value.trim()}>
                        {loading && <Loader2 className="mr-1 size-4 animate-spin" />}
                        <Plus className="size-4 mr-1" /> Add
                    </Button>
                </div>

                <div className="rounded-md border">
                    {initialVars.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            No environment variables defined yet.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {initialVars.map((env) => (
                                <div key={env.id} className="flex items-center justify-between p-3 px-4">
                                    <div className="grid w-full grid-cols-2 gap-4 pr-4">
                                        <span className="font-mono text-sm font-medium">{env.key}</span>
                                        <span className="font-mono text-sm text-muted-foreground truncate">
                                            {env.isSecret ? '••••••••••••••••' : env.value}
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setDeletingVar(env)}
                                    >
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>

            <AlertDialog open={Boolean(deletingVar)} onOpenChange={(open) => !open && setDeletingVar(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Variable?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deletingVar ? (
                                <>
                                    This will permanently delete <strong>{deletingVar.key}</strong> from this
                                    environment. This action cannot be undone.
                                </>
                            ) : (
                                'This action cannot be undone.'
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Delete Variable
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
