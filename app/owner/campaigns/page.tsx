'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { Plus, Send, Mail, MessageSquare, Bell } from 'lucide-react'

const jsonOk = (r: Response) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Błąd') }); return r.json() }
const CH: Record<string, { label: string; icon: any }> = { EMAIL: { label: 'E-mail', icon: Mail }, SMS: { label: 'SMS', icon: MessageSquare }, PUSH: { label: 'Push', icon: Bell } }
const empty = { name: '', channel: 'EMAIL', subject: '', message: '', tag: '', birthdayMonth: false, minVisits: '' }

export default function CampaignsPage() {
  const qc = useQueryClient()
  const { data: list = [], isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: () => fetch('/api/campaigns').then((r) => r.json()) })
  const [form, setForm] = useState<any>(null)

  const create = useMutation({
    mutationFn: (body: any) => fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOk),
    onSuccess: () => { toast.success('Kampania zapisana (szkic)'); setForm(null); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
    onError: (e: any) => toast.error(e.message),
  })
  const send = useMutation({
    mutationFn: (id: string) => fetch(`/api/campaigns/${id}/send`, { method: 'POST' }).then(jsonOk),
    onSuccess: (c: any) => { toast.success(`Wysłano do ${c.recipientCount} odbiorców (${c.provider})`); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <PageLoader />
  const items = Array.isArray(list) ? list : []

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div><h1 className="font-display text-2xl text-[#F5F0E8]">Kampanie CRM</h1><p className="text-sm text-[#6B7A8D] mt-0.5">E-mail / SMS / push do segmentów gości</p></div>
        <button className="btn btn-gold" onClick={() => setForm({ ...empty })}><Plus size={14} /> Kampania</button>
      </div>

      <p className="text-xs text-[#6B7A8D] mb-4">ℹ️ Wysyłka działa w trybie mock (raportuje liczbę odbiorców). Podłączenie realnego dostawcy (SendGrid/Twilio/FCM) nie wymaga zmian w kampaniach.</p>

      {items.length === 0 ? <EmptyState icon="📣" text="Brak kampanii" sub="Utwórz pierwszą kampanię do segmentu gości" /> : (
        <div className="space-y-2">
          {items.map((c: any) => {
            const Icon = CH[c.channel]?.icon || Mail
            return (
              <div key={c.id} className="card p-4 flex items-center gap-3">
                <Icon size={16} className="text-[#6B7A8D] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#E8ECF0]">{c.name}</div>
                  <div className="text-xs text-[#6B7A8D]">{CH[c.channel]?.label}{c.status === 'SENT' ? ` · wysłano do ${c.recipientCount} (${c.provider})` : ' · szkic'}</div>
                </div>
                <Badge variant={c.status === 'SENT' ? 'green' : 'gray'}>{c.status === 'SENT' ? 'Wysłana' : 'Szkic'}</Badge>
                {c.status !== 'SENT' && <button className="btn btn-ghost py-1.5 px-2.5 text-xs" disabled={send.isPending} onClick={() => { if (confirm('Wysłać kampanię?')) send.mutate(c.id) }}><Send size={13} /> Wyślij</button>}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title="Nowa kampania" size="lg">
        {form && (
          <div className="space-y-3">
            <input className="input" placeholder="Nazwa kampanii" value={form.name} onChange={(e) => setForm((s: any) => ({ ...s, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={form.channel} onChange={(e) => setForm((s: any) => ({ ...s, channel: e.target.value }))}>
                <option value="EMAIL">E-mail</option><option value="SMS">SMS</option><option value="PUSH">Push</option>
              </select>
              {form.channel === 'EMAIL' && <input className="input" placeholder="Temat" value={form.subject} onChange={(e) => setForm((s: any) => ({ ...s, subject: e.target.value }))} />}
            </div>
            <textarea className="input" rows={4} placeholder="Treść wiadomości" value={form.message} onChange={(e) => setForm((s: any) => ({ ...s, message: e.target.value }))} />
            <div className="text-xs font-semibold text-[#9AAAB8] uppercase tracking-wider">Segment (kryteria)</div>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Tag (np. VIP)" value={form.tag} onChange={(e) => setForm((s: any) => ({ ...s, tag: e.target.value }))} />
              <input className="input" type="number" placeholder="Min. wizyt" value={form.minVisits} onChange={(e) => setForm((s: any) => ({ ...s, minVisits: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#9AAAB8]"><input type="checkbox" checked={form.birthdayMonth} onChange={(e) => setForm((s: any) => ({ ...s, birthdayMonth: e.target.checked }))} /> Tylko urodziny w tym miesiącu</label>
            <button className="btn btn-gold w-full" disabled={!form.name || !form.message || create.isPending}
              onClick={() => create.mutate({ name: form.name, channel: form.channel, subject: form.subject || undefined, message: form.message, segment: { tag: form.tag || undefined, birthdayMonth: form.birthdayMonth || undefined, minVisits: form.minVisits ? parseInt(form.minVisits) : undefined } })}>
              {create.isPending ? 'Zapisywanie…' : 'Zapisz szkic'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
