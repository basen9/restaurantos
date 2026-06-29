'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, BookOpen, Trash2, ChevronRight } from 'lucide-react'

export default function SopPage() {
  const qc = useQueryClient()
  const { data: session } = useSession()
  const isOwner = (session?.user as any)?.role === 'OWNER'
  const { data: docs = [], isLoading } = useQuery({ queryKey: ['sop'], queryFn: () => fetch('/api/sop').then(r => r.json()) })
  const [active, setActive] = useState<any>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'Ogólne', content: '' })

  const add = useMutation({
    mutationFn: (d: any) => fetch('/api/sop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('SOP dodane'); setShowAdd(false); setForm({ title: '', category: 'Ogólne', content: '' }); qc.invalidateQueries({ queryKey: ['sop'] }) },
    onError: () => toast.error('Błąd'),
  })
  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/sop/${id}`, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Usunięto'); setActive(null); qc.invalidateQueries({ queryKey: ['sop'] }) },
    onError: () => toast.error('Błąd'),
  })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(docs) ? docs : []

  if (active) {
    return (
      <div className="animate-fade-in max-w-2xl">
        <button onClick={() => setActive(null)} className="text-xs text-[#6B7A8D] hover:text-[#E8ECF0] mb-3">← Wróć</button>
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-2xl text-[#F5F0E8]">{active.title}</h1>
          {isOwner && <button className="btn btn-danger py-1.5 px-2 text-xs" onClick={() => del.mutate(active.id)}><Trash2 size={12} /></button>}
        </div>
        <div className="text-xs text-[#6B7A8D] mb-4">{active.category}</div>
        <div className="card p-5 text-sm text-[#E8ECF0] whitespace-pre-wrap leading-relaxed">{active.content}</div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">SOP — procedury</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Standardy i instrukcje pracy</p>
        </div>
        {isOwner && <button className="btn btn-gold" onClick={() => setShowAdd(true)}><Plus size={14} /> Nowe SOP</button>}
      </div>
      {list.length === 0 ? <EmptyState icon="📖" text="Brak procedur" sub={isOwner ? 'Dodaj pierwsze SOP' : 'Procedury pojawią się wkrótce'} /> : (
        <div className="space-y-2">
          {list.map((d: any) => (
            <button key={d.id} onClick={() => setActive(d)} className="w-full card p-4 flex items-center gap-3 text-left hover:bg-white/5 transition-all">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(232,185,35,0.1)' }}><BookOpen size={17} className="text-yellow-400" /></div>
              <div className="flex-1"><div className="text-sm font-medium text-[#E8ECF0]">{d.title}</div><div className="text-xs text-[#6B7A8D]">{d.category}</div></div>
              <ChevronRight size={15} className="text-[#6B7A8D]" />
            </button>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nowe SOP">
        <div className="space-y-3">
          <input className="input" placeholder="Tytuł (np. Otwarcie lokalu)" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <input className="input" placeholder="Kategoria" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
          <textarea className="input" rows={8} placeholder="Treść procedury…" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
          <button className="btn btn-gold w-full" disabled={!form.title || !form.content || add.isPending} onClick={() => add.mutate(form)}>Zapisz SOP</button>
        </div>
      </Modal>
    </div>
  )
}
