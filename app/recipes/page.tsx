'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ChefHat, Clock, BookOpen } from 'lucide-react'

export default function CookRecipesPage() {
  const { data: recipes = [], isLoading } = useQuery({ queryKey: ['recipe-guides'], queryFn: () => fetch('/api/recipes/guides').then(r => r.json()) })
  const [open, setOpen] = useState<any>(null)
  if (isLoading) return <PageLoader />
  const list = Array.isArray(recipes) ? recipes : []

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[#F5F0E8]">Przepisy kulinarne</h1>
        <p className="text-sm text-[#6B7A8D] mt-0.5">Pełne przepisy udostępnione przez właściciela ({list.length})</p>
      </div>

      {list.length === 0 ? (
        <EmptyState icon="👨‍🍳" text="Brak udostępnionych przepisów" sub="Właściciel decyduje, które pełne przepisy są dla Ciebie widoczne" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {list.map((r: any) => (
            <button key={r.id} onClick={() => setOpen(r)} className="card p-4 text-left hover:bg-white/5 transition-all">
              <div className="text-sm font-semibold text-[#E8ECF0] flex items-center gap-2 mb-2"><ChefHat size={15} className="text-[#6B7A8D]" /> {r.product?.name}</div>
              <div className="flex items-center gap-3 text-xs text-[#6B7A8D]">
                {r.prepTimeMin ? <span className="flex items-center gap-1"><Clock size={12} /> {r.prepTimeMin} min</span> : null}
                {Array.isArray(r.allergens) && r.allergens.length > 0 && <Badge variant="orange">{r.allergens.length} alergenów</Badge>}
                {r.instructions ? <span className="flex items-center gap-1"><BookOpen size={12} /> przepis</span> : <span>brak opisu</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.product?.name || 'Przepis'} size="lg">
        {open && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {open.prepTimeMin ? <Badge variant="gray"><Clock size={11} /> {open.prepTimeMin} min</Badge> : null}
              {(open.allergens || []).map((a: string) => <Badge key={a} variant="orange">{a}</Badge>)}
            </div>
            {open.photos?.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {open.photos.map((p: string, i: number) => <img key={i} src={p} alt="" className="rounded-lg w-full object-cover max-h-40" />)}
              </div>
            )}
            {open.instructions && (
              <div><div className="text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider mb-1.5">Przygotowanie</div>
                <div className="text-sm text-[#E8ECF0] whitespace-pre-wrap">{open.instructions}</div></div>
            )}
            {open.chefTips && (
              <div><div className="text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider mb-1.5">Wskazówki</div>
                <div className="text-sm text-[#E8ECF0] whitespace-pre-wrap">{open.chefTips}</div></div>
            )}
            {open.cookNotes && (
              <div><div className="text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider mb-1.5">Notatki</div>
                <div className="text-sm text-[#9AAAB8] whitespace-pre-wrap italic">{open.cookNotes}</div></div>
            )}
            {!open.instructions && !open.chefTips && <div className="text-sm text-[#6B7A8D]">Ten przepis nie ma jeszcze opisu.</div>}
          </div>
        )}
      </Modal>
    </div>
  )
}
