export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Health-check dla monitoringu (uptime/k8s). Publiczny, nie ujawnia szczegółów.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', db: 'up', time: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'degraded', db: 'down' }, { status: 503 })
  }
}
