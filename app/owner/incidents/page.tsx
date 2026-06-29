'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import { formatDate, statusLabel } from '@/lib/utils'

const NEXT: Record<string, string> = { OPEN: 'IN_PROGRESS', IN_PROGRESS: 'RESOLVED', RESOLVED: 'CLOSED' }
const NEXT_LABEL: Record<string, string> = { OPEN: 'Rozpocznij naprawę', IN_PROGRESS: 'Oznacz naprawione', RESOLVED: 'Zamknij' }

export default function OwnerIncidentsPage() {
  const qc = useQueryClient()
  const { data: incidents = [], isLoading } = useQuery({ queryKey: ['incidents-all'], queryFn: () => fetch('/api/incidents').then(r => r.json()) })

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => fetch(`/api/incidents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Status zaktualizowany'); qc.invalidateQueries({ queryKey: ['incidents-all'] }) },
    onError: () => toast.error('Błąd'),
  })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(incidents) ? incidents : []
  const variant = (s: string) => s === 'OPEN' ? 'red' : s === 'IN_PROGRESS' ? 'orange' : s === 'RESOLVED' ? 'green' : 'gray'

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Awarie</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Zgłoszenia sprzętu i infrastruktury</p>
      </div>
      {list.length === 0 ? <EmptyState icon="🔧" text="Brak zgłoszeń awarii" /> : (
        <div className="space-y-2">
          {list.map((inc: any) => (
            <div key={inc.id} className="card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#E8ECF0]">{inc.device} <span className="text-xs text-[#6B7A8D]">· {inc.category}</span></div>
                <div className="text-xs text-[#6B7A8D]">{inc.description?.slice(0, 90)} · {inc.user?.name} · {formatDate(inc.createdAt)}</div>
              </div>
              <Badge variant={variant(inc.status)}>{statusLabel(inc.status)}</Badge>
              {NEXT[inc.status] && (
                <button className="btn btn-ghost py-1.5 px-2.5 text-xs" disabled={update.isPending} onClick={() => update.mutate({ id: inc.id, status: NEXT[inc.status] })}>{NEXT_LABEL[inc.status]}</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
