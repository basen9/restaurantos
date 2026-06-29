export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { cooSchema } from '@/lib/validation'
import { getBusinessSnapshot, type BusinessSnapshot } from '@/lib/insights'
import { COO_TOOL_MAP, anthropicTools } from '@/lib/cooTools'
import { rateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'

const MODEL = 'claude-opus-4-8'
const SYSTEM = `Jesteś AI COO (dyrektorem operacyjnym) sieci gastronomicznej. Zamieniasz dane w DECYZJE biznesowe.
Zasady:
- Odpowiadaj po polsku, zwięźle i konkretnie, jak doświadczony COO.
- Korzystaj z dostępnych narzędzi, aby pobrać realne dane, zanim coś stwierdzisz. Nie zmyślaj liczb.
- Każdą obserwację łącz z REKOMENDACJĄ i szacowanym wpływem finansowym.
- Gdy brak danych (np. POS), powiedz to wprost i zaproponuj integrację.
- Format: krótkie punkty, najważniejsze najpierw.`

// Rekomendacje regułowe z danych (gdy brak klucza API lub jako fallback) — w pełni testowalne offline.
function ruleBasedReview(s: BusinessSnapshot): string {
  const out: string[] = [`📊 Przegląd operacyjny — ${s.date}`]
  if (s.finance.posConnected && s.finance.salesToday != null)
    out.push(`• Sprzedaż dziś: ${s.finance.salesToday} zł · zysk po koszcie surowca ~${s.finance.profitToday} zł · marża ${s.finance.marginPct}% · food cost ${s.finance.foodCostActualPct}% · koszt pracy ${s.finance.laborCostPct ?? '—'}%.`)
  else out.push('• Sprzedaż: brak danych POS — podłącz POS, by śledzić przychód, marżę i rzeczywisty food cost.')
  if (s.variance.length)
    out.push(`• Wariancja zużycia: ${s.variance[0].name} — z magazynu zeszło o ${s.variance[0].variance} ${s.variance[0].unit} więcej niż wynika ze sprzedaży (~${s.variance[0].varianceCost} zł). Sprawdź nadprodukcję/straty/porcjowanie.`)
  if (s.inventory.lowStock.length)
    out.push(`• Zaopatrzenie: ${s.inventory.lowStock.length} pozycji poniżej minimum (szac. ~${s.inventory.orderTotal} zł): ${s.inventory.lowStock.map((i) => i.name).join(', ')}.`)
  if (s.foodCost.avgPct != null)
    out.push(`• Food cost (z receptur): średnio ${s.foodCost.avgPct}%${s.foodCost.avgPct > 35 ? ' — POWYŻEJ celu, sprawdź porcje/ceny.' : '.'}`)
  if (s.waste.month > 0) out.push(`• Straty (m-c): ${s.waste.month} zł${s.waste.topProducts[0] ? ` (najwięcej: ${s.waste.topProducts[0].product}).` : '.'}`)
  if (s.attention.openIncidents) out.push(`• Awarie: ${s.attention.openIncidents} otwartych — priorytet.`)
  if (s.attention.pendingVacations) out.push(`• Urlopy: ${s.attention.pendingVacations} wniosków czeka na decyzję.`)
  out.push(`• Zespół: ${s.team.employees} pracowników, ${s.team.activeNow} na zmianie.`)
  return out.join('\n')
}

// Agentowa pętla tool-use z Claude.
async function runAgent(apiKey: string, user: { organizationId: string }, userMsg: string, history: any[]): Promise<string> {
  const tools = anthropicTools()
  const messages: any[] = [...history, { role: 'user', content: userMsg }]

  for (let i = 0; i < 6; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: SYSTEM, tools, messages }),
    })
    if (!res.ok) throw new ApiError(502, 'AI provider error')
    const data = await res.json()
    const blocks = data.content || []

    if (data.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: blocks })
      const toolResults = []
      for (const b of blocks.filter((x: any) => x.type === 'tool_use')) {
        const tool = COO_TOOL_MAP.get(b.name)
        let output: any
        try {
          output = tool ? await tool.execute(user, b.input || {}) : { error: 'unknown tool' }
        } catch (e) {
          output = { error: String(e) }
        }
        toolResults.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(output) })
      }
      messages.push({ role: 'user', content: toolResults })
      continue
    }
    return blocks.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
  }
  throw new ApiError(504, 'AI loop limit')
}

export const GET = handle(async () => {
  const user = await requirePermission(PERMISSIONS.VIEW_ANALYTICS)
  const reviews = await prisma.cooReview.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: 'desc' }, take: 10 })
  return NextResponse.json(reviews)
})

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.VIEW_ANALYTICS)

  const rl = rateLimit(`coo:${user.organizationId}`, 30, 60 * 60 * 1000)
  if (!rl.ok) throw new ApiError(429, `Limit zapytań AI COO wyczerpany. Spróbuj za ${Math.ceil(rl.retryAfterMs / 60000)} min.`)

  const { mode, message, history } = parseBody(cooSchema, await req.json())
  const apiKey = process.env.ANTHROPIC_API_KEY
  const userMsg =
    mode === 'review'
      ? 'Przygotuj zwięzły przegląd operacyjny biznesu z konkretnymi rekomendacjami na dziś/ten tydzień. Użyj narzędzi, by pobrać realne dane.'
      : message || 'Co wymaga mojej uwagi?'

  let reply: string
  let source: 'ai' | 'rules'
  if (apiKey) {
    try {
      reply = await runAgent(apiKey, user, userMsg, history || [])
      source = 'ai'
    } catch {
      reply = ruleBasedReview(await getBusinessSnapshot(user))
      source = 'rules'
    }
  } else {
    reply = ruleBasedReview(await getBusinessSnapshot(user))
    source = 'rules'
  }

  // Trwały zapis przeglądów (historia decyzji).
  if (mode === 'review') {
    await prisma.cooReview.create({ data: { organizationId: user.organizationId, kind: 'REVIEW', content: reply, source } })
  }

  return NextResponse.json({ reply, source })
})
