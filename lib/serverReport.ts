// Czysta agregacja wyników kelnerów — testowalna bez bazy.
const round2 = (n: number) => Math.round(n * 100) / 100

export interface ServerSale { serverId: string | null; serverName: string; total: number; tip?: number }

export interface ServerRow { serverId: string; name: string; sales: number; revenue: number; tips: number; avgTicket: number }

export function buildServerReport(sales: ServerSale[], tipModel: 'individual' | 'pooled') {
  const map = new Map<string, { serverId: string; name: string; sales: number; revenue: number; tips: number }>()
  let tipPool = 0
  for (const s of sales) {
    tipPool += s.tip || 0
    const key = s.serverId || 'unknown'
    const e = map.get(key) || { serverId: key, name: s.serverName, sales: 0, revenue: 0, tips: 0 }
    e.sales += 1
    e.revenue += s.total
    e.tips += s.tip || 0
    map.set(key, e)
  }
  const servers = Array.from(map.values())
  tipPool = round2(tipPool)

  const rows: ServerRow[] = servers
    .map((e) => ({
      serverId: e.serverId,
      name: e.name,
      sales: e.sales,
      revenue: round2(e.revenue),
      // pooled: napiwki dzielone równo wg liczby kelnerów ze sprzedażą; individual: do kelnera
      tips: tipModel === 'pooled' ? round2(tipPool / Math.max(1, servers.length)) : round2(e.tips),
      avgTicket: e.sales ? round2(e.revenue / e.sales) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  return { tipModel, tipPool, rows }
}
