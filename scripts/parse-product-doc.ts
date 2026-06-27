import * as XLSX from 'xlsx'
import { PDFParse } from 'pdf-parse'

export interface InvoiceRow {
  pdfName: string
  posName: string
  usdUnitPrice: number
  face: 'Matt' | 'Embossed' | 'Glossy' | 'Unknown'
  categorySlug: string
}

export const INVOICE_SPELLING_FIXES: Record<string, string> = {
  'Cappucino':   'Cappuccino',
  'Soilder':     'Soldier',
  'Zebrono':     'Zebrano',
  'Sliver Grey': 'Silver Grey',
  'Redrose':     'Red Rose',
  'Whiet':       'White',
  'Asurmun':     'Asunranmu',
  'Masonai4':    'Masonia4',
  'Hc059':       'HC059',
  'Color40':     'Color 40',
}

export const INVOICE_PARENTHETICAL_NAMES: Record<string, string> = {
  'spider':      'Spider',
  'carpet':      'Carpet',
  'dark floral': 'Dark Floral',
  'basket':      'Basket',
}

export function pdfNameToPosName(rawName: string, tapeSize = '48MM'): string {
  const isGlossy = /Glossy\s*$/i.test(rawName)

  // Check for parenthetical special names first
  const parenMatch = rawName.match(/[([（]([^)\]）]+)[)\]）]/)
  if (parenMatch) {
    const paren = parenMatch[1].trim().toLowerCase()
    for (const [key, label] of Object.entries(INVOICE_PARENTHETICAL_NAMES)) {
      if (paren.includes(key)) {
        return isGlossy ? `${label} ${tapeSize} Gloss` : `${label} ${tapeSize}`
      }
    }
  }

  // Strip face suffix and parenthetical
  let color = rawName
    .replace(/\s*[([（][^)\]）]*[)\]）]/g, '')
    .replace(/\s+Glossy\s*$/i, '')
    .replace(/\s+Matt\s*$/i, '')
    .replace(/\s+Embossed\s*$/i, '')
    .trim()

  // Bare numeric codes → "Color XXXX"
  color = color.replace(/^(\d{3,5})$/, 'Color $1')

  // Apply spelling fixes
  for (const [wrong, right] of Object.entries(INVOICE_SPELLING_FIXES)) {
    color = color.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right)
  }

  return isGlossy ? `${color} ${tapeSize} Gloss` : `${color} ${tapeSize}`
}

export interface ParsedProduct {
  name: string
  categorySlug: string
  price?: number
  costPrice?: number
  stock?: number
}

const VALID_SLUGS = new Set([
  'block-boards',
  'uv-gloss-boards',
  'mdf-boards',
  'hdf-boards',
  'marine-boards',
  'edge-tapes',
  'doors',
  'pu-stone-panels',
  'accessories',
])

export function slugifyCategory(raw: string): string {
  const normalized = raw.trim().toLowerCase()

  const aliases: Record<string, string> = {
    'block board': 'block-boards',
    'block boards': 'block-boards',
    'bb board': 'block-boards',
    'bb boards': 'block-boards',
    'uv gloss board': 'uv-gloss-boards',
    'uv gloss boards': 'uv-gloss-boards',
    'uv board': 'uv-gloss-boards',
    'uv boards': 'uv-gloss-boards',
    'uv gloss': 'uv-gloss-boards',
    'mdf board': 'mdf-boards',
    'mdf boards': 'mdf-boards',
    'mdf': 'mdf-boards',
    'hdf board': 'hdf-boards',
    'hdf boards': 'hdf-boards',
    'hdf': 'hdf-boards',
    'marine board': 'marine-boards',
    'marine boards': 'marine-boards',
    'marine': 'marine-boards',
    'edge tape': 'edge-tapes',
    'edge tapes': 'edge-tapes',
    'edge banding': 'edge-tapes',
    'door': 'doors',
    'doors': 'doors',
    'pu stone panel': 'pu-stone-panels',
    'pu stone panels': 'pu-stone-panels',
    'pu stone': 'pu-stone-panels',
    'pu panel': 'pu-stone-panels',
    'pu panels': 'pu-stone-panels',
    'stone panel': 'pu-stone-panels',
    'stone panels': 'pu-stone-panels',
    'accessory': 'accessories',
    'accessories': 'accessories',
  }

  if (aliases[normalized]) return aliases[normalized]

  const slug = normalized
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (VALID_SLUGS.has(slug)) return slug

  for (const valid of Array.from(VALID_SLUGS)) {
    if (slug.includes(valid.replace(/-/g, '')) || valid.includes(slug.replace(/-/g, ''))) {
      return valid
    }
  }

  return slug || 'accessories'
}

function inferCategoryFromName(name: string): string {
  const n = name.toUpperCase()

  if (/ BB($| |\b)/i.test(n) || /\bBB\b/.test(n)) return 'block-boards'
  if (n.includes('MDF UV') || n.includes('HDF UV')) return 'uv-gloss-boards'
  if (/\b(21MM|48MM|\d+\s*MM)\b/.test(n)) return 'edge-tapes'
  if (n.includes('MARINE')) return 'marine-boards'
  if (n.includes('HDF')) return 'hdf-boards'
  if (n.includes('MDF')) return 'mdf-boards'
  if (n.includes('DOOR')) return 'doors'
  if (n.includes('PU') || n.includes('STONE PANEL')) return 'pu-stone-panels'

  return 'accessories'
}

function parsePrice(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined
  const str = String(raw).replace(/[^\d.]/g, '')
  const num = parseFloat(str)
  return isNaN(num) ? undefined : num
}

function parseStock(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined
  const num = parseInt(String(raw), 10)
  return isNaN(num) ? undefined : num
}

function rowToProduct(row: Record<string, unknown>): ParsedProduct | null {
  const lower: Record<string, unknown> = {}
  for (const k of Object.keys(row)) {
    lower[k.toLowerCase().trim()] = row[k]
  }

  const name = String(lower['name'] ?? '').trim()
  if (!name) return null

  const rawCategory = lower['category'] ?? lower['categoryslug'] ?? lower['category_slug'] ?? ''
  let categorySlug: string

  if (rawCategory) {
    const raw = String(rawCategory).trim()
    categorySlug = VALID_SLUGS.has(raw) ? raw : slugifyCategory(raw)
  } else {
    categorySlug = inferCategoryFromName(name)
  }

  const price = parsePrice(lower['price'] ?? lower['selling_price'] ?? lower['sellingprice'])
  const costPrice = parsePrice(lower['cost_price'] ?? lower['costprice'] ?? lower['cost'])
  const stock = parseStock(lower['stock'] ?? lower['qty'] ?? lower['quantity'])

  const product: ParsedProduct = { name, categorySlug }
  if (price !== undefined) product.price = price
  if (costPrice !== undefined) product.costPrice = costPrice
  if (stock !== undefined) product.stock = stock

  return product
}

export function parseCSV(content: string): ParsedProduct[] {
  const workbook = XLSX.read(content, { type: 'string' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return rows.map(rowToProduct).filter((p): p is ParsedProduct => p !== null)
}

export function parseExcel(buffer: Buffer): ParsedProduct[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return rows.map(rowToProduct).filter((p): p is ParsedProduct => p !== null)
}

const META_LINE = /^\s*(category|price|cost)[:\s]/i

function isMetaLine(line: string): boolean {
  return META_LINE.test(line)
}

function extractPriceFromSegment(segment: string): { name: string; price?: number } {
  const priceMatch = segment.match(/\s+(?:at\s+)?(?:₦|NGN|N)\s*([\d,]+)\s*$/i)
    ?? segment.match(/\s+([\d,]{4,})\s*$/)
  if (priceMatch) {
    const name = segment.slice(0, segment.length - priceMatch[0].length).trim()
    return { name, price: parsePrice(priceMatch[1]) }
  }
  return { name: segment.trim() }
}

export function parseTextInput(text: string): ParsedProduct[] {
  const results: ParsedProduct[] = []

  const categoryLinePattern = /category[:\s]+([^\n,]+?)(?:\s+price[:\s]|$)/i
  const priceLinePattern = /price[:\s]+(?:₦|NGN|N)?\s*([\d,]+)/i

  const catMatch = text.match(categoryLinePattern)
  const priceMatch = text.match(priceLinePattern)
  const defaultCat = catMatch ? slugifyCategory(catMatch[1].trim()) : ''
  const defaultPrice = priceMatch ? parsePrice(priceMatch[1]) : undefined

  // "X, Y under category at ₦price"
  const underPattern =
    /(.+?)\s+under\s+([\w-]+(?:\s+[\w-]+)*)\s+at\s+(?:₦|NGN|N)?\s*([\d,]+)/gi
  let match: RegExpExecArray | null
  underPattern.lastIndex = 0
  while ((match = underPattern.exec(text)) !== null) {
    const names = match[1].split(',').map(s => s.trim()).filter(Boolean)
    const cat = slugifyCategory(match[2].trim())
    const price = parsePrice(match[3])
    for (const name of names) {
      if (!name) continue
      const product: ParsedProduct = { name, categorySlug: cat }
      if (price !== undefined) product.price = price
      results.push(product)
    }
  }
  if (results.length > 0) return deduplicate(results)

  // "Add: Name (category) ₦price, Name2 (category2) ₦price2"
  const addLinePattern = /^add[:\s]+(.+)/i
  const lines = text.split('\n')
  for (const line of lines) {
    const addMatch = line.match(addLinePattern)
    if (!addMatch) continue
    const segment = addMatch[1]
    const entries = segment.split(',')
    for (const entry of entries) {
      const e = entry.trim()
      if (!e) continue
      const catInParens = e.match(/\(([^)]+)\)/)
      const catRaw = catInParens ? catInParens[1].trim() : ''
      const withoutParens = e.replace(/\(([^)]+)\)/, '').trim()
      const { name, price } = extractPriceFromSegment(withoutParens)
      if (!name) continue
      const cat = catRaw ? slugifyCategory(catRaw) : (defaultCat || inferCategoryFromName(name))
      const product: ParsedProduct = { name, categorySlug: cat }
      if (price !== undefined) product.price = price
      results.push(product)
    }
  }
  if (results.length > 0) return deduplicate(results)

  // Bullet list with optional metadata footer
  const bulletPattern = /^[-*•]\s+(.+)/gm
  const bulletNames: string[] = []
  bulletPattern.lastIndex = 0
  while ((match = bulletPattern.exec(text)) !== null) {
    bulletNames.push(match[1].trim())
  }
  if (bulletNames.length > 0) {
    for (const name of bulletNames) {
      if (!name || isMetaLine(name)) continue
      const cat = defaultCat || inferCategoryFromName(name)
      const product: ParsedProduct = { name, categorySlug: cat }
      if (defaultPrice !== undefined) product.price = defaultPrice
      results.push(product)
    }
    return deduplicate(results)
  }

  // Plain lines: "Name ₦price" or "Name, Name2 ₦price"
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || isMetaLine(line)) continue
    if (/^(add|under|at)[:\s]/i.test(line)) continue

    const entries = line.split(',')
    for (const entry of entries) {
      const e = entry.trim()
      if (e.length < 2) continue
      const catInParens = e.match(/\(([^)]+)\)/)
      const catRaw = catInParens ? catInParens[1].trim() : ''
      const withoutParens = e.replace(/\(([^)]+)\)/, '').trim()
      const { name, price } = extractPriceFromSegment(withoutParens)
      if (!name || name.length < 2) continue
      const cat = catRaw ? slugifyCategory(catRaw) : (defaultCat || inferCategoryFromName(name))
      const product: ParsedProduct = { name, categorySlug: cat }
      const resolvedPrice = price ?? defaultPrice
      if (resolvedPrice !== undefined) product.price = resolvedPrice
      results.push(product)
    }
  }

  return deduplicate(results)
}

function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)
    .join(' ')
}

export function parseInvoiceRowsRich(text: string): InvoiceRow[] {
  const lines = text.split('\n')

  let contextCategory = ''
  let tapeSize = '48MM'
  for (const line of lines) {
    const m = line.replace(/\t/g, ' ').match(/\d+\.?\d*\s*[*×xX]\s*(\d+\s*MM)/i)
    if (m) {
      contextCategory = 'edge-tapes'
      tapeSize = m[1].replace(/\s+/g, '').toUpperCase()
      break
    }
  }

  const results: InvoiceRow[] = []

  for (const line of lines) {
    if (!line.trim()) continue
    const parts = line.split('\t').map(p => p.trim()).filter(Boolean)
    if (parts.length < 7) continue
    if (!/^\d+$/.test(parts[0])) continue
    const rowNum = parseInt(parts[0])
    if (rowNum < 1 || rowNum > 9999) continue

    let right = parts.length - 1
    const usdValues: number[] = []
    while (right > 0 && usdValues.length < 2 && /^US\$[\d.,]+$/i.test(parts[right])) {
      usdValues.unshift(parseFloat(parts[right].replace(/[^0-9.]/g, '')))
      right--
    }
    if (usdValues.length === 0) continue

    let numCount = 0
    while (right > 0 && numCount < 3 && /^\d+$/.test(parts[right])) {
      right--
      numCount++
    }

    if (right < 1) continue
    const nameParts = parts.slice(1, right + 1)
    const rawName = nameParts.join(' ').trim()
    if (!rawName || rawName.length < 2) continue

    // Title-case the raw name
    const pdfName = rawName.split(' ')
      .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)
      .join(' ')

    const usdUnitPrice = usdValues[0]
    const face: InvoiceRow['face'] = /Glossy\s*$/i.test(pdfName) ? 'Glossy'
      : /Matt\s*$/i.test(pdfName) ? 'Matt'
      : /Embossed\s*$/i.test(pdfName) ? 'Embossed'
      : 'Unknown'

    const posName = pdfNameToPosName(pdfName, tapeSize)
    const cat = contextCategory || inferCategoryFromName(rawName)

    results.push({ pdfName, posName, usdUnitPrice, face, categorySlug: cat })
  }

  return results
}

function parseInvoiceRows(text: string): ParsedProduct[] {
  const lines = text.split('\n')

  // Detect context category from dimension markers e.g. "0.9*48MM" → edge-tapes
  let contextCategory = ''
  for (const line of lines) {
    if (/\d+\.?\d*\s*[*×xX]\s*\d+\s*MM/i.test(line.replace(/\t/g, ' '))) {
      contextCategory = 'edge-tapes'
      break
    }
  }

  const results: ParsedProduct[] = []

  for (const line of lines) {
    if (!line.trim()) continue

    const parts = line.split('\t').map(p => p.trim()).filter(Boolean)
    // Need at minimum: rowNum + name + 3 qty cols + 2 price cols = 7
    if (parts.length < 7) continue

    // First token must be a plain row number
    if (!/^\d+$/.test(parts[0])) continue
    const rowNum = parseInt(parts[0])
    if (rowNum < 1 || rowNum > 9999) continue

    // Strip right-to-left: up to 2 US$ price columns, then up to 3 numeric qty columns
    let right = parts.length - 1

    let usdCount = 0
    while (right > 0 && usdCount < 2 && /^US\$[\d.,]+$/i.test(parts[right])) {
      right--
      usdCount++
    }
    if (usdCount === 0) continue  // no prices → not a product row

    let numCount = 0
    while (right > 0 && numCount < 3 && /^\d+$/.test(parts[right])) {
      right--
      numCount++
    }

    // parts[1..right] is the product name
    if (right < 1) continue
    const nameParts = parts.slice(1, right + 1)
    if (nameParts.length === 0) continue

    const rawName = nameParts.join(' ').trim()
    if (!rawName || rawName.length < 2) continue

    const name = toTitleCase(rawName)
    const cat = contextCategory || inferCategoryFromName(rawName)
    results.push({ name, categorySlug: cat })
  }

  return results
}

export async function parsePDF(buffer: Buffer): Promise<ParsedProduct[]> {
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  await parser.destroy()

  // Try structured invoice/PI format first; fall back to free-text parsing
  const invoiceProducts = parseInvoiceRows(result.text)
  if (invoiceProducts.length > 0) return invoiceProducts

  return parseTextInput(result.text)
}

function deduplicate(products: ParsedProduct[]): ParsedProduct[] {
  const seen = new Set<string>()
  return products.filter(p => {
    const key = `${p.name}|${p.categorySlug}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
