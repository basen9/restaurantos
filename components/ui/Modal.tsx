'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Blokada przewijania tła, gdy modal otwarty.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}
         style={{background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)'}}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title"
           className={cn('card w-full p-6 animate-fade-in', widths[size])} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 id="modal-title" className="font-display text-xl text-[#F5F0E8]">{title}</h2>
          <button onClick={onClose} aria-label="Zamknij" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7A8D] hover:bg-white/5 hover:text-[#E8ECF0] transition-all">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
