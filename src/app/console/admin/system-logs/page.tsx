import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { GlobalRole } from '@prisma/client'
import { format } from 'date-fns'
import { ShieldAlert, Activity, Database, Server, User as UserIcon, Trash2, Edit, PlusCircle, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConsolePageHeader } from '@/components/layout/console-page-header'

function getActionBadge(action: string) {
  const upperAction = action.toUpperCase()
  if (upperAction.includes('CREATE') || upperAction.includes('ADD')) {
    return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><PlusCircle className="mr-1 size-3" /> {action}</Badge>
  }
  if (upperAction.includes('DELETE') || upperAction.includes('REMOVE')) {
    return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20"><Trash2 className="mr-1 size-3" /> {action}</Badge>
  }
  if (upperAction.includes('UPDATE') || upperAction.includes('EDIT')) {
    return <Badge className="bg-sky-500/10 text-sky-500 border-sky-500/20"><Edit className="mr-1 size-3" /> {action}</Badge>
  }
  return <Badge variant="secondary" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20"><Activity className="mr-1 size-3" /> {action}</Badge>
}

function getTargetIcon(targetType: string) {
  const type = targetType.toUpperCase()
  if (type === 'INFRASTRUCTURE' || type === 'WORKERNODE') return <Server className="size-4 text-zinc-400" />
  if (type === 'PROJECT' || type === 'ENVIRONMENT') return <Database className="size-4 text-zinc-400" />
  if (type === 'USER' || type === 'ROLE') return <UserIcon className="size-4 text-zinc-400" />
  return <ShieldAlert className="size-4 text-zinc-400" />
}

export default async function SystemLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const headersList = await headers()
  const dummyRequest = new Request('http://localhost', { headers: headersList })
  const auth = await requireAuth(dummyRequest)

  if (!auth.session) redirect('/login')
  if (auth.session.role !== GlobalRole.SYSADMIN) redirect('/console')

  const resolvedParams = await searchParams
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : ''
  const type = typeof resolvedParams.type === 'string' ? resolvedParams.type : 'ALL'
  const sort = resolvedParams.sort === 'asc' ? 'asc' : 'desc'
  
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page, 10) : 1
  const limit = 20
  const skip = (page - 1) * limit

  const whereClause = {
    AND: [
      q ? {
        OR: [
          { action: { contains: q, mode: 'insensitive' as const } },
          { targetId: { contains: q, mode: 'insensitive' as const } },
          { user: { email: { contains: q, mode: 'insensitive' as const } } }
        ]
      } : {},
      type !== 'ALL' ? { targetType: type } : {}
    ]
  }

  const [totalRecords, auditLogs] = await Promise.all([
    prisma.auditLog.count({ where: whereClause }),
    prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: sort },
      skip,
      take: limit,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } }
      }
    })
  ])

  const totalPages = Math.ceil(totalRecords / limit)

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (type !== 'ALL') params.set('type', type)
    if (sort === 'asc') params.set('sort', 'asc')
    if (page > 1) params.set('page', page.toString())
    
    params.set(name, value)
    return `?${params.toString()}`
  }

  return (
    <div className="space-y-4">
      <ConsolePageHeader title="Audit Logs" />

      <Card>
        <CardContent className="p-3">
          <form method="GET" className="flex flex-col items-end gap-2 sm:flex-row">
            <div className="w-full flex-1 space-y-1">
              <label htmlFor="q" className="text-xs text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
                <Input
                  id="q"
                  name="q"
                  defaultValue={q}
                  placeholder="Action, target ID, or email..."
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>

            <div className="w-full space-y-1 sm:w-48">
              <label htmlFor="type" className="text-xs text-muted-foreground">Target</label>
              <div className="relative">
                <Filter className="absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
                <select
                  id="type"
                  name="type"
                  defaultValue={type}
                  className="flex h-9 w-full rounded-md border border-input bg-background py-1 pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <option value="ALL">All types</option>
                  <option value="INFRASTRUCTURE">Infrastructure</option>
                  <option value="PROJECT">Project</option>
                  <option value="ENVIRONMENT">Environment</option>
                  <option value="USER">User</option>
                </select>
              </div>
            </div>

            <input type="hidden" name="sort" value={sort} />

            <Button type="submit" size="sm" className="h-9 w-full px-4 sm:w-auto">
              Apply
            </Button>

            {(q || type !== 'ALL') && (
              <Button type="button" variant="ghost" size="sm" className="h-9 w-full sm:w-auto" asChild>
                <Link href="/console/admin/system-logs">Reset</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Events</CardTitle>
              <CardDescription>
                Showing {auditLogs.length} of {totalRecords}
              </CardDescription>
            </div>

            <Button variant="outline" size="sm" asChild>
              <Link href={createQueryString('sort', sort === 'desc' ? 'asc' : 'desc')}>
                <ArrowUpDown className="mr-2 size-3.5" />
                {sort === 'desc' ? 'Newest first' : 'Oldest first'}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <ShieldAlert className="mb-3 size-8 text-muted-foreground/30" />
              <p className="text-sm font-medium">No audit logs found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adjust your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Time</th>
                    <th scope="col" className="px-4 py-3 font-medium">Actor</th>
                    <th scope="col" className="px-4 py-3 font-medium">Action</th>
                    <th scope="col" className="px-4 py-3 font-medium">Target</th>
                    <th scope="col" className="px-4 py-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLogs.map((log) => {
                    const meta = log.metadata as { projectName?: string; environmentName?: string } | null
                    const readableTargetName = meta?.projectName || meta?.environmentName

                    return (
                      <tr key={log.id} className="transition-colors hover:bg-accent/40">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">
                          {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                        </td>
                        <td className="px-4 py-3">
                          {log.user ? (
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {log.user.firstName} {log.user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{log.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">System</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getTargetIcon(log.targetType)}
                            <div>
                              <p className="text-xs font-medium text-foreground">
                                {log.targetType}
                                {readableTargetName ? (
                                  <span className="text-muted-foreground"> — {readableTargetName}</span>
                                ) : null}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground">{log.targetId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">
                          {log.ipAddress || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <p className="text-xs text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} asChild={page > 1}>
                {page > 1 ? (
                  <Link href={createQueryString('page', (page - 1).toString())}>
                    <ChevronLeft className="size-4" />
                  </Link>
                ) : (
                  <span><ChevronLeft className="size-4" /></span>
                )}
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} asChild={page < totalPages}>
                {page < totalPages ? (
                  <Link href={createQueryString('page', (page + 1).toString())}>
                    <ChevronRight className="size-4" />
                  </Link>
                ) : (
                  <span><ChevronRight className="size-4" /></span>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}