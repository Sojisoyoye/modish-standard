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

    const body = new URLSearchParams({
      _token: csrf,
      name: input.name,
      sku: '',
      barcode_type: 'C128',
      unit_id: unitId,
      category_id: categoryId,
      'product_locations[]': LOCATION_ID,
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
