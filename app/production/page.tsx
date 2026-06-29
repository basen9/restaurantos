'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import toast from 'react-hot-toast'
import { Plus, X, Croissant } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'

export default function ProductionPage() {
  const qc = useQueryClient()
  const { data: history = [], isLoading } = useQuery({ queryKey: ['production'], queryFn: () => fetch('/api/production?days=7').then(r => r.json()) })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => fetch('/api/products').then(r => r.json()) })
  const [batch, setBatch] = useState<any[]>([])
  const [row, setRow] = useState({ product: '', quantity: '', unit: 'szt' })

  const save = useMutation({
    mutationFn: (items: any[]) => fetch('/api/production', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Produkcja zapisana ✅'); setBatch([]); qc.invalidateQueries({ queryKey: ['production'] }) },
    onError: () => toast.error('Błąd zapisu'),
  })

  const addRow = () => {
    if (!row.product || !row.quantity) return
    setBatch(p => [...p, { product: row.product, quantity: parseInt(row.quantity), unit: row.unit }])
    setRow({ product: '', quantity: '', unit: 'szt' })
  }

  if (isLoading) return <PageLoader />
  const list = Array.isArray(history) ? history : []

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Produkcja</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Zarejestruj wypieki i przygotowane pozycje</p>
      </div>

      <div className="card p-5 mb-6">
        <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-4">Nowa produkcja</div>
        <div className="flex gap-2 mb-3 flex-wrap sm:flex-nowrap">
          <input className="input flex-1 min-w-[140px]" list="prods" placeholder="Produkt…" value={row.product} onChange={e => setRow(p => ({ ...p, product: e.target.value }))} />
          <datalist id="prods">{(products || []).map((p: any) => <option key={p.id} value={p.name} />)}</datalist>
          <input className="input w-20" type="number" min="0" placeholder="Ilość" value={row.quantity} onChange={e => setRow(p => ({ ...p, quantity: e.target.value }))} />
          <input className="input w-20" placeholder="szt" value={row.unit} onChange={e => setRow(p => ({ ...p, unit: e.target.value }))} />
          <button className="btn btn-ghost" onClick={addRow}><Plus size={14} /></button>
        </div>
        {batch.length > 0 && (
          <>
            <div className="space-y-1.5 mb-3">
              {batch.map((b, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-sm text-[#E8ECF0]">{b.product}</span>
                  <div className="flex items-center gap-2"><span className="text-xs text-[#9AAAB8]">{b.quantity} {b.unit}</span><button onClick={() => setBatch(p => p.filter((_, j) => j !== i))}><X size={13} className="text-[#6B7A8D]" /></button></div>
                </div>
              ))}
            </div>
            <button className="btn btn-gold w-full" disabled={save.isPending} onClick={() => save.mutate(batch)}>{save.isPending ? 'Zapisywanie…' : `Zapisz produkcję (${batch.length})`}</button>
          </>
        )}
      </div>

      <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">Ostatnie 7 dni</div>
      {list.length === 0 ? <EmptyState icon="🥐" text="Brak zarejestrowanej produkcji" /> : (
        <div className="space-y-2">
          {list.map((p: any) => (
            <div key={p.id} className="card p-3 flex items-center gap-3">
              <Croissant size={16} className="text-[#6B7A8D]" />
              <div className="flex-1"><span className="text-sm text-[#E8ECF0]">{p.product}</span> <span className="text-xs text-[#6B7A8D]">· {p.user?.name}</span></div>
              <span className="text-xs text-[#9AAAB8]">{p.quantity} {p.unit}</span>
              <span className="text-[10px] text-[#6B7A8D] w-12 text-right">{formatDateShort(p.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
