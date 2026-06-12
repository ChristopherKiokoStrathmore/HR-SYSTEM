'use client'

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Legacy column definition — kept for backward-compat with existing pages
export interface Column<T> {
  key: string
  header: string
  width?: string
  render: (row: T) => React.ReactNode
}

// -----------------------------------------------------------------------
// Props union: accept EITHER the legacy Column<T>[] shape OR the new
// ColumnDef<T, any>[] shape from @tanstack/react-table directly.
// -----------------------------------------------------------------------
interface LegacyDataTableProps<T> {
  /** Legacy column format used by existing pages */
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (page: number) => void
  onRowClick?: (row: T) => void
  keyExtractor: (row: T) => string
  /** searchValue / searchColumn only used with TanStack columns */
  searchValue?: never
  searchColumn?: never
}

interface TanStackDataTableProps<T> {
  /** TanStack column format for new feature usage */
  columns: ColumnDef<T, any>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (page: number) => void
  onRowClick?: (row: T) => void
  keyExtractor?: (row: T) => string
  searchValue?: string
  searchColumn?: string
}

type DataTableProps<T> = LegacyDataTableProps<T> | TanStackDataTableProps<T>

// Detect whether the columns array uses the legacy Column<T> shape
function isLegacyColumns<T>(cols: Column<T>[] | ColumnDef<T, any>[]): cols is Column<T>[] {
  return cols.length === 0 || ('key' in cols[0] && 'render' in cols[0])
}

// Convert legacy Column<T> to TanStack ColumnDef<T, any>
function legacyToTanStack<T>(cols: Column<T>[]): ColumnDef<T, any>[] {
  return cols.map((col) => ({
    id: col.key,
    accessorKey: col.key as string & keyof T,
    header: col.header,
    // Legacy columns use a custom render fn; sorting on these columns is
    // disabled because we don't know the raw accessor type.
    enableSorting: false,
    cell: ({ row }: { row: { original: T } }) => col.render(row.original),
    ...(col.width ? { meta: { width: col.width } } : {}),
  }))
}

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    data,
    isLoading = false,
    emptyMessage = 'No records found.',
    page = 1,
    pageSize = 25,
    total = 0,
    onPageChange,
    onRowClick,
    searchValue,
    searchColumn,
  } = props

  // Normalise columns regardless of which format was passed
  const tanStackColumns: ColumnDef<T, any>[] = useMemo(() => {
    return isLegacyColumns(props.columns)
      ? legacyToTanStack(props.columns as Column<T>[])
      : (props.columns as ColumnDef<T, any>[])
  }, [props.columns])

  const [sorting, setSorting] = useState<SortingState>([])

  const columnFilters = useMemo(() => {
    if (searchValue && searchColumn) {
      return [{ id: searchColumn, value: searchValue }]
    }
    return []
  }, [searchValue, searchColumn])

  const table = useReactTable({
    data,
    columns: tanStackColumns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const totalPages = Math.ceil(total / pageSize)

  // Resolve key for a row: prefer keyExtractor prop, fall back to row index
  const getRowKey = (row: { original: T; index: number }): string => {
    const keyFn = (props as LegacyDataTableProps<T>).keyExtractor
    return keyFn ? keyFn(row.original) : String(row.index)
  }

  return (
    <div
      className="flex flex-col gap-0 rounded-2xl overflow-hidden bg-surface"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-[#F1F5F9] bg-[#F8FAFF]"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted whitespace-nowrap select-none"
                    style={{
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="opacity-40">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {isLoading ? (
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F1F5F9] last:border-0">
                  {tanStackColumns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div
                        className="skeleton h-4 rounded"
                        style={{ width: `${55 + ((i + j) * 17) % 35}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ) : data.length === 0 ? (
            <tbody>
              <tr>
                <td
                  colSpan={tanStackColumns.length}
                  className="px-4 py-16 text-center text-sm text-text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {table.getRowModel().rows.map((row, i) => (
                <motion.tr
                  key={getRowKey({ original: row.original, index: row.index })}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.025, 0.3), duration: 0.18 }}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'border-b border-[#F1F5F9] last:border-0 transition-colors duration-150 hover:bg-[#F8FAFF]',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-text-body">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination — only rendered when page info is provided */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#F1F5F9] bg-[#F8FAFF]">
          <p className="text-xs text-text-muted">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-border disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-text-muted px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded hover:bg-border disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
