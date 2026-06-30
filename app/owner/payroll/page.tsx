'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import { Download } from 'lucide-react'

function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10) }
function today() { return new Date().toISOString().slice(0, 10) }

export default function PayrollPage() {
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const { data, isLoading } = useQuery({ queryKey: ['payroll', from, to], queryFn: () => fetch(`/api/reports/payroll?from=${from}&to=${to}`).then((r) => r.json()) })

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Płace</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Godziny i wynagrodzenie brutto z zakończonych zmian</p>
        </div>
        <a className="btn btn-ghost" href={`/api/reports/export?type=payroll&from=${from}&to=${to}`}><Download size={14} /> Eksport CSV</a>
      </div>

      <div className="flex gap-2 mb-6">
        <div><label className="block text-xs text-[#6B7A8D] mb-1">Od</label><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="block text-xs text-[#6B7A8D] mb-1">Do</label><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      {isLoading ? <PageLoader /> : !data?.rows?.length ? (
        <EmptyState icon="💸" text="Brak zakończonych zmian w okresie" sub="Płace liczone są z odbitych zmian (clock-in/out)" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Pracownicy" value={data.rows.length} />
            <StatCard label="Łączne godziny" value={`${data.totals.hours} h`} />
            <StatCard label="Łącznie brutto" value={`${data.totals.gross} zł`} accent="gold" />
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-[#6B7A8D] border-b border-white/5">
                <th className="p-3">Pracownik</th><th className="p-3">Zmiany</th><th className="p-3">Godziny</th><th className="p-3">Stawka</th><th className="p-3 text-right">Brutto</th>
              </tr></thead>
              <tbody>
                {data.rows.map((r: any) => (
                  <tr key={r.userId} className="border-b border-white/5">
                    <td className="p-3 text-[#E8ECF0]">{r.name}</td>
                    <td className="p-3 text-[#9AAAB8]">{r.shifts}</td>
                    <td className="p-3 text-[#9AAAB8]">{r.hours} h</td>
                    <td className="p-3 text-[#9AAAB8]">{r.hourlyRate} zł/h</td>
                    <td className="p-3 text-right text-[#E8B923] font-semibold">{r.gross} zł</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
