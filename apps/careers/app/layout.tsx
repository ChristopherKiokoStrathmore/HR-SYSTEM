import type { Metadata } from 'next'
import './globals.css'
import { TrackerButton } from '../components/tracker-button'

export const metadata: Metadata = {
  title: {
    default: 'Job Centre | Sheer Logic Management Consultants',
    template: '%s | Sheer Logic Job Centre',
  },
  description:
    'Find your next career opportunity. Sheer Logic connects talented professionals with leading organisations across Kenya, Uganda and Rwanda.',
  icons: {
    icon: [{ url: 'https://sheerlogicltd.com/wp-content/uploads/2024/08/fav.png' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* ── Header ── */}
        <header className="bg-surface border-b border-border sticky top-0 z-10 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-0 flex items-center justify-between">
            <a href="/jobs" className="flex items-center gap-3 py-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://sheerlogicltd.com/wp-content/uploads/2024/08/fav.png"
                alt="Sheer Logic"
                className="h-9 w-9 object-contain"
              />
              <div className="leading-tight">
                <p className="text-sm font-extrabold text-primary tracking-tight">Sheer Logic</p>
                <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest leading-none mt-0.5">
                  Management Consultants
                </p>
              </div>
            </a>

            <div className="flex items-center gap-3">
              <TrackerButton />
              <nav className="hidden sm:flex items-center gap-6 text-sm">
                <a href="/jobs" className="text-text-muted hover:text-accent transition-colors font-medium">
                  Job Centre
                </a>
                <a
                  href="https://sheerlogicltd.com/about/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-accent transition-colors font-medium"
                >
                  About Us
                </a>
                <a
                  href="mailto:careers@sheerlogicltd.com"
                  className="btn-primary text-xs py-2 px-4"
                >
                  Contact Us
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>

        {/* ── Footer ── */}
        <footer className="border-t border-border bg-surface mt-20">
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://sheerlogicltd.com/wp-content/uploads/2024/08/fav.png"
                    alt=""
                    className="h-7 w-7 object-contain"
                  />
                  <p className="text-sm font-bold text-primary">Sheer Logic</p>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  A global one-stop shop for all HR requirements — Staffing, Executive Search,
                  HR Outsourcing, Consulting and Training.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-text-primary uppercase tracking-widest">Services</p>
                {['Staff & Payroll Outsourcing', 'Executive Search', 'Training & Development', 'Background Checks'].map((s) => (
                  <a key={s} href="https://sheerlogicltd.com" target="_blank" rel="noopener noreferrer"
                     className="block text-xs text-text-muted hover:text-accent transition-colors">
                    {s}
                  </a>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-text-primary uppercase tracking-widest">Contact</p>
                <a href="mailto:careers@sheerlogicltd.com" className="block text-xs text-text-muted hover:text-accent transition-colors">
                  careers@sheerlogicltd.com
                </a>
                <a href="https://sheerlogicltd.com" target="_blank" rel="noopener noreferrer"
                   className="block text-xs text-text-muted hover:text-accent transition-colors">
                  sheerlogicltd.com
                </a>
              </div>
            </div>

            <div className="border-t border-border pt-6 text-center text-xs text-text-muted">
              © {new Date().getFullYear()} Sheer Logic Management Consultants Ltd. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
