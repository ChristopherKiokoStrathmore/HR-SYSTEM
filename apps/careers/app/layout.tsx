import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Careers | Sheer Logic',
    template: '%s | Sheer Logic Careers',
  },
  description: 'Explore open roles at Sheer Logic Management Consultants and join a team shaping HR across East Africa.',
  icons: {
    icon: [
      { url: 'https://sheerlogicltd.com/wp-content/uploads/2024/08/fav.png' },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Header */}
        <header className="bg-surface border-b border-border sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/jobs" className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://sheerlogicltd.com/wp-content/uploads/2024/08/fav.png"
                alt="Sheer Logic"
                className="h-8 w-8 object-contain"
              />
              <div>
                <p className="text-sm font-bold text-text-primary leading-none">Sheer Logic</p>
                <p className="text-xs text-text-muted leading-none mt-0.5">Careers</p>
              </div>
            </a>
            <a
              href="https://sheerlogicltd.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-muted hover:text-accent transition-colors"
            >
              sheerlogicltd.com ↗
            </a>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>

        <footer className="border-t border-border mt-20">
          <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
            <span>© {new Date().getFullYear()} Sheer Logic Management Consultants Ltd. All rights reserved.</span>
            <a href="mailto:careers@sheerlogicltd.com" className="hover:text-accent transition-colors">
              careers@sheerlogicltd.com
            </a>
          </div>
        </footer>
      </body>
    </html>
  )
}
