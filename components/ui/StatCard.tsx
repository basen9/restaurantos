import { cn } from '@/lib/utils'

export function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: 'gold' | 'green' | 'red' | 'blue' }) {
  const colors: Record<string, string> = { gold: 'text-yellow-400', green: 'text-green-400', red: 'text-red-400', blue: 'text-blue-400' }
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">{label}</div>
      <div className={cn('text-3xl font-bold leading-none mb-1', accent ? colors[accent] : 'text-[#F5F0E8]')}>{value}</div>
      {sub && <div className="text-xs text-[#6B7A8D] mt-1">{sub}</div>}
    </div>
  )
}
