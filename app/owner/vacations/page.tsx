'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import { Check, X } from 'lucide-react'
import { formatDate, statusLabel } from '@/lib/utils'

export default function OwnerVacationsPage() {
  const qc = useQueryClient()
  const { data: vacations = [], isLoading } = useQuery({ queryKey: ['vacations'], queryFn: () => fetch('/api/vacations').then(r => r.json()) })

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => fetch(`/api/vacations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Zaktualizowano wniosek'); qc.invalidateQueries({ queryKey: ['vacations'] }) },
    onError: () => toast.error('Błąd'),
  })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(vacations) ? vacations : []
  const pending = list.filter((v: any) => v.status === 'PENDING')
  const rest = list.filter((v: any) => v.status !== 'PENDING')

  const Row = ({ v }: { v: any }) => (
    <div className="card p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#E8ECF0]">{v.user?.name} · {statusLabel(v.type)}</div>
        <div className="text-xs text-[#6B7A8D]">{formatDate(v.startDate)} – {formatDate(v.endDate)} · {v.days} dni{v.reason ? ` · ${v.reason}` : ''}</div>
      </div>
      {v.status === 'PENDING' ? (
        <div className="flex gap-2">
          <button className="btn btn-success py-1.5 px-2.5 text-xs" disabled={decide.isPending} onClick={() => decide.mutate({ id: v.id, status: 'APPROVED' })}><Check size={12} /> Zatwierdź</button>
          <button className="btn btn-danger py-1.5 px-2.5 text-xs" disabled={decide.isPending} onClick={() => decide.mutate({ id: v.id, status: 'REJECTED' })}><X size={12} /></button>
        </div>
      ) : (
        <Badge variant={v.status === 'APPROVED' ? 'green' : 'red'}>{statusLabel(v.status)}</Badge>
      )}
    </div>
  )

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Urlopy</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Wnioski urlopowe zespołu</p>
      </div>
      <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">Do rozpatrzenia ({pending.length})</div>
      {pending.length === 0 ? <EmptyState icon="✅" text="Brak wniosków do rozpatrzenia" /> : <div className="space-y-2 mb-6">{pending.map((v: any) => <Row key={v.id} v={v} />)}</div>}
      {rest.length > 0 && (<><div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">Historia</div><div className="space-y-2 opacity-70">{rest.map((v: any) => <Row key={v.id} v={v} />)}</div></>)}
    </div>
  )
}
