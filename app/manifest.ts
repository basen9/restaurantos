import type { MetadataRoute } from 'next'

// Web App Manifest — pozwala zainstalować RestaurantOS jako aplikację (PWA)
// na Androidzie i iPhone bez publikacji w sklepach.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RestaurantOS',
    short_name: 'RestaurantOS',
    description: 'AI Operating System dla gastronomii — plan sali, grafik, magazyn, AI COO.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0F1117',
    theme_color: '#0F1117',
    lang: 'pl',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
