import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PwaProviders } from './providers'

export const metadata: Metadata = {
  title: {
    default: 'Sheer Logic HR',
    template: '%s | SL HR',
  },
  description: 'Employee self-service portal — Sheer Logic Management Consultants',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SL HR',
  },
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
    url: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#1A2E5A',
    'msapplication-tap-highlight': 'no',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1A2E5A' },
    { media: '(prefers-color-scheme: dark)', color: '#1A2E5A' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* iOS home screen icon */}
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />

        {/* iOS splash screens — navy background matches brand */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Prevent auto-detection links (phone numbers, etc.) */}
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />

        {/* Preconnect for fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <PwaProviders>{children}</PwaProviders>
      </body>
    </html>
  )
}
