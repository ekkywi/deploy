'use client'

import * as React from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  SortingState,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Search, Inbox } from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  isLoading?: boolean
  searchPlaceholder?: string
  entityLabel?: string
  emptyTitle?: string
  emptyDescription?: string
}

function LoadingRows({ colCount }: { colCount: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colCount} className="px-4 py-2.5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-5 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-40" />
              </div>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Search records...',
  entityLabel = 'records',
  emptyTitle,
  emptyDescription,
}: DataTableProps<TData, TValue>) {
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [sorting, setSorting] = React.useState<SortingState>([])

  // TanStack Table intentionally returns functions; keep this boundary outside React Compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    initialState: {
      pagination: { pageSize: 10 },
    },
    state: {
      globalFilter,
      sorting,
    },
  })

  const filteredCount = table.getFilteredRowModel().rows.length
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const pageCount = table.getPageCount()
  const startRow = filteredCount === 0 ? 0 : pageIndex * pageSize + 1
  const endRow = Math.min((pageIndex + 1) * pageSize, filteredCount)

  return (
    <TooltipProvider>
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="border-b px-3 py-2.5">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-8 pl-8 text-sm shadow-none"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                    className="border-b hover:bg-transparent"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={`h-9 px-3 py-2 text-xs ${
                        header.id === 'actions' ? 'text-right' : ''
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <LoadingRows colCount={columns.length} />
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={`px-3 py-2 text-sm ${
                          cell.column.id === 'actions' ? 'text-right' : ''
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-36 px-4 py-3"
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                      <Inbox className="size-7 text-muted-foreground/45" />
                      <p className="text-sm font-medium text-foreground">
                        {emptyTitle ?? `No ${entityLabel} found`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {emptyDescription ?? 'Try adjusting your search'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 border-t px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {filteredCount === 0
              ? `No ${entityLabel} to display`
              : `Showing ${startRow}-${endRow} of ${filteredCount} ${entityLabel}`}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  )
}
