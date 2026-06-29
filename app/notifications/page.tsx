'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const typeIcon: Record<string, string> = { INFO:'🔔', SUCCESS:'✅', WARNING:'⚠️', ERROR:'❌', TASK:'📋', SCHEDULE:'📅', VACATION:'🏖️' }
const typeColor: Record<string, string> = { INFO:'border-blue-400', SUCCESS:'border-green-400', WARNING:'border-orange-400', ERROR:'border-red-400', TASK:'border-yellow-400', SCHEDULE:'border-purple-400', VACATION:'border-teal-400' }

export default function NotificationsPage() {
  const qc = useQueryClient()
  const { data: notifs = [], isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => fetch('/api/notifications').then(r => r.json()) })

  const markAllRead = useMutation({
    mutationFn: () => fetch('/api/notifications', { method: 'PATCH' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Wszystkie przeczytane') }
  })

  const unread = Array.isArray(notifs) ? notifs.filter((n:any) => !n.read) : []

  if (isLoading) return <PageLoader />

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Powiadomienia</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">{unread.length} nieprzeczytanych</p>
        </div>
        {unread.length > 0 && (
          <button className="btn btn-ghost text-sm" onClick={() => markAllRead.mutate()}><CheckCheck size={14} /> Przeczytaj wszystkie</button>
        )}
      </div>

      {!Array.isArray(notifs) || notifs.length === 0 ? (
        <EmptyState icon="🔔" text="Brak powiadomień" sub="Wszystkie powiadomienia pojawią się tutaj" />
      ) : (
        <div className="space-y-2">
          {notifs.map((n: any) => (
            <div key={n.id} className={cn('card p-4 flex gap-3 transition-all border-l-2', n.read ? 'opacity-60 border-transparent' : typeColor[n.type] || 'border-yellow-400')}>
              <div className="text-xl mt-0.5">{typeIcon[n.type] || '🔔'}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-[#E8ECF0] mb-0.5">{n.title}</div>
                <div className="text-xs text-[#6B7A8D]">{n.body}</div>
              </div>
              <div className="text-xs text-[#6B7A8D] flex-shrink-0">{new Date(n.createdAt).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
