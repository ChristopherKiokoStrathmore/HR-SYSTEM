export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal branded header */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Sheer Logic" className="h-8 w-auto" />
          <div>
            <p className="text-sm font-semibold text-text-primary leading-none">Sheer Logic</p>
            <p className="text-xs text-text-muted leading-none mt-0.5">Careers</p>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-10">{children}</main>
      <footer className="border-t border-border mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-xs text-text-muted">
          © {new Date().getFullYear()} Sheer Logic Management Consultants. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
