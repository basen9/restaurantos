'use client'
import { useQuery } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import { formatDate } from '@/lib/utils'

export default function OwnerWastePage() {
  const { data: waste = [], isLoading } = useQuery({ queryKey: ['waste-all'], queryFn: () => fetch('/api/waste').then(r => r.json()) })
  if (isLoading) return <PageLoader />
  const list = Array.isArray(waste) ? waste : []

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const month = list.filter((w: any) => new Date(w.date) >= monthStart)
  const monthCost = month.reduce((s: number, w: any) => s + (w.totalCost || 0), 0)
  const byProduct: Record<string, number> = {}
  for (const w of month) byProduct[w.product] = (byProduct[w.product] || 0) + (w.totalCost || 0)
  const top = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Straty</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Zgłoszenia strat całego zespołu</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Straty (m-c)" value={`${monthCost.toFixed(0)} zł`} accent="red" />
        <StatCard label="Zgłoszeń (m-c)" value={month.length} />
        <StatCard label="Najgorszy produkt" value={top[0] ? top[0][0].slice(0, 14) : '—'} sub={top[0] ? `${top[0][1].toFixed(0)} zł` : undefined} />
      </div>
      {list.length === 0 ? <EmptyState icon="🗑️" text="Brak zgłoszeń strat" /> : (
        <div className="space-y-2">
          {list.slice(0, 30).map((w: any) => (
            <div key={w.id} className="card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#E8ECF0]">{w.product} <span className="text-xs text-[#6B7A8D]">· {w.quantity} {w.unit} · {w.reason}</span></div>
                <div className="text-[10px] text-[#6B7A8D]">{w.user?.name} · {formatDate(w.date)}</div>
              </div>
              <span className="text-sm font-semibold text-red-400">{w.totalCost?.toFixed(0)} zł</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
