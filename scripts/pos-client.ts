import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

export interface POSProduct {
  id: number
  sku: string
  product: string
  category: string
  unit: string
  current_stock: string
  max_price: string
  selling_price: string
  is_inactive: number
  not_for_selling: number
  parsedName: string
  parsedStock: number
  parsedPrice: number
}

export interface CreateProductInput {
  name: string
  costPrice: number
  sellingPrice: number
  categoryId?: string
  unitId?: string
  locationId?: string  // override LOCATION_ID (e.g. '928' for purchase-order flow)
}

export interface PurchaseLine {
  productId: string
  variationId: string
  quantity: number
  unitId: string
  purchasePrice: number    // NGN cost price per unit
  sellingPrice: number     // NGN selling price per unit
}

export interface CreatePurchaseInput {
  contactId: string                                   // numeric DB ID of supplier
  status: 'ordered' | 'received' | 'pending'
  locationId?: string
  refNo?: string
  shippingCharges?: number
  shippingDetails?: string
  lines: PurchaseLine[]
}

const BOARD_CATEGORY_ID = '4529'
const EDGE_TAPE_CATEGORY_ID = '4137'
const BOARD_UNIT_ID = '2094'
const EDGE_TAPE_UNIT_ID = '2097'
const LOCATION_ID = '952'

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

function parseStockQty(raw: string): number {
  return parseFloat(raw.match(/^([\d.]+)/)?.[1] ?? '0')
}

function parseSellingPrice(raw: string): number {
  const digits = stripHtml(raw).replace(/[^\d.]/g, '')
  return parseFloat(digits) || 0
}

export class POSClient {
  private baseUrl: string
  private username: string
  private password: string
  private jar: Record<string, string> = {}

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.username = username
    this.password = password
  }

  private updateJar(headers: Headers): void {
    const setCookies: string[] =
      typeof (headers as any).getSetCookie === 'function'
        ? (headers as any).getSetCookie()
        : (headers.get('set-cookie') ?? '').split(/,(?=[^ ])/).filter(Boolean)

    for (const c of setCookies) {
      const [kv] = c.split(';')
      const eq = kv.indexOf('=')
      if (eq > 0) this.jar[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim()
    }
  }

  private cookieHeader(): string {
    return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; ')
  }

  private async getCsrf(path: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Cookie: this.cookieHeader() },
    })
    this.updateJar(res.headers)
    const html = await res.text()
    // Some pages use a form hidden input, others use a meta tag
    const csrf =
      html.match(/name="_token"\s+value="([^"]+)"/)?.[1] ??
      html.match(/name="csrf-token"\s+content="([^"]+)"/)?.[1] ??
      html.match(/content="([^"]+)"\s+name="csrf-token"/)?.[1]
    if (!csrf) throw new Error(`CSRF token not found at ${path}`)
    return csrf
  }

  async login(): Promise<void> {
    const csrf = await this.getCsrf('/login')

    const res = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: this.cookieHeader(),
      },
      body: new URLSearchParams({
        _token: csrf,
        username: this.username,
        password: this.password,
      }),
      redirect: 'manual',
    })
    this.updateJar(res.headers)

    const location = res.headers.get('location') ?? ''
    if (!location.includes('/home')) {
      throw new Error(`POS login failed — redirected to: ${location || '(no redirect)'}`)
    }
  }

  async getProducts(): Promise<POSProduct[]> {
    const res = await fetch(`${this.baseUrl}/products?per_page=500`, {
      headers: {
        Cookie: this.cookieHeader(),
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
    const data = await res.json()
    const raw: Omit<POSProduct, 'parsedName' | 'parsedStock' | 'parsedPrice'>[] = data.data ?? []

    return raw.map(p => ({
      ...p,
      parsedName: stripHtml(p.product),
      parsedStock: parseStockQty(p.current_stock),
      parsedPrice: parseSellingPrice(p.selling_price) || parseFloat(p.max_price) || 0,
    }))
  }

  async createProduct(input: CreateProductInput): Promise<{ sku: string; name: string }> {
    const csrf = await this.getCsrf('/products/create')

    const isEdgeTape = /\d+\s*(mm|MM)/.test(input.name)
    const categoryId = input.categoryId ?? (isEdgeTape ? EDGE_TAPE_CATEGORY_ID : BOARD_CATEGORY_ID)
    const unitId = input.unitId ?? (isEdgeTape ? EDGE_TAPE_UNIT_ID : BOARD_UNIT_ID)
    const locationId = input.locationId ?? LOCATION_ID

    const body = new URLSearchParams({
      _token: csrf,
      name: input.name,
      sku: '',
      barcode_type: 'C128',
      unit_id: unitId,
      category_id: categoryId,
      'product_locations[]': locationId,
      enable_stock: '1',
      alert_quantity: '5',
      tax_type: 'exclusive',
      type: 'single',
      single_dpp: String(input.costPrice),
      single_dpp_inc_tax: String(input.costPrice),
      profit_percent: '48',
      single_dsp: String(input.sellingPrice),
      single_dsp_inc_tax: String(input.sellingPrice),
    })

    const res = await fetch(`${this.baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: this.cookieHeader(),
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
      redirect: 'manual',
    })
    this.updateJar(res.headers)

    const location = res.headers.get('location') ?? ''
    if (res.status !== 302 || !location.includes('/products')) {
      throw new Error(`createProduct failed — status ${res.status}, location: ${location}`)
    }

    return { sku: '', name: input.name }
  }

  async searchProductForPurchase(
    name: string
  ): Promise<{ productId: string; variationId: string } | null> {
    // Use location 928 (BL0001) — where purchaseable stock lives
    const url = `${this.baseUrl}/purchases/get_products?term=${encodeURIComponent(name)}&location_id=928`
    const res = await fetch(url, {
      headers: {
        Cookie: this.cookieHeader(),
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
    if (!res.ok) return null
    const results = await res.json() as Array<{
      id: string; text: string; product_id: string; variation_id: string
    }>
    if (results.length === 0) return null
    // Result text format: "Product Name - product_id" — strip the suffix before comparing
    const nameLower = name.toLowerCase()
    const stripSuffix = (t: string) => t.replace(/\s+-\s+\d+$/, '').toLowerCase()
    const exact = results.find(r => stripSuffix(r.text) === nameLower)
    if (!exact) return null
    return { productId: String(exact.product_id), variationId: String(exact.variation_id) }
  }

  async createPurchase(input: CreatePurchaseInput): Promise<{ refNo: string; purchaseId: string }> {
    const csrf = await this.getCsrf('/purchases/create')
    const locationId = input.locationId ?? '928'

    const now = new Date()
    const day    = String(now.getDate()).padStart(2, '0')
    const month  = String(now.getMonth() + 1).padStart(2, '0')
    const year   = now.getFullYear()
    const hours  = String(now.getHours()).padStart(2, '0')
    const mins   = String(now.getMinutes()).padStart(2, '0')
    const transactionDate = `${day}-${month}-${year} ${hours}:${mins}`

    const totalBeforeTax = input.lines.reduce(
      (sum, l) => sum + l.purchasePrice * l.quantity, 0
    )
    const shippingCharges = input.shippingCharges ?? 0
    const finalTotal = totalBeforeTax + shippingCharges

    const body = new URLSearchParams({
      _token:           csrf,
      contact_id:       input.contactId,
      ref_no:           input.refNo ?? '',
      transaction_date: transactionDate,
      status:           input.status,
      location_id:      locationId,
      exchange_rate:    '1',
      pay_term_number:  '',
      pay_term_type:    '',
      discount_type:    '',
      discount_amount:  '0',
      tax_id:           '',
      shipping_charges: String(shippingCharges),
      shipping_details: input.shippingDetails ?? '',
      additional_notes: '',
      total_before_tax: totalBeforeTax.toFixed(2),
      final_total:      finalTotal.toFixed(2),
    })

    input.lines.forEach((line, i) => {
      body.append(`purchases[${i}][product_id]`,          line.productId)
      body.append(`purchases[${i}][variation_id]`,        line.variationId)
      body.append(`purchases[${i}][quantity]`,            String(line.quantity))
      body.append(`purchases[${i}][product_unit_id]`,     line.unitId)
      body.append(`purchases[${i}][pp_without_discount]`, String(line.purchasePrice))
      body.append(`purchases[${i}][discount_percent]`,    '0.00')
      body.append(`purchases[${i}][purchase_price]`,      String(line.purchasePrice))
      body.append(`purchases[${i}][purchase_line_tax_id]`, '')
      body.append(`purchases[${i}][item_tax]`,            '0')
      body.append(`purchases[${i}][purchase_price_inc_tax]`, String(line.purchasePrice))
      body.append(`purchases[${i}][profit_percent]`,      '48')
      body.append(`purchases[${i}][default_sell_price]`,  String(line.sellingPrice))
    })

    const res = await fetch(`${this.baseUrl}/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: this.cookieHeader(),
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
      redirect: 'manual',
    })
    this.updateJar(res.headers)

    const location = res.headers.get('location') ?? ''
    if (res.status !== 302 || !location.includes('/purchases')) {
      throw new Error(`createPurchase failed — status ${res.status}, location: ${location || '(none)'}`)
    }

    const purchaseId = location.match(/\/purchases\/(\d+)/)?.[1] ?? ''

    // Fetch the ref_no from the edit page
    let refNo = purchaseId ? `#${purchaseId}` : 'auto-generated'
    if (purchaseId) {
      try {
        const editRes = await fetch(`${this.baseUrl}/purchases/${purchaseId}/edit`, {
          headers: { Cookie: this.cookieHeader() },
        })
        const html = await editRes.text()
        const m = html.match(/name="ref_no"[^>]*value="([^"]+)"/)
          ?? html.match(/value="([^"]+)"[^>]*name="ref_no"/)
        if (m) refNo = m[1]
      } catch { /* use #id fallback */ }
    }

    return { refNo, purchaseId }
  }

  async checkProductsByName(names: string[]): Promise<{ found: POSProduct[]; missing: string[] }> {
    const all = await this.getProducts()
    const lowerNames = names.map(n => n.toLowerCase())

    const found: POSProduct[] = []
    const foundLower = new Set<string>()

    for (const p of all) {
      const lower = p.parsedName.toLowerCase()
      if (lowerNames.includes(lower)) {
        found.push(p)
        foundLower.add(lower)
      }
    }

    const missing = names.filter(n => !foundLower.has(n.toLowerCase()))
    return { found, missing }
  }
}

export function createPOSClientFromEnv(): POSClient {
  const baseUrl = (process.env.INVENTORY_APP_URL || 'https://pos.virtualrx.com.ng').replace(/\/$/, '')
  const username = process.env.INVENTORY_APP_USERNAME || ''
  const password = process.env.INVENTORY_APP_PASSWORD || ''
  return new POSClient(baseUrl, username, password)
}
