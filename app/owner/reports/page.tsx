'use client'
import { useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'

const REPORTS = [
  { type: 'sales', label: 'Sprzedaż', desc: 'Transakcje w okresie', ranged: true },
  { type: 'waste', label: 'Straty', desc: 'Zgłoszenia strat w okresie', ranged: true },
  { type: 'foodcost', label: 'Food cost', desc: 'Koszt i marża per produkt', ranged: false },
  { type: 'inventory', label: 'Magazyn', desc: 'Aktualne stany i wartość', ranged: false },
]

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)

  const url = (type: string, ranged: boolean) => ranged ? `/api/reports/export?type=${type}&from=${from}&to=${to}` : `/api/reports/export?type=${type}`

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Raporty</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Eksport danych do CSV (Excel)</p>
      </div>

      <div className="card p-4 mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-wider">Zakres</span>
        <input type="date" className="input w-auto" value={from} onChange={e => setFrom(e.target.value)} />
        <span className="text-[#6B7A8D]">–</span>
        <input type="date" className="input w-auto" value={to} onChange={e => setTo(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REPORTS.map(r => (
          <a key={r.type} href={url(r.type, r.ranged)} className="card p-5 flex items-center gap-3 hover:bg-white/5 transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(232,185,35,0.1)' }}><FileSpreadsheet size={20} className="text-yellow-400" /></div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[#E8ECF0]">{r.label}</div>
              <div className="text-xs text-[#6B7A8D]">{r.desc}{r.ranged ? ' · wg zakresu' : ''}</div>
            </div>
            <Download size={16} className="text-[#6B7A8D]" />
          </a>
        ))}
      </div>
    </div>
  )
}
