'use client'
import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Msg = { role: 'user' | 'assistant'; content: string }

const suggestions = [
  '🥐 Jak przygotować croissanta krok po kroku?',
  '☕ Jak zgłosić awarię ekspresu do kawy?',
  '🔒 Jakie są procedury zamknięcia lokalu?',
  '📦 Jak prawidłowo przechowywać wypieki?',
  '🏥 Jakie są zasady HACCP w restauracji?',
  '🔄 Jak wygląda procedura zamiany zmian?',
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Cześć! Jestem asystentem Twojej restauracji 👋\n\nMogę odpowiadać na pytania o procedury, receptury, zasady HACCP i codzienną pracę. W czym mogę pomóc?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const history = messages.map(m => ({ role: m.role, content: m.content }))

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ message: msg, history }) })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Błąd połączenia. Spróbuj ponownie.' }]) }
    setLoading(false)
  }

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(168,85,247,0.15)',border:'1px solid rgba(168,85,247,0.3)'}}>
          <Bot size={20} className="text-purple-400" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-[#F5F0E8]">Asystent AI</h1>
          <p className="text-sm text-[#6B7A8D]">Pytaj o procedury, przepisy i zasady pracy</p>
        </div>
        <span className="ml-auto text-xs px-2.5 py-1 rounded-full text-purple-400" style={{background:'rgba(168,85,247,0.1)',border:'1px solid rgba(168,85,247,0.2)'}}>Claude AI</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="card flex flex-col" style={{height:'520px'}}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2 flex-shrink-0 mt-1" style={{background:'rgba(168,85,247,0.15)'}}>
                      <Bot size={14} className="text-purple-400" />
                    </div>
                  )}
                  <div className={cn('max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'text-[#0F1117] font-medium rounded-tr-sm' : 'text-[#E8ECF0] rounded-tl-sm'
                  )} style={m.role === 'user' ? {background:'#E8B923'} : {background:'#21253A'}}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2" style={{background:'rgba(168,85,247,0.15)'}}>
                    <Bot size={14} className="text-purple-400" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{background:'#21253A'}}>
                    <Loader2 size={16} className="text-purple-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>
            {/* Input */}
            <div className="p-4 border-t border-white/5 flex gap-3">
              <input className="input flex-1" placeholder="Zadaj pytanie..." value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }} disabled={loading} />
              <button className="btn btn-gold px-4" onClick={() => send()} disabled={!input.trim() || loading}>
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-4">Popularne pytania</div>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => send(s.slice(2))}
                className="w-full text-left p-3 rounded-xl text-xs text-[#9AAAB8] hover:text-[#E8ECF0] hover:bg-white/5 transition-all border border-transparent hover:border-white/10">
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
