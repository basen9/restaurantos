'use client'
import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { Sparkles, Send, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Co wymaga mojej uwagi dziś?',
  'Gdzie tracę najwięcej pieniędzy?',
  'Co powinienem dziś zamówić?',
  'Czy food cost jest pod kontrolą?',
]

type Msg = { role: 'user' | 'assistant'; content: string }

export default function CooPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const ask = useMutation({
    mutationFn: ({ mode, message, history }: any) =>
      fetch('/api/coo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, message, history }) }).then(r => r.json()),
    onSuccess: (data) => setMessages(m => [...m, { role: 'assistant', content: data.reply }]),
    onError: () => setMessages(m => [...m, { role: 'assistant', content: 'Przepraszam, spróbuj ponownie.' }]),
  })

  const send = (text: string, mode: 'chat' | 'review' = 'chat') => {
    const history = messages.slice(-10)
    if (mode === 'chat') setMessages(m => [...m, { role: 'user', content: text }])
    else setMessages(m => [...m, { role: 'user', content: '📋 Przegląd tygodnia' }])
    setInput('')
    ask.mutate({ mode, message: text, history })
  }

  return (
    <div className="animate-fade-in max-w-3xl flex flex-col" style={{ height: 'calc(100vh - 6.5rem)' }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8] flex items-center gap-2"><Sparkles size={18} className="text-yellow-400" /> AI COO</h1>
          <p className="text-sm text-[#6B7A8D] mt-0.5">Twój dyrektor operacyjny — zamienia dane w decyzje</p>
        </div>
        <button className="btn btn-ghost" onClick={() => send('', 'review')} disabled={ask.isPending}><FileText size={14} /> Przegląd tygodnia</button>
      </div>

      <div className="flex-1 overflow-y-auto card p-4 mb-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">🧠</div>
            <div className="text-sm text-[#6B7A8D] mb-5">Zapytaj o cokolwiek dotyczące Twojego biznesu — odpowiem na podstawie realnych danych.</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-[#9AAAB8] hover:bg-white/5 transition-all">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap')}
              style={m.role === 'user' ? { background: '#E8B923', color: '#0F1117' } : { background: '#21253A', color: '#E8ECF0' }}>
              {m.content}
            </div>
          </div>
        ))}
        {ask.isPending && <div className="flex justify-start"><div className="px-4 py-2.5 rounded-2xl text-sm" style={{ background: '#21253A' }}><span className="inline-block w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div></div>}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Zapytaj AI COO…" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim() && !ask.isPending) send(input.trim()) }} />
        <button className="btn btn-gold" disabled={!input.trim() || ask.isPending} onClick={() => send(input.trim())}><Send size={14} /></button>
      </div>
    </div>
  )
}
