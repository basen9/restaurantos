'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, X, ScanLine, RefreshCw, CheckCircle2, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function InvoicesPage() {
  const qc = useQueryClient()
  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => fetch('/api/invoices').then(r => r.json()) })
  const { data: ksef } = useQuery({ queryKey: ['ksef'], queryFn: () => fetch('/api/ksef').then(r => r.json()) })
  const fileRef = useRef<HTMLInputElement>(null)

  const [showManual, setShowManual] = useState(false)
  const [head, setHead] = useState({ number: '', supplierName: '' })
  const [lines, setLines] = useState<any[]>([])
  const [row, setRow] = useState({ name: '', quantity: '', unit: 'kg', unitPrice: '' })

  const refresh = () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['inventory-items'] }); qc.invalidateQueries({ queryKey: ['analytics'] }) }

  const ksefSync = useMutation({
    mutationFn: () => fetch('/api/ksef', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: (d) => { toast.success(`KSeF: zaimportowano ${d.imported} faktur(y)`); qc.invalidateQueries({ queryKey: ['ksef'] }); refresh() },
    onError: (e: any) => toast.error(e.message || 'Błąd KSeF'),
  })
  const ocr = useMutation({
    mutationFn: (body: any) => fetch('/api/invoices/ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error) }); return r.json() }),
    onSuccess: () => { toast.success('Faktura odczytana — sprawdź dopasowania'); refresh() },
    onError: (e: any) => toast.error(e.message || 'Błąd OCR'),
  })
  const manual = useMutation({
    mutationFn: (body: any) => fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Faktura dodana'); setShowManual(false); setHead({ number: '', supplierName: '' }); setLines([]); refresh() },
    onError: () => toast.error('Błąd'),
  })
  const confirm = useMutation({
    mutationFn: (id: string) => fetch(`/api/invoices/${id}/confirm`, { method: 'POST' }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { toast.success('Zatwierdzono — zaktualizowano ceny i stany'); refresh() },
    onError: () => toast.error('Błąd zatwierdzania'),
  })

  const onFile = (f: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const res = String(reader.result)
      const base64 = res.split(',')[1]
      const mediaType = f.type === 'image/png' ? 'image/png' : f.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
      ocr.mutate({ image: base64, mediaType })
    }
    reader.readAsDataURL(f)
  }
  const addLine = () => {
    if (!row.name || !row.quantity || !row.unitPrice) return
    setLines(p => [...p, { name: row.name, quantity: parseFloat(row.quantity), unit: row.unit, unitPrice: parseFloat(row.unitPrice) }])
    setRow({ name: '', quantity: '', unit: 'kg', unitPrice: '' })
  }

  if (isLoading) return <PageLoader />
  const list = Array.isArray(invoices) ? invoices : []

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Faktury zakupowe</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">OCR, KSeF i automatyczna aktualizacja cen zakupu</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={ocr.isPending}><ScanLine size={14} /> {ocr.isPending ? 'Skanowanie…' : 'Skanuj (OCR)'}</button>
          <button className="btn btn-ghost" onClick={() => ksefSync.mutate()} disabled={ksefSync.isPending}><RefreshCw size={14} className={ksefSync.isPending ? 'animate-spin' : ''} /> KSeF</button>
          <button className="btn btn-gold" onClick={() => setShowManual(true)}><Plus size={14} /> Ręcznie</button>
        </div>
      </div>

      <div className="card p-3 mb-6 text-xs text-[#6B7A8D] flex items-center gap-2">
        <FileText size={14} /> KSeF: {ksef?.connected ? `połączony (${ksef.environment})` : 'tryb demo — generuje przykładowe faktury'}. Zatwierdzenie faktury aktualizuje ceny zakupu i stany magazynowe.
      </div>

      {list.length === 0 ? <EmptyState icon="🧾" text="Brak faktur" sub="Zeskanuj, zsynchronizuj KSeF lub dodaj ręcznie" /> : (
        <div className="space-y-3">
          {list.map((inv: any) => {
            const matchedCount = (inv.items || []).filter((i: any) => i.inventoryItemId).length
            return (
              <div key={inv.id} className="card p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="text-sm font-semibold text-[#E8ECF0]">{inv.supplierName || 'Dostawca'} {inv.number && <span className="text-xs text-[#6B7A8D]">· {inv.number}</span>}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="gray">{inv.source}</Badge>
                    {inv.status === 'CONFIRMED' ? <Badge variant="green"><CheckCircle2 size={11} /> Zatwierdzona</Badge> : <Badge variant="orange">Oczekuje</Badge>}
                  </div>
                </div>
                <div className="text-xs text-[#6B7A8D] mb-2">{inv.issueDate ? formatDate(inv.issueDate) : '—'} · {inv.total} zł · dopasowano {matchedCount}/{(inv.items || []).length} pozycji</div>
                <div className="space-y-1 mb-3">
                  {(inv.items || []).map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between text-xs">
                      <span className="text-[#E8ECF0]">{it.name} <span className="text-[#6B7A8D]">{it.quantity} {it.unit} × {it.unitPrice} zł</span></span>
                      {it.inventoryItemId ? <span className="text-green-400">→ {it.inventoryItem?.name || 'magazyn'}</span> : <span className="text-orange-400">brak dopasowania</span>}
                    </div>
                  ))}
                </div>
                {inv.status !== 'CONFIRMED' && (
                  <button className="btn btn-gold py-1.5 text-xs" disabled={confirm.isPending || matchedCount === 0} onClick={() => confirm.mutate(inv.id)}>
                    Zatwierdź i zaktualizuj ceny ({matchedCount})
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showManual} onClose={() => setShowManual(false)} title="Nowa faktura (ręcznie)">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Numer faktury" value={head.number} onChange={e => setHead(p => ({ ...p, number: e.target.value }))} />
            <input className="input" placeholder="Dostawca" value={head.supplierName} onChange={e => setHead(p => ({ ...p, supplierName: e.target.value }))} />
          </div>
          <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider">Pozycje</div>
          <div className="grid grid-cols-12 gap-2">
            <input className="input col-span-5" placeholder="Nazwa" value={row.name} onChange={e => setRow(p => ({ ...p, name: e.target.value }))} />
            <input className="input col-span-2" type="number" placeholder="Ilość" value={row.quantity} onChange={e => setRow(p => ({ ...p, quantity: e.target.value }))} />
            <input className="input col-span-2" placeholder="jedn." value={row.unit} onChange={e => setRow(p => ({ ...p, unit: e.target.value }))} />
            <input className="input col-span-2" type="number" placeholder="Cena" value={row.unitPrice} onChange={e => setRow(p => ({ ...p, unitPrice: e.target.value }))} />
            <button className="btn btn-ghost col-span-1" onClick={addLine}><Plus size={14} /></button>
          </div>
          {lines.length > 0 && (
            <div className="space-y-1.5">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-sm text-[#E8ECF0]">{l.name}</span>
                  <div className="flex items-center gap-2"><span className="text-xs text-[#9AAAB8]">{l.quantity} {l.unit} × {l.unitPrice} zł</span><button onClick={() => setLines(p => p.filter((_, j) => j !== i))}><X size={13} className="text-[#6B7A8D]" /></button></div>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-gold w-full" disabled={lines.length === 0 || manual.isPending} onClick={() => manual.mutate({ number: head.number || undefined, supplierName: head.supplierName || undefined, items: lines })}>Dodaj fakturę</button>
        </div>
      </Modal>
    </div>
  )
}
