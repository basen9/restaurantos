'use client'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { QrCode, Copy, ExternalLink } from 'lucide-react'

// Kod QR + link do publicznego menu (gość skanuje przy stoliku).
export function QrMenuCard() {
  const { data: org } = useQuery({ queryKey: ['org'], queryFn: () => fetch('/api/org').then((r) => r.json()) })
  const [qr, setQr] = useState<string>('')
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    if (!org?.slug || typeof window === 'undefined') return
    const u = `${window.location.origin}/m/${org.slug}`
    setUrl(u)
    QRCode.toDataURL(u, { width: 220, margin: 1, color: { dark: '#0F1117', light: '#FFFFFF' } }).then(setQr).catch(() => {})
  }, [org?.slug])

  if (!org?.slug) return null
  return (
    <div className="card p-5 mb-6 flex flex-col sm:flex-row items-center gap-5">
      {qr ? <img src={qr} alt="Kod QR menu" className="w-32 h-32 rounded-lg bg-white p-1.5 flex-shrink-0" /> : <div className="w-32 h-32 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><QrCode className="text-[#6B7A8D]" /></div>}
      <div className="flex-1 min-w-0 text-center sm:text-left">
        <div className="text-sm font-semibold text-[#E8ECF0] flex items-center justify-center sm:justify-start gap-2"><QrCode size={15} className="text-[#E8B923]" /> Menu QR dla gości</div>
        <p className="text-xs text-[#6B7A8D] mt-1">Wydrukuj kod i postaw na stolikach — goście zobaczą aktualną kartę (tylko dostępne pozycje) bez instalacji aplikacji.</p>
        <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
          <code className="text-[11px] text-[#9AAAB8] bg-white/5 px-2 py-1 rounded truncate max-w-[200px]">{url}</code>
          <button aria-label="Kopiuj link" className="btn btn-ghost py-1.5 px-2 text-xs" onClick={() => { navigator.clipboard?.writeText(url); toast.success('Skopiowano link') }}><Copy size={13} /></button>
          <a className="btn btn-ghost py-1.5 px-2 text-xs" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /></a>
        </div>
      </div>
    </div>
  )
}
