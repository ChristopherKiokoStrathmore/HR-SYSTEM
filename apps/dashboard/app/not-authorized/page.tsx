import Link from 'next/link'
import { ShieldOff } from 'lucide-react'

export default function NotAuthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
        <ShieldOff className="w-8 h-8 text-danger" />
      </div>
      <h1 className="text-2xl font-bold text-text-primary">Not Authorized</h1>
      <p className="text-text-muted mt-2 max-w-md">
        You don&apos;t have permission to view this page. If you believe this is a
        mistake, contact your company administrator to review your role.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Back to Dashboard
      </Link>
    </div>
  )
}
