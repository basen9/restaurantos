'use client'
import { useQuery } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { getInitials } from '@/lib/utils'

export default function OwnerEmployeesPage() {
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: () => fetch('/api/users').then(r => r.json()) })
  if (isLoading) return <PageLoader />
  const list = Array.isArray(users) ? users : []

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Pracownicy</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Zespół Twojej organizacji ({list.length})</p>
      </div>
      {list.length === 0 ? <EmptyState icon="👥" text="Brak pracowników" /> : (
        <div className="space-y-2">
          {list.map((u: any) => (
            <div key={u.id} className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#0F1117] flex-shrink-0" style={{ background: 'linear-gradient(135deg,#E8B923,#C49A1A)' }}>{getInitials(u.name)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#E8ECF0]">{u.name}</div>
                <div className="text-xs text-[#6B7A8D]">{u.position || '—'} · {u.email}</div>
              </div>
              <Badge variant={u.role === 'OWNER' ? 'gold' : 'gray'}>{u.role === 'OWNER' ? 'Właściciel' : 'Pracownik'}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
