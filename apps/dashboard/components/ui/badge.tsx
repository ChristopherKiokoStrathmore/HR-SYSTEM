import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'primary' | 'accent' | 'muted'

const variants: Record<BadgeVariant, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  accent: 'bg-accent/10 text-accent border-accent/20',
  muted: 'bg-surface-alt text-text-muted border-border',
}

export function Badge({
  children,
  variant = 'muted',
  className,
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    active: 'success',
    on_leave: 'warning',
    suspended: 'warning',
    terminated: 'danger',
    resigned: 'danger',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'muted',
    verified: 'success',
    uploaded: 'primary',
    open: 'success',
    closed: 'muted',
    on_hold: 'warning',
    draft: 'muted',
    processing: 'accent',
    completed: 'success',
    failed: 'danger',
    paid: 'success',
    present: 'success',
    absent: 'danger',
    half_day: 'warning',
  }
  const labels: Record<string, string> = {
    active: 'Active', on_leave: 'On Leave', suspended: 'Suspended',
    terminated: 'Terminated', resigned: 'Resigned', pending: 'Pending',
    approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled',
    verified: 'Verified', uploaded: 'Uploaded', open: 'Open',
    closed: 'Closed', on_hold: 'On Hold', draft: 'Draft',
    processing: 'Processing', completed: 'Completed', failed: 'Failed',
    paid: 'Paid', present: 'Present', absent: 'Absent', half_day: 'Half Day',
  }
  return (
    <Badge variant={map[status] ?? 'muted'}>
      {labels[status] ?? status}
    </Badge>
  )
}
