/**
 * Full dry-run of the PDF → POS create flow.
 * READ-ONLY — prints exactly what would be submitted to createProduct()
 * but makes NO changes to POS, Sanity, or Airtable.
 *
 * Usage:
 *   npx tsx scripts/test-full-dryrun.ts <path-to-pdf> [exchange-rate]
 *   npx tsx scripts/test-full-dryrun.ts /Users/sojisoyoye/Downloads/pi_jan_26.pdf 1400
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import * as fs from 'fs'
import * as path from 'path'
import { PDFParse } from 'pdf-parse'
import { createPOSClientFromEnv } from './pos-client'

// ── Config ────────────────────────────────────────────────────────────────────

const PDF_PATH    = process.argv[2] ?? '/Users/sojisoyoye/Downloads/pi_jan_26.pdf'
const EXCHANGE_RATE = parseFloat(process.argv[3] ?? '1400')

const SELLING_PRICE_NORMAL = 14_000   // ₦ — non-glossy 48MM
const SELLING_PRICE_GLOSSY = 15_000   // ₦ — glossy 48MM

// ── Name mapping ──────────────────────────────────────────────────────────────

// Spelling corrections from PDF supplier names → POS names
const SPELLING_FIXES: Record<string, string> = {
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

// Special cases: parenthetical products that get their own POS name
// key = substring found in the raw PDF name (lowercase)
const PARENTHETICAL_NAMES: Record<string, string> = {
  'spider':      'Spider',
  'carpet':      'Carpet',
  'dark floral': 'Dark Floral',
  'basket':      'Basket',
}

function applySpellingFixes(name: string): string {
  let result = name
  for (const [wrong, right] of Object.entries(SPELLING_FIXES)) {
    result = result.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right)
  }
  return result
}

function applyColorPrefix(name: string): string {
  // Pure numeric codes e.g. "5201" → "Color 5201"
  return name.replace(/^(\d{3,5})$/, 'Color $1')
}

// Extract content inside parentheses/brackets (ASCII or Unicode)
function extractParenthetical(raw: string): string {
  const m = raw.match(/[(\[（]([^)\]）]+)[)\]）]/)
  return m ? m[1].trim().toLowerCase() : ''
}

function pdfNameToPosName(raw: string): string {
  const isGlossy = /Glossy\s*$/i.test(raw)

  // Check for parenthetical special names first
  const paren = extractParenthetical(raw)
  for (const [key, posLabel] of Object.entries(PARENTHETICAL_NAMES)) {
    if (paren.includes(key)) {
      return isGlossy ? `${posLabel} 48MM Gloss` : `${posLabel} 48MM`
    }
  }

  // Strip face suffix and any parenthetical
  let color = raw
    .replace(/\s*[\[(（][^)\]）]*[)\]）]/g, '')  // remove parenthetical
    .replace(/\s+Glossy\s*$/i, '')
    .replace(/\s+Matt\s*$/i, '')
    .replace(/\s+Embossed\s*$/i, '')
    .trim()

  color = applyColorPrefix(color)
  color = applySpellingFixes(color)

  return isGlossy ? `${color} 48MM Gloss` : `${color} 48MM`
}

// ── PDF row extraction (name + USD unit price) ────────────────────────────────

interface InvoiceRow {
  pdfName: string        // raw name from PDF (title-cased)
  posName: string        // mapped POS name
  usdUnitPrice: number   // unit price from PDF in USD
  face: 'Matt' | 'Embossed' | 'Glossy' | 'Unknown'
}

function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)
    .join(' ')
}

function extractInvoiceRows(text: string): InvoiceRow[] {
  const lines = text.split('\n')
  const rows: InvoiceRow[] = []

  for (const line of lines) {
    if (!line.trim()) continue

    const parts = line.split('\t').map(p => p.trim()).filter(Boolean)
    if (parts.length < 7) continue
    if (!/^\d+$/.test(parts[0])) continue
    const rowNum = parseInt(parts[0])
    if (rowNum < 1 || rowNum > 9999) continue

    let right = parts.length - 1

    // Strip right-to-left: collect US$ prices, then numeric qty columns
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
    const rawName = toTitleCase(nameParts.join(' ').trim())
    if (!rawName || rawName.length < 2) continue

    // Unit price is the first of the two US$ values (smaller one = per-roll price)
    const usdUnitPrice = Math.min(...usdValues)

    const face: InvoiceRow['face'] = /Glossy\s*$/i.test(rawName)
      ? 'Glossy'
      : /Matt\s*$/i.test(rawName)
      ? 'Matt'
      : /Embossed\s*$/i.test(rawName)
      ? 'Embossed'
      : 'Unknown'

    rows.push({
      pdfName: rawName,
      posName: pdfNameToPosName(rawName),
      usdUnitPrice,
      face,
    })
  }

  return rows
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const absPath = path.resolve(PDF_PATH)
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`)
    process.exit(1)
  }

  console.log(`\n📄 PDF:           ${path.basename(absPath)}`)
  console.log(`💱 Exchange rate: ₦${EXCHANGE_RATE.toLocaleString()} / USD\n`)

  // Parse PDF
  const buffer = fs.readFileSync(absPath)
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  await parser.destroy()

  const rows = extractInvoiceRows(result.text)
  console.log(`✅ Extracted ${rows.length} product rows from PDF\n`)

  // Check POS (read-only)
  console.log('🔍 Checking POS (read-only)…\n')
  const pos = createPOSClientFromEnv()
  await pos.login()
  const allPos = await pos.getProducts()
  const posNameMap = new Map(allPos.map(p => [p.parsedName.toLowerCase(), p]))

  const existing: Array<{ row: InvoiceRow; posPrice: string; stock: string }> = []
  const toCreate: Array<{ row: InvoiceRow; costPrice: number; sellingPrice: number }> = []
  const duplicateNames = new Set<string>()

  for (const row of rows) {
    const match = posNameMap.get(row.posName.toLowerCase())
    if (match) {
      existing.push({
        row,
        posPrice: match.parsedPrice ? `₦${match.parsedPrice.toLocaleString()}` : 'no price',
        stock: match.parsedStock > 0 ? `${match.parsedStock} in stock` : 'out of stock',
      })
    } else {
      const costPrice  = Math.round(row.usdUnitPrice * EXCHANGE_RATE)
      const sellingPrice = row.face === 'Glossy' ? SELLING_PRICE_GLOSSY : SELLING_PRICE_NORMAL
      if (duplicateNames.has(row.posName.toLowerCase())) {
        console.warn(`⚠️  Duplicate proposed POS name: "${row.posName}" — check mapping`)
      }
      duplicateNames.add(row.posName.toLowerCase())
      toCreate.push({ row, costPrice, sellingPrice })
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────

  if (existing.length > 0) {
    console.log(`✅ Already in POS — will be skipped (${existing.length}):\n`)
    for (const e of existing) {
      console.log(`  "${e.row.pdfName}" → "${e.row.posName}" | ${e.posPrice} | ${e.stock}`)
    }
  }

  if (toCreate.length > 0) {
    console.log(`\n🆕 New products — would be created (${toCreate.length}):\n`)
    for (const c of toCreate) {
      console.log(`  PDF name:      "${c.row.pdfName}"`)
      console.log(`  POS name:      "${c.row.posName}"`)
      console.log(`  Face:          ${c.row.face}`)
      console.log(`  USD unit price: $${c.row.usdUnitPrice}`)
      console.log(`  Cost price:    ₦${c.costPrice.toLocaleString()} ($${c.row.usdUnitPrice} × ${EXCHANGE_RATE})`)
      console.log(`  Selling price: ₦${c.sellingPrice.toLocaleString()}`)
      console.log(`  Category:      Edge Tape (4137)`)
      console.log(`  Unit:          Roll (2097)`)
      console.log()
    }
  }

  console.log('─'.repeat(60))
  console.log(`📊 Summary: ${existing.length} already in POS | ${toCreate.length} would be created`)
  console.log('─'.repeat(60))
  console.log('\n✅ Dry-run complete. No changes were made to POS.\n')
}

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1) })
