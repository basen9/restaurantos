import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { message, history } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ reply: 'Asystent AI nie jest skonfigurowany. Dodaj klucz ANTHROPIC_API_KEY do pliku .env' })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: 'Jesteś pomocnym asystentem kawiarni z wypiekami w Krakowie. Odpowiadasz na pytania pracowników o procedury, receptury, HACCP i codzienną pracę. Odpowiadaj po polsku, konkretnie i przyjaźnie. Procedury podawaj jako kroki numerowane.',
      messages: [...(history || []), { role: 'user', content: message }]
    })
  })
  const data = await response.json()
  const reply = data.content?.[0]?.text || 'Przepraszam, spróbuj ponownie.'
  return NextResponse.json({ reply })
}
