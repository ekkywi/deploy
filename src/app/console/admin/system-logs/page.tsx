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

  if (!auth.session) redirect('/auth/login')
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
    <div className="space-y-6">
      <ConsolePageHeader
        eyebrow="Security & Compliance"
        title="System Audit Logs"
        description="Immutable record of critical administrative actions across the platform."
      />

      <Card className="bg-muted/20 border-border/50">
        <CardContent className="p-4">
          <form method="GET" className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5 flex-1 w-full">
              <label htmlFor="q" className="text-[11px] font-medium uppercase text-muted-foreground tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input 
                  id="q"
                  name="q"
                  defaultValue={q}
                  placeholder="Search by action, target ID, or user email..."
                  className="pl-9 h-9 text-[13px] bg-background"
                />
              </div>
            </div>
            
            <div className="space-y-1.5 w-full sm:w-48">
              <label htmlFor="type" className="text-[11px] font-medium uppercase text-muted-foreground tracking-wider">Target Type</label>
              <div className="relative">
                <Filter className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <select 
                  id="type"
                  name="type"
                  defaultValue={type}
                  className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-[13px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="ALL">All Types</option>
                  <option value="INFRASTRUCTURE">Infrastructure</option>
                  <option value="PROJECT">Project</option>
                  <option value="ENVIRONMENT">Environment</option>
                  <option value="USER">User</option>
                </select>
              </div>
            </div>

            <input type="hidden" name="sort" value={sort} />
            
            <Button type="submit" size="sm" className="h-9 px-6 w-full sm:w-auto">
              Apply Filters
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
        <CardHeader className="border-b py-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-[15px] font-medium tracking-[-0.02em]">Activity Trails</CardTitle>
              <CardDescription className="text-[13px] leading-5">Showing {auditLogs.length} of {totalRecords} events.</CardDescription>
            </div>
            
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link href={createQueryString('sort', sort === 'desc' ? 'asc' : 'desc')}>
                <ArrowUpDown className="mr-2 size-3" />
                {sort === 'desc' ? 'Newest First' : 'Oldest First'}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {auditLogs.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
              <ShieldAlert className="mb-3 size-8 opacity-20" />
              <p className="text-[13px] font-medium text-foreground/85">No audit logs found.</p>
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground/85">
                Adjust your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted-foreground">
                <thead className="border-b bg-muted/50 text-xs uppercase text-foreground/70">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-medium">Timestamp</th>
                    <th scope="col" className="px-6 py-3 font-medium">Actor (User)</th>
                    <th scope="col" className="px-6 py-3 font-medium">Action</th>
                    <th scope="col" className="px-6 py-3 font-medium">Target</th>
                    <th scope="col" className="px-6 py-3 font-medium">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-[11px]">
                        {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4">
                        {log.user ? (
                          <div>
                            <p className="text-[13px] font-medium text-foreground">{log.user.firstName} {log.user.lastName}</p>
                            <p className="text-[11px] text-muted-foreground/70">{log.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-[12px] italic text-muted-foreground/60">System / Deleted User</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getTargetIcon(log.targetType)}
                          <div>
                            <p className="text-[12px] font-medium text-foreground">{log.targetType}</p>
                            <p className="font-mono text-[10px] text-muted-foreground/70">{log.targetId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-[11px]">
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                  ))}
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