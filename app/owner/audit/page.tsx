'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'

export default function AuditPage() {
  const [days, setDays] = useState(7)
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['audit', days], queryFn: () => fetch(`/api/audit?days=${days}`).then((r) => r.json()) })

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div><h1 className="font-display text-2xl text-[#F5F0E8]">Dziennik audytu</h1><p className="text-sm text-[#6B7A8D] mt-0.5">Ślad operacji wrażliwych — kto, co i kiedy</p></div>
        <select className="input w-32" value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
          <option value={1}>24 h</option><option value={7}>7 dni</option><option value={30}>30 dni</option>
        </select>
      </div>
      {isLoading ? <PageLoader /> : !Array.isArray(logs) || logs.length === 0 ? (
        <EmptyState icon="📜" text="Brak wpisów w dzienniku" />
      ) : (
        <div className="space-y-1.5">
          {logs.map((l: any) => (
            <div key={l.id} className="card p-3 flex items-center gap-3 text-sm">
              <code className="text-xs text-[#E8B923] flex-shrink-0 w-44 truncate">{l.action}</code>
              <span className="text-[#9AAAB8] flex-1 min-w-0 truncate">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(-6)}` : ''}{l.metadata ? ` · ${JSON.stringify(l.metadata).slice(0, 80)}` : ''}</span>
              <span className="text-xs text-[#6B7A8D] flex-shrink-0">{l.user}</span>
              <span className="text-xs text-[#6B7A8D] flex-shrink-0">{new Date(l.createdAt).toLocaleString('pl-PL')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
