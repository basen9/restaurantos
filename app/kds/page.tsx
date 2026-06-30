'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { Clock, Utensils, Wine, ChevronRight } from 'lucide-react'

const jsonOk = (r: Response) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Błąd') }); return r.json() }
const COLS = [
  { status: 'PENDING', label: 'Oczekuje', next: 'PREPARING', nextLabel: 'Start' },
  { status: 'PREPARING', label: 'W przygotowaniu', next: 'READY', nextLabel: 'Gotowe' },
  { status: 'READY', label: 'Gotowe do wydania', next: 'SERVED', nextLabel: 'Wydane' },
]

export default function KdsPage() {
  const qc = useQueryClient()
  const { data: items = [], isLoading } = useQuery({ queryKey: ['kds'], queryFn: () => fetch('/api/kds').then((r) => r.json()), refetchInterval: 4000 })
  const bump = useMutation({
    mutationFn: ({ id, status }: any) => fetch(`/api/order-items/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(jsonOk),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kds'] }),
    onError: (e: any) => toast.error(e.message || 'Błąd'),
  })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(items) ? items : []

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Ekran kuchni (KDS)</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Kolejka zamówień na żywo — {list.length} pozycji</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLS.map((col) => {
          const colItems = list.filter((i: any) => i.status === col.status)
          return (
            <div key={col.status} className="card p-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#E8ECF0]">{col.label}</h2>
                <span className="text-xs text-[#6B7A8D]">{colItems.length}</span>
              </div>
              <div className="space-y-2 max-h-[72vh] overflow-y-auto">
                {colItems.length === 0 ? <div className="text-xs text-[#6B7A8D] py-4 text-center">—</div> : colItems.map((i: any) => {
                  const late = i.ageMin >= 20
                  return (
                    <div key={i.id} className="rounded-lg p-3 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: late ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#E8ECF0] text-sm flex items-center gap-1.5">{i.kind === 'DRINK' ? <Wine size={13} /> : <Utensils size={13} />}{i.quantity}× {i.name}</span>
                        <span className={`text-[11px] flex items-center gap-0.5 ${late ? 'text-red-400' : 'text-[#6B7A8D]'}`}><Clock size={10} /> {i.ageMin}m</span>
                      </div>
                      {i.notes && <div className="text-[11px] text-[#E8B923] mb-1">⚑ {i.notes}</div>}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#6B7A8D]">{i.zone ? `${i.zone} · ` : ''}{i.table}</span>
                        <button className="btn btn-ghost text-[11px] py-1 px-2" disabled={bump.isPending} onClick={() => bump.mutate({ id: i.id, status: col.next })}>{col.nextLabel} <ChevronRight size={11} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
