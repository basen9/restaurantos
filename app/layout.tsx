import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'
import { PwaProvider } from '@/components/pwa/PwaProvider'

export const metadata: Metadata = {
  title: 'RestaurantOS',
  description: 'AI Operating System dla gastronomii',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'RestaurantOS' },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0F1117',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-deep text-white font-sans antialiased">
        <Providers>{children}</Providers>
        <PwaProvider />
      </body>
    </html>
  )
}
