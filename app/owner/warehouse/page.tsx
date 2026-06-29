'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, PackagePlus, ShoppingCart, Truck } from 'lucide-react'

export default function WarehousePage() {
  const qc = useQueryClient()
  const { data: items = [], isLoading } = useQuery({ queryKey: ['inventory-items'], queryFn: () => fetch('/api/inventory-items').then(r => r.json()) })
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => fetch('/api/suppliers').then(r => r.json()) })
  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: () => fetch('/api/analytics').then(r => r.json()) })

  const [showAdd, setShowAdd] = useState(false)
  const [showSupplier, setShowSupplier] = useState(false)
  const [restockItem, setRestockItem] = useState<any>(null)
  const [form, setForm] = useState({ name: '', category: 'Surowce', unit: 'kg', stock: '', minStock: '', costPerUnit: '', supplierId: '' })
  const [sup, setSup] = useState({ name: '', contact: '', phone: '', email: '' })
  const [restock, setRestock] = useState({ quantity: '', unitCost: '' })

  const inv = (m: string) => qc.invalidateQueries({ queryKey: [m] })
  const addItem = useMutation({
    mutationFn: (d: any) => fetch('/api/inventory-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Pozycja dodana'); setShowAdd(false); setForm({ name: '', category: 'Surowce', unit: 'kg', stock: '', minStock: '', costPerUnit: '', supplierId: '' }); inv('inventory-items'); inv('analytics') },
    onError: () => toast.error('Błąd'),
  })
  const addSupplier = useMutation({
    mutationFn: (d: any) => fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Dostawca dodany'); setShowSupplier(false); setSup({ name: '', contact: '', phone: '', email: '' }); inv('suppliers') },
    onError: () => toast.error('Błąd'),
  })
  const doRestock = useMutation({
    mutationFn: ({ id, body }: any) => fetch(`/api/inventory-items/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Stan zaktualizowany'); setRestockItem(null); setRestock({ quantity: '', unitCost: '' }); inv('inventory-items'); inv('analytics') },
    onError: () => toast.error('Błąd'),
  })

  if (isLoading) return <PageLoader />
  const list = Array.isArray(items) ? items : []
  const orders = analytics?.ordering?.suggestions || []

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Magazyn</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Stany, dostawcy i sugestie zamówień</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => setShowSupplier(true)}><Truck size={14} /> Dostawca</button>
          <button className="btn btn-gold" onClick={() => setShowAdd(true)}><Plus size={14} /> Pozycja</button>
        </div>
      </div>

      {/* Do zamówienia */}
      {orders.length > 0 && (
        <div className="card p-5 mb-6" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
          <div className="flex items-center gap-2 mb-3"><ShoppingCart size={15} className="text-red-400" /><span className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Do zamówienia dziś</span><span className="text-[10px] text-[#6B7A8D]">· ~{analytics?.ordering?.totalCost} zł</span></div>
          <div className="space-y-1.5">
            {orders.map((o: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span className="text-sm text-[#E8ECF0]">{o.product} {o.supplier && <span className="text-xs text-[#6B7A8D]">· {o.supplier}</span>}</span>
                <span className="text-xs text-[#9AAAB8]">{o.quantity} {o.unit} (~{o.estCost} zł)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stany */}
      {list.length === 0 ? <EmptyState icon="📦" text="Brak pozycji magazynowych" sub="Dodaj pierwszą pozycję, aby śledzić stany i food cost" /> : (
        <div className="space-y-2">
          {list.map((it: any) => (
            <div key={it.id} className="card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#E8ECF0]">{it.name} <span className="text-xs text-[#6B7A8D]">· {it.category}</span></div>
                <div className="text-xs text-[#6B7A8D] mt-0.5">Stan: {it.stock} {it.unit} · min: {it.minStock} {it.unit} · {it.costPerUnit} zł/{it.unit}{it.supplier?.name ? ` · ${it.supplier.name}` : ''}</div>
              </div>
              {it.low && <Badge variant="red">niski stan</Badge>}
              <button className="btn btn-ghost py-1.5 px-2.5 text-xs" onClick={() => setRestockItem(it)}><PackagePlus size={13} /> Przyjmij</button>
            </div>
          ))}
        </div>
      )}

      {/* Modale */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nowa pozycja magazynowa">
        <div className="space-y-3">
          <input className="input" placeholder="Nazwa (np. Mąka pszenna)" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Kategoria" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
            <input className="input" placeholder="Jednostka (kg/l/szt)" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} />
            <input className="input" type="number" placeholder="Stan początkowy" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} />
            <input className="input" type="number" placeholder="Stan minimalny" value={form.minStock} onChange={e => setForm(p => ({ ...p, minStock: e.target.value }))} />
            <input className="input" type="number" placeholder="Cena zakupu / jedn." value={form.costPerUnit} onChange={e => setForm(p => ({ ...p, costPerUnit: e.target.value }))} />
            <select className="input" value={form.supplierId} onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}>
              <option value="">Dostawca (opcj.)</option>
              {(suppliers || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button className="btn btn-gold w-full" disabled={!form.name || addItem.isPending}
            onClick={() => addItem.mutate({ name: form.name, category: form.category, unit: form.unit, stock: parseFloat(form.stock) || 0, minStock: parseFloat(form.minStock) || 0, costPerUnit: parseFloat(form.costPerUnit) || 0, supplierId: form.supplierId || undefined })}>Dodaj pozycję</button>
        </div>
      </Modal>

      <Modal open={showSupplier} onClose={() => setShowSupplier(false)} title="Nowy dostawca">
        <div className="space-y-3">
          <input className="input" placeholder="Nazwa hurtowni" value={sup.name} onChange={e => setSup(p => ({ ...p, name: e.target.value }))} />
          <input className="input" placeholder="Osoba kontaktowa" value={sup.contact} onChange={e => setSup(p => ({ ...p, contact: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Telefon" value={sup.phone} onChange={e => setSup(p => ({ ...p, phone: e.target.value }))} />
            <input className="input" placeholder="E-mail" value={sup.email} onChange={e => setSup(p => ({ ...p, email: e.target.value }))} />
          </div>
          <button className="btn btn-gold w-full" disabled={!sup.name || addSupplier.isPending} onClick={() => addSupplier.mutate(sup)}>Dodaj dostawcę</button>
        </div>
      </Modal>

      <Modal open={!!restockItem} onClose={() => setRestockItem(null)} title={`Przyjęcie: ${restockItem?.name || ''}`}>
        <div className="space-y-3">
          <div className="text-xs text-[#6B7A8D]">Obecny stan: {restockItem?.stock} {restockItem?.unit}</div>
          <input className="input" type="number" placeholder={`Ilość przyjęcia (${restockItem?.unit})`} value={restock.quantity} onChange={e => setRestock(p => ({ ...p, quantity: e.target.value }))} />
          <input className="input" type="number" placeholder="Cena zakupu / jedn. (opcj.)" value={restock.unitCost} onChange={e => setRestock(p => ({ ...p, unitCost: e.target.value }))} />
          <button className="btn btn-gold w-full" disabled={!restock.quantity || doRestock.isPending}
            onClick={() => doRestock.mutate({ id: restockItem.id, body: { restock: parseFloat(restock.quantity), restockType: 'PURCHASE', ...(restock.unitCost ? { costPerUnit: parseFloat(restock.unitCost) } : {}) } })}>Przyjmij na magazyn</button>
        </div>
      </Modal>
    </div>
  )
}
