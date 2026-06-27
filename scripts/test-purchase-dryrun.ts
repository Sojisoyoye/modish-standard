/**
 * Dry-run of the PDF → POS purchase order flow.
 * READ-ONLY — shows exactly what would be submitted but makes NO changes.
 *
 * Usage:
 *   npx tsx scripts/test-purchase-dryrun.ts <path-to-pdf> [exchange-rate] [shipping]
 *   npx tsx scripts/test-purchase-dryrun.ts /Users/sojisoyoye/Downloads/pi_jan_26.pdf 1400 1350000
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import * as fs from 'fs'
import * as path from 'path'
import { PDFParse } from 'pdf-parse'
import { createPOSClientFromEnv } from './pos-client'
import { parseInvoiceRowsRich } from './parse-product-doc'

const SELLING_PRICE_NORMAL = 14_000
const SELLING_PRICE_GLOSSY = 15_000

const PDF_PATH      = process.argv[2] ?? '/Users/sojisoyoye/Downloads/pi_jan_26.pdf'
const EXCHANGE_RATE = parseFloat(process.argv[3] ?? '1400')
const SHIPPING      = parseFloat(process.argv[4] ?? '0')

async function main() {
  const absPath = path.resolve(PDF_PATH)
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`)
    process.exit(1)
  }

  console.log(`\n📄 PDF:           ${path.basename(absPath)}`)
  console.log(`💱 Exchange rate: ₦${EXCHANGE_RATE.toLocaleString()} / USD`)
  console.log(`🚚 Shipping:      ₦${SHIPPING.toLocaleString()}\n`)

  // ── Parse PDF ────────────────────────────────────────────────────────────────

  const buffer = fs.readFileSync(absPath)
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  await parser.destroy()

  const rows = parseInvoiceRowsRich(result.text)
  console.log(`✅ Parsed ${rows.length} invoice rows from PDF\n`)

  // ── POS product lookup (read-only) ────────────────────────────────────────────

  console.log('🔍 Looking up products in POS via /purchases/get_products…\n')
  const pos = createPOSClientFromEnv()
  await pos.login()

  const found: Array<{
    posName: string; productId: string; variationId: string; unitId: string
    quantity: number; usdUnitPrice: number; face: string
  }> = []
  const missing: string[] = []

  for (const row of rows) {
    const match = await pos.searchProductForPurchase(row.posName)
    if (match) {
      found.push({
        posName:      row.posName,
        productId:    match.productId,
        variationId:  match.variationId,
        unitId:       row.categorySlug === 'edge-tapes' ? '2097' : '2094',
        quantity:     row.quantity,
        usdUnitPrice: row.usdUnitPrice,
        face:         row.face,
      })
    } else {
      missing.push(row.posName)
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────────

  if (missing.length > 0) {
    console.log(`❌ NOT FOUND in POS (${missing.length}) — purchase cannot proceed without these:\n`)
    for (const n of missing) console.log(`   • ${n}`)
    console.log()
  }

  if (found.length > 0) {
    console.log(`✅ Found in POS (${found.length}) — purchase lines:\n`)
    let subtotal = 0
    for (const line of found) {
      const cost      = Math.round(line.usdUnitPrice * EXCHANGE_RATE)
      const sell      = line.face === 'Glossy' ? SELLING_PRICE_GLOSSY : SELLING_PRICE_NORMAL
      const lineTotal = cost * line.quantity
      subtotal += lineTotal
      console.log(`  • ${line.posName}`)
      console.log(`    product_id=${line.productId}  variation_id=${line.variationId}  unit_id=${line.unitId}`)
      console.log(`    qty=${line.quantity}  cost=₦${cost.toLocaleString()}  sell=₦${sell.toLocaleString()}  line_total=₦${lineTotal.toLocaleString()}`)
      console.log()
    }

    const grandTotal = subtotal + SHIPPING
    console.log('─'.repeat(60))
    console.log(`📊 Subtotal:    ₦${subtotal.toLocaleString()}`)
    if (SHIPPING > 0) console.log(`   Shipping:    ₦${SHIPPING.toLocaleString()}`)
    console.log(`   Grand total: ₦${grandTotal.toLocaleString()}`)
    console.log('─'.repeat(60))
    console.log()

    console.log('📝 Would POST to /purchases with these fields:')
    const now = new Date()
    const d = String(now.getDate()).padStart(2, '0')
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const y = now.getFullYear()
    const h = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    console.log(`  contact_id:       <supplier id>`)
    console.log(`  transaction_date: ${d}-${m}-${y} ${h}:${min}`)
    console.log(`  status:           ordered`)
    console.log(`  location_id:      952`)
    console.log(`  shipping_charges: ${SHIPPING}`)
    console.log(`  total_before_tax: ${subtotal.toFixed(2)}`)
    console.log(`  final_total:      ${grandTotal.toFixed(2)}`)
    console.log(`  purchases[N]...:  ${found.length} line items`)
  }

  if (missing.length > 0) {
    console.log(`\n⚠️  Cannot create purchase — ${missing.length} product(s) missing from POS.`)
    console.log('   Use /add with this PDF first, then retry /purchase.\n')
  } else {
    console.log('\n✅ Dry-run complete. All products found — purchase order is ready to create.')
    console.log('   No changes were made to POS.\n')
  }
}

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1) })
