'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  GitBranch,
  KeyRound,
  Link2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface SettingsTabProps {
  projectId: string
  currentUserId: string
  currentUserGlobalRole: 'SYSADMIN' | 'MANAGER' | 'DEVELOPER'
  projectMembers: { userId: string; role: 'OWNER' | 'EDITOR' | 'VIEWER' }[]
}

export function SettingsTab({
  projectId,
  currentUserId,
  currentUserGlobalRole,
  projectMembers,
}: SettingsTabProps) {
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null)
  const [isSecretLoading, setIsSecretLoading] = useState(false)
  const [isSecretVisible, setIsSecretVisible] = useState(false)
  const [isSecretCopied, setIsSecretCopied] = useState(false)
  const [isUrlCopied, setIsUrlCopied] = useState(false)
  const [isRotateDialogOpen, setIsRotateDialogOpen] = useState(false)
  const [isRotatingSecret, setIsRotatingSecret] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')

  const [gitTokenConfigured, setGitTokenConfigured] = useState(false)
  const [gitRepoSupportsHttpsToken, setGitRepoSupportsHttpsToken] = useState(true)
  const [isGitCredentialLoading, setIsGitCredentialLoading] = useState(false)
  const [gitTokenInput, setGitTokenInput] = useState('')
  const [isSavingGitToken, setIsSavingGitToken] = useState(false)
  const [isClearGitDialogOpen, setIsClearGitDialogOpen] = useState(false)
  const [isClearingGitToken, setIsClearingGitToken] = useState(false)

  const projectMembership = projectMembers.find((member) => member.userId === currentUserId)
  const canManageSecrets =
    currentUserGlobalRole === 'SYSADMIN' ||
    projectMembership?.role === 'OWNER' ||
    projectMembership?.role === 'EDITOR'
  const canManageWebhookSecret = canManageSecrets
  const canManageGitCredential = canManageSecrets
  const maskedSecret = webhookSecret
    ? `${webhookSecret.slice(0, 8)}${'*'.repeat(24)}${webhookSecret.slice(-8)}`
    : ''
  const displayedSecret = isSecretVisible ? webhookSecret : maskedSecret

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhooks/github/${projectId}`)
  }, [projectId])

  useEffect(() => {
    if (!canManageWebhookSecret || webhookSecret !== null) {
      return
    }

    let isActive = true

    const fetchWebhookSecret = async () => {
      setIsSecretLoading(true)

      try {
        const res = await fetch(`/api/projects/${projectId}/webhook-secret`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load webhook secret')

        if (isActive) {
          setWebhookSecret(data.webhookSecret ?? '')
        }
      } catch (error: unknown) {
        if (isActive) {
          toast.error(error instanceof Error ? error.message : 'Failed to load webhook secret')
        }
      } finally {
        if (isActive) {
          setIsSecretLoading(false)
        }
      }
    }

    void fetchWebhookSecret()

    return () => {
      isActive = false
    }
  }, [canManageWebhookSecret, projectId, webhookSecret])

  useEffect(() => {
    let isActive = true

    const fetchGitCredential = async () => {
      setIsGitCredentialLoading(true)
      try {
        const res = await fetch(`/api/projects/${projectId}/git-credential`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load git credential status')

        if (isActive) {
          setGitTokenConfigured(Boolean(data.configured))
          setGitRepoSupportsHttpsToken(data.repoSupportsHttpsToken !== false)
        }
      } catch (error: unknown) {
        if (isActive) {
          toast.error(
            error instanceof Error ? error.message : 'Failed to load git credential status'
          )
        }
      } finally {
        if (isActive) {
          setIsGitCredentialLoading(false)
        }
      }
    }

    void fetchGitCredential()

    return () => {
      isActive = false
    }
  }, [projectId])

  const handleCopyWebhookSecret = async () => {
    if (!webhookSecret) return

    try {
      await navigator.clipboard.writeText(webhookSecret)
      setIsSecretCopied(true)
      toast.success('Webhook secret copied')
      window.setTimeout(() => setIsSecretCopied(false), 3000)
    } catch {
      toast.error('Failed to copy webhook secret')
    }
  }

  const handleCopyWebhookUrl = async () => {
    if (!webhookUrl) return

    try {
      await navigator.clipboard.writeText(webhookUrl)
      setIsUrlCopied(true)
      toast.success('Webhook URL copied')
      window.setTimeout(() => setIsUrlCopied(false), 3000)
    } catch {
      toast.error('Failed to copy webhook URL')
    }
  }

  const handleRotateWebhookSecret = async () => {
    setIsRotatingSecret(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/webhook-secret`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to rotate webhook secret')

      setWebhookSecret(data.webhookSecret ?? '')
      setIsSecretVisible(false)
      setIsSecretCopied(false)
      setIsRotateDialogOpen(false)
      toast.success(data.message || 'Webhook secret rotated successfully')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to rotate webhook secret')
    } finally {
      setIsRotatingSecret(false)
    }
  }

  const handleSaveGitToken = async () => {
    const token = gitTokenInput.trim()
    if (token.length < 8) {
      toast.error('Token must be at least 8 characters')
      return
    }

    setIsSavingGitToken(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/git-credential`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save git token')

      setGitTokenConfigured(true)
      setGitTokenInput('')
      toast.success(data.message || 'Git HTTPS token saved')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save git token')
    } finally {
      setIsSavingGitToken(false)
    }
  }

  const handleClearGitToken = async () => {
    setIsClearingGitToken(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/git-credential`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to clear git token')

      setGitTokenConfigured(false)
      setGitTokenInput('')
      setIsClearGitDialogOpen(false)
      toast.success(data.message || 'Git HTTPS token removed')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear git token')
    } finally {
      setIsClearingGitToken(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium">Private Git access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="rounded-lg border border-border/70 bg-muted/18 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <GitBranch className="size-4 text-muted-foreground" />
                  <h3 className="text-[14px] font-medium tracking-[-0.01em]">HTTPS token</h3>
                  {isGitCredentialLoading ? (
                    <Badge variant="outline" className="gap-1.5 font-normal">
                      <Loader2 className="size-3 animate-spin" />
                      Checking…
                    </Badge>
                  ) : gitTokenConfigured ? (
                    <Badge variant="secondary" className="font-normal">
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      Not set
                    </Badge>
                  )}
                </div>
                <p className="max-w-2xl text-[13px] leading-5 text-muted-foreground/85">
                  Store a personal access token (or fine-grained PAT) for private{' '}
                  <code className="text-[12px]">https://</code> repositories. The token is
                  encrypted at rest and used when listing branches and cloning on the worker. It
                  is never shown again after save.
                </p>
                {!gitRepoSupportsHttpsToken ? (
                  <p className="max-w-2xl text-[13px] leading-5 text-amber-700 dark:text-amber-400">
                    This project&apos;s repository URL is not HTTP(S). Switch to an{' '}
                    <code className="text-[12px]">https://</code> URL to use a token (SSH deploy
                    keys come in a later phase).
                  </p>
                ) : null}
              </div>

              {canManageGitCredential && gitTokenConfigured ? (
                <Button
                  variant="outline"
                  className="w-full gap-2 sm:w-fit"
                  onClick={() => setIsClearGitDialogOpen(true)}
                  disabled={isClearingGitToken || isSavingGitToken}
                >
                  <Trash2 className="size-4" />
                  Clear token
                </Button>
              ) : null}
            </div>

            {canManageGitCredential ? (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder={
                    gitTokenConfigured
                      ? 'Enter a new token to replace the existing one'
                      : 'ghp_… or fine-grained PAT'
                  }
                  value={gitTokenInput}
                  onChange={(event) => setGitTokenInput(event.target.value)}
                  disabled={
                    isSavingGitToken || isClearingGitToken || !gitRepoSupportsHttpsToken
                  }
                  className="h-10 flex-1 font-mono text-[12px]"
                />
                <Button
                  className="w-full gap-2 sm:w-fit"
                  onClick={() => void handleSaveGitToken()}
                  disabled={
                    isSavingGitToken ||
                    isClearingGitToken ||
                    !gitRepoSupportsHttpsToken ||
                    gitTokenInput.trim().length < 8
                  }
                >
                  {isSavingGitToken ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  {gitTokenConfigured ? 'Replace token' : 'Save token'}
                </Button>
              </div>
            ) : (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-border/70 bg-background/55 p-4 text-[13px] leading-5 text-muted-foreground">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <p>
                  Git token controls are available to project owners, editors, and system admins.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-medium">Webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="rounded-lg border border-border/70 bg-muted/18 p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-muted-foreground" />
                <h3 className="text-[14px] font-medium tracking-[-0.01em]">Webhook URL</h3>
              </div>
              <p className="max-w-2xl text-[13px] leading-5 text-muted-foreground/85">
                Paste this URL into your GitHub repository webhook settings (Content type:{' '}
                <code className="text-[12px]">application/json</code>, event: push).
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="min-h-10 flex-1 break-all rounded-lg border border-border/70 bg-background/70 px-3 py-2 font-mono text-[12px] leading-6 text-muted-foreground">
                {webhookUrl || 'Resolving webhook URL…'}
              </code>
              <Button
                variant="outline"
                className="w-full gap-2 sm:w-fit"
                onClick={() => void handleCopyWebhookUrl()}
                disabled={!webhookUrl}
              >
                {isUrlCopied ? (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="size-4" />
                )}
                Copy URL
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/18 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-muted-foreground" />
                  <h3 className="text-[14px] font-medium tracking-[-0.01em]">Webhook Secret</h3>
                </div>
                <p className="max-w-2xl text-[13px] leading-5 text-muted-foreground/85">
                  Used to verify incoming repository webhook payloads for this project. Set the same
                  value as the GitHub webhook secret.
                </p>
              </div>

              {canManageWebhookSecret ? (
                <Button
                  variant="outline"
                  className="w-full gap-2 sm:w-fit"
                  onClick={() => setIsRotateDialogOpen(true)}
                  disabled={isSecretLoading || isRotatingSecret}
                >
                  <RefreshCw className="size-4" />
                  Roll Secret
                </Button>
              ) : null}
            </div>

            {canManageWebhookSecret ? (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <code className="min-h-10 flex-1 break-all rounded-lg border border-border/70 bg-background/70 px-3 py-2 font-mono text-[12px] leading-6 text-muted-foreground">
                  {isSecretLoading
                    ? 'Loading webhook secret...'
                    : displayedSecret || 'No webhook secret configured'}
                </code>

                <TooltipProvider>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-full sm:w-10"
                          onClick={handleCopyWebhookSecret}
                          disabled={isSecretLoading || !webhookSecret}
                          aria-label="Copy webhook secret"
                        >
                          {isSecretCopied ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy secret</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-full sm:w-10"
                          onClick={() => setIsSecretVisible((current) => !current)}
                          disabled={isSecretLoading || !webhookSecret}
                          aria-label={isSecretVisible ? 'Hide webhook secret' : 'Reveal webhook secret'}
                        >
                          {isSecretVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isSecretVisible ? 'Hide secret' : 'Reveal secret'}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-full sm:w-10"
                          onClick={() => setIsRotateDialogOpen(true)}
                          disabled={isSecretLoading || isRotatingSecret}
                          aria-label="Roll webhook secret"
                        >
                          {isRotatingSecret ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <RefreshCw className="size-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Roll secret</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
            ) : (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-border/70 bg-background/55 p-4 text-[13px] leading-5 text-muted-foreground">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <p>
                  Webhook secret controls are available to project owners, editors, and system
                  admins.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isRotateDialogOpen} onOpenChange={setIsRotateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Roll webhook secret?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing webhook deliveries signed with the current secret will fail after this
              change. Update the repository webhook configuration with the new secret after rolling
              it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRotatingSecret}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRotateWebhookSecret} disabled={isRotatingSecret}>
              {isRotatingSecret && <Loader2 className="mr-2 size-4 animate-spin" />}
              Roll Secret
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearGitDialogOpen} onOpenChange={setIsClearGitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear git HTTPS token?</AlertDialogTitle>
            <AlertDialogDescription>
              Branch listing and deploys for private repositories will fail until a new token is
              saved (or the repo is made public).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingGitToken}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearGitToken} disabled={isClearingGitToken}>
              {isClearingGitToken && <Loader2 className="mr-2 size-4 animate-spin" />}
              Clear token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
