/**
 * POS → Sanity Sync Script
 *
 * Pulls products from the inventory app and upserts them into Sanity CMS.
 * - New products are created with full inferred metadata.
 * - Existing products only have price + stockStatus updated (preserving
 *   any images, descriptions, etc. that were manually set in Sanity Studio).
 *
 * Usage:
 *   npm run sync                              # sync all products
 *   npm run sync -- --category=block-boards  # sync one Sanity category
 *   npm run sync -- --dry-run                # preview without writing
 */

import { createClient } from 'next-sanity'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' }) // fallback — .env.local values take precedence

// ── Sanity client ────────────────────────────────────────────────────────────

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

// ── Config ───────────────────────────────────────────────────────────────────

const POS_URL = (process.env.INVENTORY_APP_URL || 'https://pos.virtualrx.com.ng').replace(/\/$/, '')
const POS_USER = process.env.INVENTORY_APP_USERNAME || ''
const POS_PASS = process.env.INVENTORY_APP_PASSWORD || ''

// ── CLI args ─────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const filterCategory = argv.find(a => a.startsWith('--category='))?.split('=')[1]
const isDryRun = argv.includes('--dry-run')

// ── Types ────────────────────────────────────────────────────────────────────

interface POSProduct {
  id: number
  sku: string
  product: string         // HTML string — strip before use
  category: string
  unit: string
  current_stock: string   // e.g. "36.0 Pieces"
  max_price: string       // e.g. "26000.0000"
  selling_price: string   // e.g. "<div ...>₦ 26,000.00</div>"
  is_inactive: number
  not_for_selling: number
}

// ── Cookie jar ───────────────────────────────────────────────────────────────

const jar: Record<string, string> = {}

function updateJar(headers: Headers): void {
  const setCookies: string[] =
    typeof (headers as any).getSetCookie === 'function'
      ? (headers as any).getSetCookie()
      : (headers.get('set-cookie') ?? '').split(/,(?=[^ ])/).filter(Boolean)

  for (const c of setCookies) {
    const [kv] = c.split(';')
    const eq = kv.indexOf('=')
    if (eq > 0) jar[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim()
  }
}

function cookieHeader(): string {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
}

// ── POS auth & fetch ─────────────────────────────────────────────────────────

async function loginToPOS(): Promise<void> {
  const loginPage = await fetch(`${POS_URL}/login`)
  updateJar(loginPage.headers)
  const html = await loginPage.text()

  const csrf = html.match(/name="_token"\s+value="([^"]+)"/)?.[1]
  if (!csrf) throw new Error('CSRF token not found on POS login page')

  const res = await fetch(`${POS_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader(),
    },
    body: new URLSearchParams({ _token: csrf, username: POS_USER, password: POS_PASS }),
    redirect: 'manual',
  })
  updateJar(res.headers)

  const location = res.headers.get('location') ?? ''
  if (!location.includes('/home')) {
    throw new Error(`POS login failed — redirected to: ${location || '(no redirect)'}`)
  }
}

async function fetchPOSProducts(): Promise<POSProduct[]> {
  const res = await fetch(`${POS_URL}/products?per_page=500`, {
    headers: {
      Cookie: cookieHeader(),
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
  const data = await res.json()
  return data.data ?? []
}

// ── Mapping helpers ──────────────────────────────────────────────────────────

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

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/0\.5[×*]48/g, '05x48')
    .replace(/[()]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Maps a POS product name + category to the Sanity category slug.
 */
function inferSanityCategory(name: string, posCategory: string): string {
  const n = name.toUpperCase()
  const cat = posCategory.toUpperCase()

  if (/ BB($| )/i.test(n) || n.endsWith('BB')) return 'block-boards'
  if (n.includes('MDF UV') || n.includes('HDF UV')) return 'uv-gloss-boards'
  if (cat.includes('EDGE TAPE') || /\d+\s*(MM|mm)/.test(name)) return 'edge-tapes'
  if (n.includes('MARINE')) return 'marine-boards'
  if (n.includes('HDF')) return 'hdf-boards'
  if (n.includes('MDF')) return 'mdf-boards'
  if (n.includes('DOOR')) return 'doors'
  if (n.includes('PU') || n.includes('STONE')) return 'pu-stone-panels'
  return 'accessories'
}

function inferMaterialType(name: string, posCategory: string): string {
  const n = name.toUpperCase()
  const cat = posCategory.toUpperCase()

  if (/ BB($| )/i.test(n) || n.endsWith('BB')) return 'Block Board'
  if (n.includes('HDF')) return 'HDF'
  if (n.includes('MDF')) return 'MDF'
  if (cat.includes('EDGE TAPE') || /\d+\s*(MM|mm)/.test(name)) return 'Edge Tape'
  if (n.includes('MARINE')) return 'Marine Board'
  if (n.includes('DOOR')) return 'Door'
  if (n.includes('PU') || n.includes('STONE')) return 'PU Stone Panel'
  return 'MDF'
}

function inferColorFinish(name: string): string {
  return name
    .replace(/\s+HDF\s+UV\s*Board?/i, '')
    .replace(/\s+MDF\s+UV\s*Board?/i, '')
    .replace(/\s+HDF\s+UV/i, '')
    .replace(/\s+MDF\s+UV/i, '')
    .replace(/\s+BB\s*Board?/i, '')
    .replace(/\s+BB$/i, '')
    .replace(/\s+HDF/i, '')
    .replace(/\s+MDF/i, '')
    .replace(/\s+\d+\.?\d*\s*(MM|mm).*$/i, '')
    .replace(/\s+Board$/i, '')
    .trim()
}

function buildShortDescription(name: string, category: string, colorFinish: string): string {
  if (category === 'block-boards') {
    return `${colorFinish} block board with solid timber core and veneer facing. Strong and stable for heavy-duty furniture and structural panelling. Available at Modish Standard, Lagos.`
  }
  if (category === 'uv-gloss-boards') {
    const base = name.toUpperCase().includes('HDF') ? 'HDF' : 'MDF'
    return `UV gloss ${base} board in ${colorFinish} finish. Premium quality for kitchens, wardrobes, and cabinetry. Sold per piece. Available in Lagos, Nigeria.`
  }
  if (category === 'edge-tapes') {
    return `${colorFinish} edge banding tape. Matches standard MDF and HDF board finishes. Available at Modish Standard, Lagos.`
  }
  if (category === 'mdf-boards') {
    return `${colorFinish} MDF board for furniture and interior use. Smooth surface, consistent density. Available at Modish Standard, Lagos.`
  }
  if (category === 'hdf-boards') {
    return `${colorFinish} HDF board with superior strength and ultra-smooth surface. Available at Modish Standard, Lagos.`
  }
  return `${name}. Premium quality product from Modish Standard, Lagos.`
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function sync() {
  console.log(`\n🔄 POS → Sanity Sync${isDryRun ? ' [DRY RUN]' : ''}`)
  if (filterCategory) console.log(`   Category filter: ${filterCategory}`)
  console.log()

  // 1. Auth
  process.stdout.write('🔑 Logging into POS… ')
  await loginToPOS()
  console.log('✓')

  // 2. Fetch
  process.stdout.write('📦 Fetching products from POS… ')
  const rawProducts = await fetchPOSProducts()
  console.log(`${rawProducts.length} products found`)

  // 3. Filter to active, for-sale products
  const products = rawProducts.filter(p => !p.is_inactive && !p.not_for_selling)

  // 4. Map + optionally filter by Sanity category
  const mapped = products
    .map(p => {
      const name = stripHtml(p.product)
      const categorySlug = inferSanityCategory(name, p.category)
      const materialType = inferMaterialType(name, p.category)
      const colorFinish = inferColorFinish(name)
      const stock = parseStockQty(p.current_stock)
      const price = parseSellingPrice(p.selling_price) || parseFloat(p.max_price) || 0
      const stockStatus: 'in_stock' | 'out_of_stock' = stock > 0 ? 'in_stock' : 'out_of_stock'
      const slug = toSlug(name)

      return {
        _id: `product-sku-${p.sku}`,
        _type: 'product' as const,
        sku: p.sku,
        name,
        slug: { _type: 'slug' as const, current: slug },
        categorySlug,
        materialType,
        colorFinish,
        price,
        stockStatus,
        shortDescription: buildShortDescription(name, categorySlug, colorFinish),
        metaTitle: `${name} | Lagos Nigeria — Modish Standard`.slice(0, 70),
        metaDescription: `Buy ${name} in Lagos. ${buildShortDescription(name, categorySlug, colorFinish)}`.slice(0, 160),
      }
    })
    .filter(p => !filterCategory || p.categorySlug === filterCategory)

  if (mapped.length === 0) {
    console.log('\n⚠️  No matching products found. Check the --category value.')
    return
  }

  // 5. Fetch existing Sanity products to decide create vs patch
  const existingIds: string[] = await sanity.fetch(
    '*[_type == "product"]._id'
  )
  const existingSet = new Set(existingIds)

  // 6. Fetch Sanity category refs (needed for new products)
  const sanityCategories: Array<{ _id: string; slug: { current: string } }> = await sanity.fetch(
    '*[_type == "category"]{ _id, slug }'
  )
  const categoryRefMap = Object.fromEntries(
    sanityCategories.map(c => [c.slug.current, c._id])
  )

  console.log(`\n📝 Processing ${mapped.length} products…\n`)

  let created = 0
  let updated = 0
  let skipped = 0

  for (const p of mapped) {
    const isExisting = existingSet.has(p._id)
    const categoryRef = categoryRefMap[p.categorySlug]

    if (!categoryRef) {
      console.log(`  ⚠️  SKU ${p.sku} — no Sanity category found for "${p.categorySlug}", skipping`)
      skipped++
      continue
    }

    if (isDryRun) {
      const action = isExisting ? '[UPDATE]' : '[CREATE]'
      console.log(`  ${action} ${p.sku} — ${p.name} (${p.categorySlug}) ₦${p.price.toLocaleString()} ${p.stockStatus}`)
      isExisting ? updated++ : created++
      continue
    }

    if (isExisting) {
      // Patch only price + stockStatus to preserve manually-set fields
      await sanity
        .patch(p._id)
        .set({ price: p.price, stockStatus: p.stockStatus })
        .commit()
      console.log(`  ✓ Updated  ${p.sku} — ${p.name} (₦${p.price.toLocaleString()}, ${p.stockStatus})`)
      updated++
    } else {
      // Create full product document
      await sanity.createOrReplace({
        _id: p._id,
        _type: p._type,
        name: p.name,
        slug: p.slug,
        category: { _type: 'reference', _ref: categoryRef },
        shortDescription: p.shortDescription,
        price: p.price,
        materialType: p.materialType,
        colorFinish: p.colorFinish,
        stockStatus: p.stockStatus,
        isFeatured: false,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
      })
      console.log(`  ✨ Created  ${p.sku} — ${p.name} (₦${p.price.toLocaleString()}, ${p.stockStatus})`)
      created++
    }
  }

  console.log(`
✅ Sync complete${isDryRun ? ' (dry run — nothing written)' : ''}
   Created : ${created}
   Updated : ${updated}
   Skipped : ${skipped}
`)
}

sync().catch(err => {
  console.error('\n❌ Sync failed:', err.message ?? err)
  process.exit(1)
})
