'use client'
import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { getInitials, formatTime } from '@/lib/utils'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MessagesPage() {
  const { data: session } = useSession()
  const myId = (session?.user as any)?.id
  const qc = useQueryClient()
  const { data: messages = [], isLoading } = useQuery({ queryKey: ['messages'], queryFn: () => fetch('/api/messages').then(r => r.json()), refetchInterval: 15000 })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [text, setText] = useState('')

  // Grupowanie po rozmówcy.
  const convos = useMemo(() => {
    const map = new Map<string, { id: string; name: string; last: any }>()
    const list = Array.isArray(messages) ? messages : []
    for (const m of list) {
      const other = m.senderId === myId ? m.recipient : m.sender
      if (!other) continue
      map.set(other.id, { id: other.id, name: other.name, last: m })
    }
    return Array.from(map.values())
  }, [messages, myId])

  const thread = useMemo(() => (Array.isArray(messages) ? messages : []).filter((m: any) => m.senderId === activeId || m.recipientId === activeId), [messages, activeId])

  const send = useMutation({
    mutationFn: (payload: any) => fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['messages'] }) },
  })

  if (isLoading) return <PageLoader />
  const active = convos.find(c => c.id === activeId)

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Wiadomości</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Twoje rozmowy z zespołem</p>
      </div>

      {convos.length === 0 ? <EmptyState icon="💬" text="Brak wiadomości" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-1">
            {convos.map(c => (
              <button key={c.id} onClick={() => setActiveId(c.id)} className={cn('w-full card p-3 flex items-center gap-3 text-left transition-all', activeId === c.id ? 'border-yellow-400/30' : 'hover:bg-white/5')}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#0F1117] flex-shrink-0" style={{ background: 'linear-gradient(135deg,#E8B923,#C49A1A)' }}>{getInitials(c.name)}</div>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium text-[#E8ECF0]">{c.name}</div><div className="text-xs text-[#6B7A8D] truncate">{c.last?.content}</div></div>
              </button>
            ))}
          </div>

          <div className="sm:col-span-2 card flex flex-col" style={{ minHeight: 360 }}>
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-sm text-[#6B7A8D]">Wybierz rozmowę</div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-white/5 text-sm font-semibold text-[#E8ECF0]">{active.name}</div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {thread.map((m: any) => (
                    <div key={m.id} className={cn('flex', m.senderId === myId ? 'justify-end' : 'justify-start')}>
                      <div className="max-w-[75%] px-3 py-2 rounded-2xl text-sm" style={m.senderId === myId ? { background: '#E8B923', color: '#0F1117' } : { background: '#21253A', color: '#E8ECF0' }}>
                        {m.content}
                        <div className="text-[9px] opacity-60 mt-0.5">{formatTime(m.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-white/5 flex gap-2">
                  <input className="input flex-1" placeholder="Napisz wiadomość…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && text.trim()) send.mutate({ recipientId: active.id, content: text.trim() }) }} />
                  <button className="btn btn-gold" aria-label="Wyślij wiadomość" disabled={!text.trim() || send.isPending} onClick={() => send.mutate({ recipientId: active.id, content: text.trim() })}><Send size={14} /></button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
