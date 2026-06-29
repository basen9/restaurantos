'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import { Plus, X } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'

export default function InventoryPage() {
  const qc = useQueryClient()
  const { data: history = [], isLoading } = useQuery({ queryKey: ['inventory'], queryFn: () => fetch('/api/inventory').then(r => r.json()) })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => fetch('/api/products').then(r => r.json()) })
  const [batch, setBatch] = useState<any[]>([])
  const [row, setRow] = useState({ product: '', unit: 'szt', expected: '', actual: '' })

  const save = useMutation({
    mutationFn: (items: any[]) => fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Remanent zapisany ✅'); setBatch([]); qc.invalidateQueries({ queryKey: ['inventory'] }) },
    onError: () => toast.error('Błąd zapisu'),
  })

  const addRow = () => {
    if (!row.product || row.expected === '' || row.actual === '') return
    setBatch(p => [...p, { product: row.product, unit: row.unit, expected: parseFloat(row.expected), actual: parseFloat(row.actual) }])
    setRow({ product: '', unit: 'szt', expected: '', actual: '' })
  }

  if (isLoading) return <PageLoader />
  const list = Array.isArray(history) ? history : []

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Remanent</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Porównaj stan oczekiwany z rzeczywistym</p>
      </div>

      <div className="card p-5 mb-6">
        <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-4">Nowy spis</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          <input className="input col-span-2 sm:col-span-2" list="prods" placeholder="Produkt…" value={row.product} onChange={e => setRow(p => ({ ...p, product: e.target.value }))} />
          <datalist id="prods">{(products || []).map((p: any) => <option key={p.id} value={p.name} />)}</datalist>
          <input className="input" type="number" placeholder="Oczek." value={row.expected} onChange={e => setRow(p => ({ ...p, expected: e.target.value }))} />
          <input className="input" type="number" placeholder="Rzecz." value={row.actual} onChange={e => setRow(p => ({ ...p, actual: e.target.value }))} />
          <button className="btn btn-ghost" onClick={addRow}><Plus size={14} /></button>
        </div>
        {batch.length > 0 && (
          <>
            <div className="space-y-1.5 mb-3">
              {batch.map((b, i) => {
                const diff = b.actual - b.expected
                return (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-sm text-[#E8ECF0]">{b.product}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#9AAAB8]">{b.expected} → {b.actual} {b.unit}</span>
                      <Badge variant={diff < 0 ? 'red' : diff > 0 ? 'orange' : 'green'}>{diff > 0 ? '+' : ''}{diff}</Badge>
                      <button onClick={() => setBatch(p => p.filter((_, j) => j !== i))}><X size={13} className="text-[#6B7A8D]" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
            <button className="btn btn-gold w-full" disabled={save.isPending} onClick={() => save.mutate(batch)}>{save.isPending ? 'Zapisywanie…' : `Zapisz remanent (${batch.length})`}</button>
          </>
        )}
      </div>

      <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">Historia</div>
      {list.length === 0 ? <EmptyState icon="📦" text="Brak spisów remanentowych" /> : (
        <div className="space-y-2">
          {list.slice(0, 20).map((it: any) => (
            <div key={it.id} className="card p-3 flex items-center gap-3">
              <div className="flex-1"><span className="text-sm text-[#E8ECF0]">{it.product}</span> <span className="text-xs text-[#6B7A8D]">· {it.expected} → {it.actual} {it.unit}</span></div>
              <Badge variant={it.difference < 0 ? 'red' : it.difference > 0 ? 'orange' : 'green'}>{it.difference > 0 ? '+' : ''}{it.difference}</Badge>
              <span className="text-[10px] text-[#6B7A8D] w-12 text-right">{formatDateShort(it.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
