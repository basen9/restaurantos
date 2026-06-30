'use client'
import { useQuery } from '@tanstack/react-query'

// Publiczne menu (skan QR przy stoliku) — mobile-first, bez logowania.
export default function PublicMenuPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-menu', slug],
    queryFn: () => fetch(`/api/public/menu/${slug}`).then((r) => { if (!r.ok) throw new Error('not found'); return r.json() }),
    retry: false,
  })

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-[#6B7A8D]">Ładowanie menu…</div>
  if (isError || !data) return <div className="min-h-screen flex items-center justify-center text-[#6B7A8D] px-6 text-center">Nie znaleziono menu tej restauracji.</div>

  return (
    <div className="min-h-screen bg-[#0F1117] text-[#E8ECF0] pb-16">
      <div className="max-w-lg mx-auto px-5 pt-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3" style={{ background: 'linear-gradient(135deg,#E8B923,#C49A1A)' }} />
          <h1 className="font-display text-3xl text-[#F5F0E8]">{data.restaurant}</h1>
          <p className="text-sm text-[#6B7A8D] mt-1">Menu</p>
        </div>
        {data.categories.length === 0 ? (
          <p className="text-center text-[#6B7A8D]">Menu jest obecnie niedostępne.</p>
        ) : (
          <div className="space-y-8">
            {data.categories.map((c: any) => (
              <div key={c.category}>
                <h2 className="text-xs font-semibold text-[#E8B923] uppercase tracking-widest mb-3 pb-1 border-b border-white/10">{c.category}</h2>
                <div className="space-y-3">
                  {c.items.map((it: any) => (
                    <div key={it.id} className="flex justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#F5F0E8]">{it.name}</div>
                        {it.description && <div className="text-xs text-[#6B7A8D] mt-0.5">{it.description}</div>}
                      </div>
                      <div className="text-sm text-[#E8B923] font-semibold whitespace-nowrap">{it.price?.toFixed ? it.price.toFixed(2) : it.price} zł</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-center text-[11px] text-[#3A4250] mt-12">RestaurantOS</p>
      </div>
    </div>
  )
}
