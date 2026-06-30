'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'
import { Banknote, ArrowDownCircle, ArrowUpCircle, Lock } from 'lucide-react'

const jsonOk = (r: Response) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Błąd') }); return r.json() }

export default function CashPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['cash'], queryFn: () => fetch('/api/cash').then((r) => r.json()), refetchInterval: 15000 })
  const [openFloat, setOpenFloat] = useState('')
  const [mv, setMv] = useState({ type: 'OUT', amount: '', reason: '' })
  const [counted, setCounted] = useState('')

  const refresh = () => qc.invalidateQueries({ queryKey: ['cash'] })
  const open = useMutation({ mutationFn: (openingFloat: number) => fetch('/api/cash/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openingFloat }) }).then(jsonOk), onSuccess: () => { toast.success('Zmiana kasowa otwarta'); setOpenFloat(''); refresh() }, onError: (e: any) => toast.error(e.message) })
  const move = useMutation({ mutationFn: ({ id, body }: any) => fetch(`/api/cash/${id}/movement`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOk), onSuccess: () => { toast.success('Zapisano ruch gotówki'); setMv({ type: 'OUT', amount: '', reason: '' }); refresh() }, onError: (e: any) => toast.error(e.message) })
  const close = useMutation({ mutationFn: ({ id, body }: any) => fetch(`/api/cash/${id}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOk), onSuccess: () => { toast.success('Zmiana kasowa zamknięta'); setCounted(''); refresh() }, onError: (e: any) => toast.error(e.message) })

  if (isLoading) return <PageLoader />
  const open_ = data?.open
  const history = data?.history || []

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Kasa / rozliczenie zmiany</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Bilon, sprzedaż gotówką, wpłaty/wypłaty i różnica kasowa</p>
      </div>

      {!open_ ? (
        <div className="card p-5 mb-6">
          <div className="text-sm font-semibold text-[#E8ECF0] mb-3">Otwórz zmianę kasową</div>
          <div className="flex gap-2">
            <input className="input flex-1" type="number" step="0.01" placeholder="Bilon początkowy (zł)" value={openFloat} onChange={(e) => setOpenFloat(e.target.value)} />
            <button className="btn btn-gold" disabled={open.isPending} onClick={() => open.mutate(parseFloat(openFloat) || 0)}><Banknote size={14} /> Otwórz</button>
          </div>
        </div>
      ) : (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-[#E8ECF0]">Otwarta zmiana</div>
            <Badge variant="green">OTWARTA</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
            <div><div className="text-xs text-[#6B7A8D]">Bilon</div><div className="text-[#E8ECF0]">{open_.openingFloat.toFixed(2)} zł</div></div>
            <div><div className="text-xs text-[#6B7A8D]">Sprzedaż gotówką</div><div className="text-[#E8ECF0]">{open_.cashSales.toFixed(2)} zł</div></div>
            <div><div className="text-xs text-[#6B7A8D]">Wpłaty / wypłaty</div><div className="text-[#E8ECF0]">+{open_.paidIn.toFixed(2)} / −{open_.paidOut.toFixed(2)}</div></div>
            <div><div className="text-xs text-[#6B7A8D]">Oczekiwana gotówka</div><div className="text-[#E8B923] font-semibold">{open_.expectedCash.toFixed(2)} zł</div></div>
          </div>

          <div className="border-t border-white/5 pt-3 mb-3">
            <div className="text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider mb-2">Ruch gotówki</div>
            <div className="flex flex-wrap gap-2">
              <select className="input w-32" value={mv.type} onChange={(e) => setMv((s) => ({ ...s, type: e.target.value }))}>
                <option value="OUT">Wypłata</option>
                <option value="IN">Wpłata</option>
              </select>
              <input className="input w-28" type="number" step="0.01" placeholder="Kwota" value={mv.amount} onChange={(e) => setMv((s) => ({ ...s, amount: e.target.value }))} />
              <input className="input flex-1 min-w-[120px]" placeholder="Powód" value={mv.reason} onChange={(e) => setMv((s) => ({ ...s, reason: e.target.value }))} />
              <button className="btn btn-ghost" disabled={!mv.amount || move.isPending} onClick={() => move.mutate({ id: open_.id, body: { type: mv.type, amount: parseFloat(mv.amount), reason: mv.reason || undefined } })}>{mv.type === 'IN' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />} Dodaj</button>
            </div>
            {open_.movements?.length > 0 && (
              <div className="mt-2 space-y-1">
                {open_.movements.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between text-xs text-[#6B7A8D]"><span>{m.type === 'IN' ? 'Wpłata' : 'Wypłata'}{m.reason ? ` · ${m.reason}` : ''}</span><span className={m.type === 'IN' ? 'text-green-400' : 'text-red-400'}>{m.type === 'IN' ? '+' : '−'}{m.amount.toFixed(2)} zł</span></div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/5 pt-3">
            <div className="text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider mb-2">Zamknij zmianę</div>
            <div className="flex gap-2">
              <input className="input flex-1" type="number" step="0.01" placeholder="Policzona gotówka (zł)" value={counted} onChange={(e) => setCounted(e.target.value)} />
              <button className="btn btn-gold" disabled={!counted || close.isPending} onClick={() => close.mutate({ id: open_.id, body: { countedCash: parseFloat(counted) } })}><Lock size={14} /> Zamknij i rozlicz</button>
            </div>
            {counted !== '' && (
              <div className="text-xs mt-2 text-[#6B7A8D]">Przewidywana różnica: <span className={(parseFloat(counted) - open_.expectedCash) < 0 ? 'text-red-400' : 'text-green-400'}>{(parseFloat(counted) - open_.expectedCash).toFixed(2)} zł</span></div>
            )}
          </div>
        </div>
      )}

      <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-2">Historia zmian</div>
      {history.length === 0 ? <EmptyState icon="🧾" text="Brak zamkniętych zmian" /> : (
        <div className="space-y-2">
          {history.map((s: any) => (
            <div key={s.id} className="card p-3 flex items-center justify-between text-sm">
              <div>
                <div className="text-[#E8ECF0]">{s.closedAt ? new Date(s.closedAt).toLocaleString('pl-PL') : ''}</div>
                <div className="text-xs text-[#6B7A8D]">Oczekiwano {s.expectedCash?.toFixed(2)} zł · policzono {s.countedCash?.toFixed(2)} zł</div>
              </div>
              <Badge variant={Math.abs(s.variance || 0) < 0.01 ? 'green' : (s.variance || 0) < 0 ? 'red' : 'orange'}>{(s.variance || 0) >= 0 ? '+' : ''}{(s.variance || 0).toFixed(2)} zł</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
