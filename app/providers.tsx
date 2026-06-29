'use client'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  // Globalna siatka bezpieczeństwa: każdy błąd zapytania/mutacji, który zostanie rzucony,
  // pokazuje toast — koniec po cichu znikających błędów odczytu i zapisu.
  const [queryClient] = useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: () => toast.error('Nie udało się pobrać danych. Sprawdź połączenie i odśwież.'),
    }),
    mutationCache: new MutationCache({
      onError: (e: any) => toast.error(e?.message || 'Operacja nie powiodła się. Spróbuj ponownie.'),
    }),
    defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
  }))
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
