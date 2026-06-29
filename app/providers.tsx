'use client'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30000 } } }))
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="bottom-right" toastOptions={{
          style: { background: '#1A1D27', color: '#E8ECF0', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' },
          success: { iconTheme: { primary: '#22C55E', secondary: '#1A1D27' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#1A1D27' } },
        }} />
      </QueryClientProvider>
    </SessionProvider>
  )
}
