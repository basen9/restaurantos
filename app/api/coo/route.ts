export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { cooSchema } from '@/lib/validation'
import { getBusinessSnapshot, type BusinessSnapshot } from '@/lib/insights'

const SYSTEM = `Jesteś AI COO (dyrektorem operacyjnym) sieci gastronomicznej. Twoim zadaniem jest zamieniać dane w DECYZJE biznesowe.
Zasady:
- Odpowiadaj po polsku, zwięźle i konkretnie, jak doświadczony COO.
- Opieraj się WYŁĄCZNIE na dostarczonych danych (snapshot). Nie zmyślaj liczb.
- Każdą obserwację łącz z REKOMENDACJĄ i szacowanym wpływem finansowym, gdy to możliwe.
- Gdy danych brakuje (np. sprzedaż z POS), powiedz to wprost i zaproponuj integrację.
- Format: krótkie akapity lub punkty. Najpierw najważniejsze.`

// Deterministyczny przegląd/rekomendacje z danych (gdy brak klucza API lub jako fallback).
function ruleBasedReview(s: BusinessSnapshot): string {
  const out: string[] = []
  out.push(`📊 Przegląd operacyjny — ${s.date}`)
  if (s.finance.posConnected && s.finance.salesToday != null)
    out.push(`• Sprzedaż dziś: ${s.finance.salesToday} zł · zysk po koszcie surowca ~${s.finance.profitToday} zł · marża ${s.finance.marginPct}% · food cost ${s.finance.foodCostActualPct}% · koszt pracy ${s.finance.laborCostPct ?? '—'}%.`)
  else
    out.push('• Sprzedaż: brak danych POS — podłącz POS, by śledzić przychód, marżę i rzeczywisty food cost.')
  if (s.variance.length)
    out.push(`• Wariancja zużycia: ${s.variance[0].name} — z magazynu zeszło o ${s.variance[0].variance} ${s.variance[0].unit} więcej niż wynika ze sprzedaży (~${s.variance[0].varianceCost} zł). Sprawdź nadprodukcję/straty/porcjowanie.`)
  if (s.inventory.lowStock.length)
    out.push(`• Zaopatrzenie: ${s.inventory.lowStock.length} pozycji poniżej minimum (szac. zamówienie ~${s.inventory.orderTotal} zł). Złóż zamówienie dziś, by uniknąć braków: ${s.inventory.lowStock.map((i) => i.name).join(', ')}.`)
  if (s.foodCost.avgPct != null)
    out.push(`• Food cost: średnio ${s.foodCost.avgPct}%${s.foodCost.avgPct > 35 ? ' — POWYŻEJ celu 30%. Sprawdź ceny składników i porcjowanie.' : ' — w normie.'}${s.foodCost.worst[0] ? ` Najgorszy: ${s.foodCost.worst[0].name} (${s.foodCost.worst[0].pct}%).` : ''}`)
  if (s.waste.month > 0)
    out.push(`• Straty (m-c): ${s.waste.month} zł.${s.waste.topProducts[0] ? ` Najwięcej: ${s.waste.topProducts[0].product} (${s.waste.topProducts[0].cost} zł) — rozważ mniejszą produkcję lub promocję.` : ''}`)
  if (s.attention.openIncidents) out.push(`• Awarie: ${s.attention.openIncidents} otwartych — mogą blokować sprzedaż, zajmij się priorytetowo.`)
  if (s.attention.pendingVacations) out.push(`• Urlopy: ${s.attention.pendingVacations} wniosków czeka na decyzję (blokuje planowanie grafiku).`)
  out.push(`• Zespół: ${s.team.employees} pracowników, ${s.team.activeNow} obecnie na zmianie.`)
  out.push('')
  out.push('ℹ️ Pełna analiza zysku i marży będzie dostępna po integracji POS (sprzedaż).')
  return out.join('\n')
}

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.VIEW_ANALYTICS)
  const { mode, message, history } = parseBody(cooSchema, await req.json())
  const snapshot = await getBusinessSnapshot(user)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Degradacja: rekomendacje regułowe z realnych danych (działa bez klucza).
    return NextResponse.json({ reply: ruleBasedReview(snapshot), source: 'rules' })
  }

  const userMsg =
    mode === 'review'
      ? 'Przygotuj zwięzły przegląd operacyjny biznesu z konkretnymi rekomendacjami na dziś/ten tydzień.'
      : message || 'Co wymaga mojej uwagi?'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 1200,
      system: `${SYSTEM}\n\nAKTUALNE DANE (snapshot JSON):\n${JSON.stringify(snapshot)}`,
      messages: [...(history || []), { role: 'user', content: userMsg }],
    }),
  })
  if (!res.ok) return NextResponse.json({ reply: ruleBasedReview(snapshot), source: 'rules-fallback' })
  const data = await res.json()
  const reply = data.content?.[0]?.text || ruleBasedReview(snapshot)
  return NextResponse.json({ reply, source: 'ai' })
})
