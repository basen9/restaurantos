'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import toast from 'react-hot-toast'
import { ListChecks, Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChecklistsPage() {
  const qc = useQueryClient()
  const { data: templates = [], isLoading } = useQuery({ queryKey: ['checklists'], queryFn: () => fetch('/api/checklists').then(r => r.json()) })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const submit = useMutation({
    mutationFn: (payload: any) => fetch('/api/checklists/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Checklista wysłana ✅'); setActiveId(null); setChecked({}); qc.invalidateQueries({ queryKey: ['checklists'] }) },
    onError: () => toast.error('Błąd wysyłania'),
  })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(templates) ? templates : []
  const active = list.find((t: any) => t.id === activeId)

  if (active) {
    const items = active.items || []
    const doneCount = items.filter((i: any) => checked[i.id]).length
    return (
      <div className="animate-fade-in max-w-2xl">
        <button onClick={() => { setActiveId(null); setChecked({}) }} className="text-xs text-[#6B7A8D] hover:text-[#E8ECF0] mb-3">← Wróć</button>
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl text-[#F5F0E8]">{active.name}</h1>
          <span className="text-sm text-[#6B7A8D]">{doneCount}/{items.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-5">
          <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
        </div>
        <div className="space-y-2 mb-5">
          {items.map((it: any) => (
            <button key={it.id} onClick={() => setChecked(p => ({ ...p, [it.id]: !p[it.id] }))}
              className={cn('w-full card p-3 flex items-center gap-3 text-left transition-all', checked[it.id] && 'opacity-60')}>
              <div className={cn('w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0', checked[it.id] ? 'bg-yellow-400 border-yellow-400' : 'border-white/20')}>
                {checked[it.id] && <Check size={13} className="text-[#0F1117]" />}
              </div>
              <span className={cn('text-sm text-[#E8ECF0]', checked[it.id] && 'line-through')}>{it.text}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-gold w-full" disabled={doneCount === 0 || submit.isPending}
          onClick={() => submit.mutate({ templateId: active.id, completions: items.map((i: any) => ({ itemId: i.id, done: !!checked[i.id] })) })}>
          {submit.isPending ? 'Wysyłanie…' : 'Zatwierdź i wyślij'}
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Checklisty</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Procedury otwarcia, zamknięcia i kontroli</p>
      </div>
      {list.length === 0 ? <EmptyState icon="✅" text="Brak checklist" /> : (
        <div className="space-y-2">
          {list.map((t: any) => (
            <button key={t.id} onClick={() => setActiveId(t.id)} className="w-full card p-4 flex items-center gap-3 text-left hover:bg-white/5 transition-all">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(232,185,35,0.1)' }}><ListChecks size={17} className="text-yellow-400" /></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-[#E8ECF0]">{t.name}</div>
                <div className="text-xs text-[#6B7A8D]">{(t.items || []).length} pozycji</div>
              </div>
              <ChevronRight size={15} className="text-[#6B7A8D]" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
