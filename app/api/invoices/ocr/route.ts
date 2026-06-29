export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { handle, requirePermission, parseBody, ApiError } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { invoiceOcrSchema } from '@/lib/validation'
import { extractInvoice } from '@/lib/ocr'
import { createInvoiceWithMatches } from '@/lib/invoiceService'

export const POST = handle(async (req) => {
  const user = await requirePermission(PERMISSIONS.MANAGE_INVENTORY)
  const { image, mediaType } = parseBody(invoiceOcrSchema, await req.json())

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new ApiError(400, 'OCR wymaga skonfigurowanego ANTHROPIC_API_KEY. Możesz dodać fakturę ręcznie lub przez KSeF.')

  const extracted = await extractInvoice(apiKey, image, mediaType)
  if (!extracted.items.length) throw new ApiError(422, 'Nie udało się odczytać pozycji z faktury.')

  const invoice = await createInvoiceWithMatches(user, {
    number: extracted.number,
    supplierName: extracted.supplierName,
    issueDate: extracted.issueDate ? new Date(extracted.issueDate) : undefined,
    source: 'OCR',
    items: extracted.items,
  })
  return NextResponse.json(invoice, { status: 201 })
})
