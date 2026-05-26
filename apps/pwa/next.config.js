const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      // API calls: NetworkFirst
      {
        urlPattern: /^https?.*(\/api\/|supabase\.co)/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 200, maxAgeSeconds: 5 * 60 },
        },
      },
      // Static assets: CacheFirst
      {
        urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // Google Fonts
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      // Google Maps
      {
        urlPattern: /^https:\/\/maps\.googleapis\.com/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'google-maps',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
        },
      },
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  transpilePackages: ['@hr/shared', '@hr/i18n'],

  images: {
    formats: ['image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'sheerlogicltd.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), camera=(self), microphone=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // unsafe-eval needed by Next.js dev runtime; unsafe-inline for inline scripts
              // blob: for service worker registration
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com",
              // Service worker and workbox caching require worker-src blob:
              "worker-src 'self' blob:",
              "frame-src 'none'",
              "manifest-src 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
})

module.exports = nextConfig
