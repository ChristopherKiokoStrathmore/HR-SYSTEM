import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: {
    default: 'Sheer Logic HR System',
    template: '%s | Sheer Logic HR',
  },
  description: 'HR Lifecycle Management System by Sheer Logic Management Consultants',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      // Fallback to the live site favicon if the local file is unavailable
      { url: 'https://sheerlogicltd.com/wp-content/uploads/2024/08/fav.png' },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
