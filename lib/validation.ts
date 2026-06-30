// Schematy walidacji (Zod) — whitelista pól na każdym zapisie. Koniec mass-assignment.
import { z } from 'zod'

// Puste stringi z formularzy traktujemy jak brak wartości.
const optionalTime = z
  .union([z.string().regex(/^\d{2}:\d{2}$/), z.literal('')])
  .optional()
  .transform((v) => (v ? v : undefined))
const optionalDate = z
  .union([z.coerce.date(), z.literal('')])
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : (v as Date)))

const Priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
const TaskStatus = z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'])
const VacationType = z.enum(['ANNUAL', 'ON_DEMAND', 'UNPAID', 'SICK', 'OTHER'])

export const aiSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(8000) }))
    .max(20)
    .optional(),
})

const invoiceLineSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20).default('szt'),
  unitPrice: z.number().nonnegative(),
})

export const invoiceManualSchema = z.object({
  number: z.string().max(80).optional(),
  supplierName: z.string().max(160).optional(),
  supplierId: z.string().optional(),
  issueDate: z.coerce.date().optional(),
  items: z.array(invoiceLineSchema).min(1).max(200),
})

export const invoiceOcrSchema = z.object({
  image: z.string().min(10),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
})

export const saleSchema = z.object({
  soldAt: z.coerce.date().optional(),
  items: z
    .array(z.object({
      productId: z.string().optional(),
      name: z.string().min(1).max(160),
      quantity: z.number().int().positive(),
      unitPrice: z.number().nonnegative(),
    }))
    .min(1)
    .max(100),
})

export const alertDecisionSchema = z.object({ status: z.enum(['DISMISSED', 'RESOLVED']) }).strict()

export const availabilitySchema = z.object({
  days: z
    .array(z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      available: z.boolean(),
      fromTime: optionalTime,
      toTime: optionalTime,
      notes: z.string().max(200).optional(),
    }))
    .max(7),
})

export const sopSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().max(80).default('Ogólne'),
  content: z.string().min(1).max(20000),
})

export const sopUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    category: z.string().max(80).optional(),
    content: z.string().min(1).max(20000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()

export const scheduleGenerateSchema = z.object({
  weekStart: z.coerce.date(),
})

export const cooSchema = z.object({
  mode: z.enum(['chat', 'review']).default('chat'),
  message: z.string().max(4000).optional(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(8000) })).max(20).optional(),
})

export const checklistRunSchema = z.object({
  templateId: z.string().min(1),
  completions: z
    .array(z.object({ itemId: z.string().min(1), done: z.boolean() }))
    .min(1),
})

export const incidentDecisionSchema = z
  .object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
    notes: z.string().max(1000).optional(),
  })
  .strict()

export const incidentSchema = z.object({
  category: z.string().min(1).max(100),
  device: z.string().min(1).max(120),
  priority: Priority.default('MEDIUM'),
  description: z.string().min(1).max(2000),
})

export const inventoryBatchSchema = z.object({
  items: z
    .array(
      z.object({
        product: z.string().min(1).max(160),
        unit: z.string().min(1).max(20),
        expected: z.number().finite(),
        actual: z.number().finite(),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(200),
})

export const productionBatchSchema = z.object({
  items: z
    .array(
      z.object({
        product: z.string().min(1).max(160),
        quantity: z.number().int().nonnegative(),
        unit: z.string().min(1).max(20).default('szt'),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(200),
})

export const messageSchema = z.object({
  recipientId: z.string().min(1),
  content: z.string().min(1).max(4000),
})

export const shiftSchema = z.object({
  userId: z.string().min(1),
  locationId: z.string().min(1),
  scheduleId: z.string().optional(),
  date: z.coerce.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(500).optional(),
})

export const clockSchema = z.object({
  action: z.enum(['start', 'end']),
  shiftId: z.string().optional(),
})

export const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: Priority.default('MEDIUM'),
  assigneeId: z.string().min(1),
  dueDate: optionalDate,
  dueTime: optionalTime,
})

export const taskUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    priority: Priority.optional(),
    status: TaskStatus.optional(),
    dueDate: optionalDate,
    dueTime: optionalTime,
  })
  .strict()

export const vacationCreateSchema = z.object({
  type: VacationType,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().max(500).optional(),
})

export const vacationDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().max(500).optional(),
})

export const locationSchema = z.object({
  name: z.string().min(1).max(160),
  address: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
})

export const locationUpdateSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(120).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()

export const userUpdateSchema = z
  .object({
    permissions: z.array(z.string().max(60)).max(30).optional(),
    position: z.string().max(120).optional(),
  })
  .strict()

export const supplierSchema = z.object({
  name: z.string().min(1).max(160),
  contact: z.string().max(160).optional(),
  email: z.string().email().max(160).optional().or(z.literal('')),
  phone: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
})

export const inventoryItemSchema = z.object({
  name: z.string().min(1).max(160),
  category: z.string().max(80).default('Inne'),
  unit: z.string().min(1).max(20).default('kg'),
  stock: z.number().nonnegative().default(0),
  minStock: z.number().nonnegative().default(0),
  costPerUnit: z.number().nonnegative().default(0),
  supplierId: z.string().optional().or(z.literal('')),
})

export const inventoryItemUpdateSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    category: z.string().max(80).optional(),
    unit: z.string().min(1).max(20).optional(),
    minStock: z.number().nonnegative().optional(),
    costPerUnit: z.number().nonnegative().optional(),
    supplierId: z.string().optional().or(z.literal('')),
    // ruch magazynowy:
    restock: z.number().optional(), // +przyjęcie / -korekta
    restockType: z.enum(['PURCHASE', 'ADJUSTMENT', 'WASTE', 'USAGE']).optional(),
    reason: z.string().max(300).optional(),
  })
  .strict()

export const recipeSchema = z.object({
  productId: z.string().min(1),
  yield: z.number().int().positive().default(1),
  notes: z.string().max(500).optional(),
  items: z
    .array(z.object({ inventoryItemId: z.string().min(1), quantity: z.number().positive(), unit: z.string().min(1).max(20).default('kg') }))
    .min(1)
    .max(100),
})

// ===== Ustawienia organizacji =====
export const settingsSchema = z.object({
  currency: z.string().min(1).max(8).optional(),
  defaultVatRate: z.number().min(0).max(100).optional(),
  serviceChargePct: z.number().min(0).max(100).optional(),
  tipModel: z.enum(['individual', 'pooled']).optional(),
  voidRequiresManager: z.boolean().optional(),
  cashTipsInDrawer: z.boolean().optional(),
  loyaltyEnabled: z.boolean().optional(),
  loyaltyPointsPerCurrency: z.number().min(0).max(1000).optional(),
  loyaltyRedeemValue: z.number().min(0).max(1000).optional(),
  slowServiceMinutes: z.number().int().min(1).max(240).optional(),
  reservationsEnabled: z.boolean().optional(),
})

// ===== Kasa / rozliczenie zmiany =====
export const cashOpenSchema = z.object({ openingFloat: z.number().nonnegative().max(1000000).default(0), locationId: z.string().min(1).optional() })
export const cashMovementSchema = z.object({ type: z.enum(['IN', 'OUT']), amount: z.number().positive().max(1000000), reason: z.string().max(200).optional() })
export const cashCloseSchema = z.object({ countedCash: z.number().nonnegative().max(10000000), notes: z.string().max(500).optional() })

// ===== Menu / produkty =====
export const productSchema = z.object({
  name: z.string().min(1).max(160),
  category: z.string().min(1).max(80),
  unit: z.string().min(1).max(20).default('szt'),
  price: z.number().nonnegative().default(0),
  costPerUnit: z.number().nonnegative().default(0),
  vatRate: z.number().min(0).max(100).default(8),
  description: z.string().max(800).optional(),
  available: z.boolean().default(true),
})
export const productUpdateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  category: z.string().min(1).max(80).optional(),
  unit: z.string().min(1).max(20).optional(),
  price: z.number().nonnegative().optional(),
  costPerUnit: z.number().nonnegative().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  description: z.string().max(800).optional(),
  available: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

// ===== Plan sali / stoliki / zamówienia =====
export const zoneSchema = z.object({ name: z.string().min(1).max(80), locationId: z.string().min(1).optional() })
export const zoneUpdateSchema = z.object({ name: z.string().min(1).max(80).optional(), sortOrder: z.number().int().optional() })
export const tableSchema = z.object({ zoneId: z.string().min(1), name: z.string().min(1).max(40), seats: z.number().int().min(1).max(100).default(2) })
export const tableUpdateSchema = z.object({ name: z.string().min(1).max(40).optional(), seats: z.number().int().min(1).max(100).optional(), zoneId: z.string().min(1).optional(), sortOrder: z.number().int().optional() })
export const orderAddItemsSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1).optional(),
    name: z.string().min(1).max(160),
    notes: z.string().max(200).optional(),
    kind: z.enum(['FOOD', 'DRINK']).default('FOOD'),
    quantity: z.number().int().min(1).max(999).default(1),
    unitPrice: z.number().nonnegative().default(0),
  })).min(1).max(100),
})
export const orderItemStatusSchema = z.object({ status: z.enum(['PENDING', 'PREPARING', 'READY', 'SERVED']) })
export const voidItemSchema = z.object({ reason: z.string().min(1).max(200) })
export const moveOrderSchema = z.object({ tableId: z.string().min(1) })
export const closeOrderSchema = z.object({
  discount: z.number().nonnegative().default(0),
  tip: z.number().nonnegative().default(0),
  paymentMethod: z.enum(['CASH', 'CARD', 'BLIK', 'ONLINE', 'OTHER']).optional(),
  splitCount: z.number().int().min(1).max(100).default(1),
})

export const recipeGuideSchema = z.object({
  instructions: z.string().max(8000).optional(),
  prepTimeMin: z.number().int().nonnegative().max(100000).optional(),
  chefTips: z.string().max(4000).optional(),
  cookNotes: z.string().max(4000).optional(),
  allergens: z.array(z.string().max(60)).max(40).optional(),
  photos: z.array(z.string().url().max(2000)).max(20).optional(),
  fullRecipeAccess: z.enum(['OWNER_ONLY', 'OWNER_MANAGER', 'ALL_COOKS', 'SELECTED']).optional(),
  accessUserIds: z.array(z.string().min(1)).max(200).optional(),
})

export const wasteSchema = z.object({
  product: z.string().min(1).max(160),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20).default('szt'),
  reason: z.string().min(1).max(500),
  costPerUnit: z.number().nonnegative().default(0),
  aiDetected: z.boolean().default(false),
  notes: z.string().max(500).optional(),
})
