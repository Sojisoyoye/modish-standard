/**
 * Modish Standard — Telegram Bot
 *
 * Provides two workflows:
 *   1. Add products to POS (text input or file upload → check → create)
 *   2. Sync POS → Sanity CMS
 *
 * Usage:
 *   tsx scripts/telegram-bot.ts
 *
 * Required env vars:
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_AUTHORIZED_USER_IDS  (comma-separated numeric Telegram user IDs)
 *   INVENTORY_APP_URL
 *   INVENTORY_APP_USERNAME
 *   INVENTORY_APP_PASSWORD
 *   NEXT_PUBLIC_SANITY_PROJECT_ID
 *   NEXT_PUBLIC_SANITY_DATASET
 *   SANITY_API_TOKEN
 *   POS_API_KEY                   (Bearer token for the HTTP API server on :3001)
 *   CLOUDINARY_CLOUD_NAME         (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import * as http from 'node:http'
import { PDFParse } from 'pdf-parse'
import { Telegraf, session, Markup, Context } from 'telegraf'
import { createClient } from 'next-sanity'
import { v2 as cloudinary } from 'cloudinary'
import { POSClient, createPOSClientFromEnv, type POSProduct, type PurchaseLine, type CreatePurchaseInput } from './pos-client'
import {
  parseCSV,
  parseExcel,
  parseTextInput,
  parseInvoiceRowsRich,
  pdfNameToPosName,
  type ParsedProduct,
  type InvoiceRow,
} from './parse-product-doc'

// ── Sanity client ─────────────────────────────────────────────────────────────

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

// ── Cloudinary client ─────────────────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function cloudinaryUploadBuffer(buffer: Buffer, publicId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, overwrite: true, invalidate: true },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('No upload result'))
        resolve(result.secure_url)
      }
    )
    stream.end(buffer)
  })
}

// ── Airtable helper ───────────────────────────────────────────────────────────

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appFae9SCFcGV98BO'
const AIRTABLE_PRODUCT_TABLE = 'Product Catalog'

async function airtableUpsertProduct(fields: Record<string, unknown>): Promise<void> {
  const key = process.env.AIRTABLE_API_KEY
  if (!key) throw new Error('AIRTABLE_API_KEY is not set')
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PRODUCT_TABLE)}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      performUpsert: { fieldsToMergeOn: ['SKU'] },
      records: [{ fields }],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Airtable ${res.status}: ${body}`)
  }
}

async function airtableSearch(formula: string): Promise<Array<{ id: string; fields: Record<string, unknown> }>> {
  const key = process.env.AIRTABLE_API_KEY
  if (!key) throw new Error('AIRTABLE_API_KEY is not set')
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PRODUCT_TABLE)}?filterByFormula=${encodeURIComponent(formula)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Airtable ${res.status}: ${body}`)
  }
  const data = await res.json() as { records: Array<{ id: string; fields: Record<string, unknown> }> }
  return data.records
}

async function airtablePatchRecords(records: Array<{ id: string; fields: Record<string, unknown> }>): Promise<void> {
  const key = process.env.AIRTABLE_API_KEY
  if (!key) throw new Error('AIRTABLE_API_KEY is not set')
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PRODUCT_TABLE)}`
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10)
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: batch }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Airtable ${res.status}: ${body}`)
    }
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

const AUTHORIZED_IDS: Set<number> = new Set(
  (process.env.TELEGRAM_AUTHORIZED_USER_IDS || '')
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n))
)

function isAuthorized(userId: number | undefined): boolean {
  if (!userId) return false
  return AUTHORIZED_IDS.has(userId)
}

// ── Session types ─────────────────────────────────────────────────────────────

interface SessionData {
  step?: 'await_product_text' | 'await_add_location' | 'await_add_category' | 'await_confirm_create' | 'await_sync_after_create' | 'await_image_photo' | 'await_category_description' | 'await_sanity_product_category' | 'await_sanity_product_price' | 'await_sanity_product_description' | 'await_invoice_location' | 'await_exchange_rate_for_invoice' | 'await_invoice_confirm' | 'await_purchase_file' | 'await_purchase_missing_confirm' | 'await_purchase_disambig' | 'await_purchase_location' | 'await_purchase_supplier' | 'await_purchase_rate' | 'await_purchase_status' | 'await_purchase_shipping' | 'await_purchase_shipping_label' | 'await_purchase_confirm' | 'await_invoice_disambig'
  pendingCreate?: ParsedProduct[]
  pendingCategories?: string[]
  pendingImageSlug?: string
  pendingImageProductName?: string
  pendingCategoryName?: string
  pendingCategorySlug?: string
  pendingSanityProductName?: string
  pendingSanityProductSlug?: string
  pendingSanityProductCategoryId?: string
  pendingSanityProductCategorySlug?: string
  pendingSanityProductCategoryName?: string
  pendingSanityProductPrice?: number
  pendingInvoiceNewRows?: InvoiceRow[]
  pendingInvoiceExchangeRate?: number
  pendingInvoiceCategorySlugs?: string[]
  pendingPurchaseLines?: Array<{
    posName: string
    productId: string
    variationId: string
    unitId: string
    quantity: number
    usdUnitPrice: number
    face: 'Matt' | 'Embossed' | 'Glossy' | 'Unknown'
  }>
  pendingPurchaseMissingRows?: InvoiceRow[]
  pendingPurchaseNeedsCreate?: boolean
  pendingInvoiceLocationId?: string
  pendingAddLocationId?: string
  pendingAddCategoryOverride?: string
  pendingPurchaseLocationId?: string
  pendingPurchaseSupplierId?: string
  pendingPurchaseSupplierName?: string
  pendingPurchaseExchangeRate?: number
  pendingPurchaseStatus?: 'ordered' | 'received' | 'pending'
  pendingPurchaseShipping?: number
  pendingPurchaseShippingLabel?: string
  pendingPurchaseDisambigQueue?: Array<{
    row: InvoiceRow
    candidates: Array<{ productId: string; variationId: string; posName: string }>
  }>
  pendingInvoiceDisambigQueue?: Array<{
    row: InvoiceRow
    candidates: Array<{ posName: string }>
  }>
}

interface BotContext extends Context {
  session: SessionData
}

// ── Sanity sync helper ────────────────────────────────────────────────────────

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

interface SyncResult {
  created: number
  updated: number
  skipped: number
}

async function runSync(categorySlug?: string): Promise<SyncResult> {
  const pos = createPOSClientFromEnv()
  await pos.login()
  const rawProducts = await pos.getProducts()

  const active = rawProducts.filter(p => !p.is_inactive && !p.not_for_selling)

  interface MappedProduct {
    _id: string
    _type: 'product'
    sku: string
    name: string
    slug: { _type: 'slug'; current: string }
    categorySlug: string
    materialType: string
    colorFinish: string
    price: number
    stockStatus: 'in_stock' | 'out_of_stock'
    shortDescription: string
    metaTitle: string
    metaDescription: string
  }

  const mapped: MappedProduct[] = active
    .map((p): MappedProduct => {
      const name = p.parsedName
      const posCategory = stripHtml(p.category)
      const catSlug = inferSanityCategory(name, posCategory)
      const materialType = inferMaterialType(name, posCategory)
      const colorFinish = inferColorFinish(name)
      const stock = p.parsedStock
      const price = p.parsedPrice
      const stockStatus: 'in_stock' | 'out_of_stock' = stock > 0 ? 'in_stock' : 'out_of_stock'
      const slug = toSlug(name)
      const shortDescription = buildShortDescription(name, catSlug, colorFinish)

      return {
        _id: `product-${slug}`,
        _type: 'product',
        sku: p.sku,
        name,
        slug: { _type: 'slug', current: slug },
        categorySlug: catSlug,
        materialType,
        colorFinish,
        price,
        stockStatus,
        shortDescription,
        metaTitle: `${name} | Lagos Nigeria — Modish Standard`.slice(0, 70),
        metaDescription: `Buy ${name} in Lagos. ${shortDescription}`.slice(0, 160),
      }
    })
    .filter(p => !categorySlug || p.categorySlug === categorySlug)

  const allIds: string[] = await sanity.fetch('*[_type == "product"]._id')
  const existingIds = allIds.filter((id: string) => !id.startsWith('product-sku-'))
  const existingSet = new Set(existingIds)

  const sanityCategories: Array<{ _id: string; slug: { current: string } }> = await sanity.fetch(
    '*[_type == "category"]{ _id, slug }'
  )
  const categoryRefMap = Object.fromEntries(
    sanityCategories.map(c => [c.slug.current, c._id])
  )

  let created = 0
  let updated = 0
  let skipped = 0

  for (const p of mapped) {
    const isExisting = existingSet.has(p._id)
    const categoryRef = categoryRefMap[p.categorySlug]

    if (!categoryRef) {
      skipped++
      continue
    }

    if (isExisting) {
      await sanity.patch(p._id).set({ price: p.price, stockStatus: p.stockStatus }).commit()
      updated++
    } else {
      await sanity.createOrReplace({
        _id: p._id,
        _type: p._type,
        sku: p.sku,
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
      created++
    }
  }

  return { created, updated, skipped }
}

// ── Invoice price constants ───────────────────────────────────────────────────

const INVOICE_SELLING_PRICE_NORMAL = 14_000
const INVOICE_SELLING_PRICE_GLOSSY = 15_000

// ── Suppliers (numeric DB IDs from POS /contacts) ────────────────────────────

const SUPPLIERS = [
  { id: '59730', name: 'Mr Adward Shouguang' },
  { id: '91674', name: 'Miss Susan Sunstar' },
  { id: '56902', name: 'Mr Soji Soyoye' },
]

// ── Format helpers ────────────────────────────────────────────────────────────

function formatPrice(price: number | undefined): string {
  if (!price) return 'Request Price'
  return `₦${price.toLocaleString()}`
}

function formatMissingProduct(p: ParsedProduct): string {
  const price = p.price ? ` — ${formatPrice(p.price)}` : ''
  return `• ${p.name} (${p.categorySlug})${price}`
}

function chunkText(text: string, maxLen = 4000): string[] {
  const chunks: string[] = []
  while (text.length > maxLen) {
    let cut = text.lastIndexOf('\n', maxLen)
    if (cut <= 0) cut = maxLen
    chunks.push(text.slice(0, cut))
    text = text.slice(cut)
  }
  if (text.trim()) chunks.push(text)
  return chunks
}

async function sendLong(ctx: BotContext, text: string): Promise<void> {
  const chunks = chunkText(text)
  for (const chunk of chunks) {
    await ctx.reply(chunk, { parse_mode: 'Markdown' })
  }
}

// ── Disambiguation helpers ────────────────────────────────────────────────────

async function showNextPurchaseDisambig(ctx: BotContext): Promise<void> {
  const queue = ctx.session.pendingPurchaseDisambigQueue ?? []
  if (queue.length === 0) return

  const { row, candidates } = queue[0]
  const remaining = queue.length

  let msg = `⚠️ *"${row.posName}"* not found in POS.`
  if (remaining > 1) msg += ` _(${remaining} to resolve)_`
  msg += '\n\n'

  if (candidates.length === 1) {
    msg += `Near match found:\n• *${candidates[0].posName}*\n\n`
    msg += `Is this the same product, or should I create *"${row.posName}"* as a new POS entry?`
  } else {
    msg += `Near matches found:\n`
    candidates.forEach((c, i) => { msg += `${i + 1}. *${c.posName}*\n` })
    msg += `\nWhich existing product matches, or create a new one?`
  }

  await sendLong(ctx, msg)
  const buttons = [
    ...candidates.map((c, i) => [Markup.button.callback(`✅ Use "${c.posName}"`, `pur_disambig_use_${i}`)]),
    [Markup.button.callback(`🆕 Create "${row.posName}" (new)`, 'pur_disambig_create')],
    [Markup.button.callback('❌ Cancel', 'cancel_action')],
  ]
  await ctx.reply('Choose:', Markup.inlineKeyboard(buttons))
}

async function showNextInvoiceDisambig(ctx: BotContext): Promise<void> {
  const queue = ctx.session.pendingInvoiceDisambigQueue ?? []
  if (queue.length === 0) return

  const { row, candidates } = queue[0]
  const remaining = queue.length

  let msg = `⚠️ *"${row.posName}"* not found exactly in POS.`
  if (remaining > 1) msg += ` _(${remaining} to resolve)_`
  msg += '\n\n'

  if (candidates.length === 1) {
    msg += `Near match found:\n• *${candidates[0].posName}*\n\n`
    msg += `Is this the same product? Or create *"${row.posName}"* as a new POS entry?`
  } else {
    msg += `Near matches found:\n`
    candidates.forEach((c, i) => { msg += `${i + 1}. *${c.posName}*\n` })
    msg += `\nIf any of these is the same product, skip creation. Otherwise create a new entry.`
  }

  await sendLong(ctx, msg)
  const buttons = [
    [Markup.button.callback('✅ Use existing (skip creation)', 'inv_disambig_skip')],
    [Markup.button.callback(`🆕 Create "${row.posName}" (new)`, 'inv_disambig_create')],
    [Markup.button.callback('❌ Cancel', 'cancel_action')],
  ]
  await ctx.reply('Choose:', Markup.inlineKeyboard(buttons))
}

// ── Check + summarise products against POS ────────────────────────────────────

async function checkAndSummarise(
  ctx: BotContext,
  parsed: ParsedProduct[],
  sourceName: string
): Promise<void> {
  if (parsed.length === 0) {
    await ctx.reply("Couldn't find any products in that input. Please try again.")
    return
  }

  await ctx.reply(`🔍 Checking ${parsed.length} product(s) against POS…`)

  let pos: POSClient
  let checkResult: { found: POSProduct[]; missing: string[] }

  try {
    pos = createPOSClientFromEnv()
    await pos.login()
    checkResult = await pos.checkProductsByName(parsed.map(p => p.name))
  } catch (err: any) {
    await ctx.reply(`❌ POS login failed: ${err.message ?? err}`)
    return
  }

  const foundNames = new Set(checkResult.found.map(p => p.parsedName.toLowerCase()))
  const missingParsed = parsed.filter(p => !foundNames.has(p.name.toLowerCase()))

  let msg = `📋 *${sourceName}*\n\n`

  if (checkResult.found.length > 0) {
    msg += `✅ *Already in POS (${checkResult.found.length}):*\n`
    msg += checkResult.found.map(p => `• ${p.parsedName}`).join('\n')
    msg += '\n\n'
  }

  if (missingParsed.length > 0) {
    msg += `❌ *Not in POS (${missingParsed.length}):*\n`
    msg += missingParsed.map(formatMissingProduct).join('\n')
    msg += '\n'
  } else {
    msg += '✅ All products already exist in POS.'
    await sendLong(ctx, msg)
    ctx.session = {}
    return
  }

  await sendLong(ctx, msg)

  ctx.session.pendingCreate = missingParsed
  const uniqueCategories = Array.from(new Set(missingParsed.map(p => p.categorySlug)))
  ctx.session.pendingCategories = uniqueCategories
  ctx.session.step = 'await_add_location'

  await ctx.reply(
    `Which location should these ${missingParsed.length} product(s) be created at?`,
    locationKeyboard('add_loc')
  )
}

// ── Purchase order helpers ────────────────────────────────────────────────────

async function handlePurchaseFile(ctx: BotContext, fileBuffer: Buffer, ext: string): Promise<void> {
  if (ext !== 'pdf') {
    await ctx.reply('Only PDF supplier invoices are supported for purchase orders right now.')
    ctx.session = {}
    return
  }

  let rawText = ''
  try {
    const parser = new PDFParse({ data: fileBuffer })
    const result = await parser.getText()
    await parser.destroy()
    rawText = result.text
  } catch (err: any) {
    await ctx.reply(`❌ Failed to read PDF: ${err.message ?? err}`)
    ctx.session = {}
    return
  }

  const invoiceRows = parseInvoiceRowsRich(rawText)
  if (invoiceRows.length === 0) {
    await ctx.reply(
      "❌ Couldn't detect invoice rows in this PDF.\n\nMake sure it's a supplier PI with tab-separated columns (row number, product name, quantities, US$ prices)."
    )
    ctx.session = {}
    return
  }

  await ctx.reply(`✅ Found ${invoiceRows.length} product rows. Looking up in POS…`)

  let pos: POSClient
  try {
    pos = createPOSClientFromEnv()
    await pos.login()
  } catch (err: any) {
    await ctx.reply(`❌ POS login failed: ${err.message ?? err}`)
    ctx.session = {}
    return
  }

  let lookupResults: Array<{ row: InvoiceRow; result: Awaited<ReturnType<POSClient['findProductForPurchase']>> }>
  try {
    lookupResults = await Promise.all(
      invoiceRows.map(async row => ({ row, result: await pos.findProductForPurchase(row.posName) }))
    )
  } catch (err: any) {
    await ctx.reply(`❌ POS lookup failed: ${err.message ?? err}`)
    ctx.session = {}
    return
  }

  const found: NonNullable<SessionData['pendingPurchaseLines']> = []
  const missingRows: InvoiceRow[] = []
  const disambigQueue: NonNullable<SessionData['pendingPurchaseDisambigQueue']> = []

  for (const { row, result } of lookupResults) {
    if (result.exact) {
      found.push({
        posName: row.posName,
        productId: result.exact.productId,
        variationId: result.exact.variationId,
        unitId: row.categorySlug === 'edge-tapes' ? '2097' : '2094',
        quantity: row.quantity,
        usdUnitPrice: row.usdUnitPrice,
        face: row.face,
      })
    } else if (result.nearMatches.length > 0) {
      disambigQueue.push({ row, candidates: result.nearMatches })
    } else {
      missingRows.push(row)
    }
  }

  ctx.session.pendingPurchaseLines = found

  if (disambigQueue.length > 0) {
    ctx.session.pendingPurchaseDisambigQueue = disambigQueue
    ctx.session.pendingPurchaseMissingRows = missingRows
    ctx.session.pendingPurchaseNeedsCreate = missingRows.length > 0
    ctx.session.step = 'await_purchase_disambig'

    let summary = `✅ ${found.length} found in POS.`
    if (missingRows.length > 0) summary += ` ${missingRows.length} not found.`
    summary += ` *${disambigQueue.length} need disambiguation.*`
    await ctx.reply(summary, { parse_mode: 'Markdown' })
    await showNextPurchaseDisambig(ctx)
    return
  }

  if (missingRows.length > 0) {
    ctx.session.pendingPurchaseMissingRows = missingRows
    ctx.session.pendingPurchaseNeedsCreate = true
    ctx.session.step = 'await_purchase_missing_confirm'

    let msg = `⚠️ *${missingRows.length} product(s) not yet in POS:*\n\n`
    msg += missingRows.map(r => `• ${r.posName}`).join('\n')
    if (found.length > 0) msg += `\n\n*${found.length} product(s)* are already in POS.`
    msg += `\n\nShould I create the ${missingRows.length} missing product(s) now and include all ${found.length + missingRows.length} in the purchase?`
    await sendLong(ctx, msg)
    await ctx.reply(
      'What would you like to do?',
      Markup.inlineKeyboard([
        [Markup.button.callback(`✅ Create ${missingRows.length} & continue`, 'purchase_create_and_continue')],
        [Markup.button.callback('❌ Cancel', 'cancel_action')],
      ])
    )
    return
  }

  ctx.session.step = 'await_purchase_supplier'

  await ctx.reply(
    `✅ All ${found.length} products confirmed in POS.\n\n*Which supplier is this invoice from?*`,
    { parse_mode: 'Markdown' }
  )
  await ctx.reply(
    'Select supplier:',
    Markup.inlineKeyboard([
      ...SUPPLIERS.map(s => [Markup.button.callback(s.name, `purchase_supplier_${s.id}`)]),
      [Markup.button.callback('❌ Cancel', 'cancel_action')],
    ])
  )
}

async function showPurchaseSummary(ctx: BotContext): Promise<void> {
  const lines    = ctx.session.pendingPurchaseLines ?? []
  const rate     = ctx.session.pendingPurchaseExchangeRate ?? 0
  const supplier = ctx.session.pendingPurchaseSupplierName ?? ''
  const status   = ctx.session.pendingPurchaseStatus ?? 'ordered'
  const shipping = ctx.session.pendingPurchaseShipping ?? 0
  const shLabel  = ctx.session.pendingPurchaseShippingLabel ?? ''

  let subtotal = 0
  let msg = `📋 *Purchase Order Summary*\n\n`
  msg += `*Supplier:* ${supplier}\n`
  msg += `*Status:* ${status}\n`
  msg += `*Rate:* ₦${rate.toLocaleString()}/USD\n\n`
  msg += `*Products (${lines.length}):*\n`

  for (const line of lines) {
    const cost     = Math.round(line.usdUnitPrice * rate)
    const sell     = line.face === 'Glossy' ? INVOICE_SELLING_PRICE_GLOSSY : INVOICE_SELLING_PRICE_NORMAL
    const lineTotal = cost * line.quantity
    subtotal += lineTotal
    msg += `• *${line.posName}* — ${line.quantity} × ₦${cost.toLocaleString()} = ₦${lineTotal.toLocaleString()} (sell ₦${sell.toLocaleString()})\n`
  }

  msg += `\n*Subtotal:* ₦${subtotal.toLocaleString()}\n`
  if (shipping > 0) {
    msg += `*Shipping (${shLabel || 'Shipping'}):* ₦${shipping.toLocaleString()}\n`
  }
  msg += `*Grand total:* ₦${(subtotal + shipping).toLocaleString()}`

  await sendLong(ctx, msg)
  await ctx.reply(
    `Create this purchase order in POS?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Create Purchase Order', 'confirm_purchase_create'),
        Markup.button.callback('❌ Cancel', 'cancel_action'),
      ],
    ])
  )
}

async function createMissingAndContinue(ctx: BotContext, rate: number): Promise<void> {
  const missingRows = ctx.session.pendingPurchaseMissingRows ?? []

  await ctx.reply(`✨ Creating ${missingRows.length} missing product(s) in POS…`)

  let pos: POSClient
  try {
    pos = createPOSClientFromEnv()
    await pos.login()
  } catch (err: any) {
    await ctx.reply(`❌ POS login failed: ${err.message ?? err}`)
    ctx.session = {}
    return
  }

  const createdNames: string[] = []
  const createFailures: string[] = []

  for (const row of missingRows) {
    const costPrice   = Math.round(row.usdUnitPrice * rate)
    const sellingPrice = row.face === 'Glossy' ? INVOICE_SELLING_PRICE_GLOSSY : INVOICE_SELLING_PRICE_NORMAL
    try {
      await pos.createProduct({ name: row.posName, costPrice, sellingPrice, locationId: ctx.session.pendingPurchaseLocationId ?? '928' })
      createdNames.push(row.posName)
    } catch (err: any) {
      createFailures.push(`❌ ${row.posName}: ${err.message ?? err}`)
    }
  }

  if (createFailures.length > 0) {
    await ctx.reply(
      `⚠️ Some products failed to create:\n${createFailures.join('\n')}\n\nOnly successfully created products will be in the purchase.`
    )
  }

  // Batch-verify SKUs, then re-search for product_id / variation_id
  if (createdNames.length > 0) {
    const allPos = await pos.getProducts()
    const skuMap = new Map(allPos.map(p => [p.parsedName.toLowerCase(), p.sku]))
    const skuLines: string[] = []
    for (const name of createdNames) {
      const sku = skuMap.get(name.toLowerCase()) ?? 'N/A'
      skuLines.push(`✅ ${name} (SKU: ${sku})`)
    }
    await ctx.reply(`*Created:*\n${skuLines.join('\n')}`, { parse_mode: 'Markdown' })
  }

  // Look up product_id + variation_id for each created product
  const purchaseLocationId = ctx.session.pendingPurchaseLocationId ?? '928'
  const resolveResults = await Promise.all(
    missingRows
      .filter(row => createdNames.includes(row.posName))
      .map(async row => ({ row, match: await pos.searchProductForPurchase(row.posName, purchaseLocationId) }))
  )

  const newLines: NonNullable<SessionData['pendingPurchaseLines']> = []
  const stillMissing: string[] = []

  for (const { row, match } of resolveResults) {
    if (match) {
      newLines.push({
        posName:     row.posName,
        productId:   match.productId,
        variationId: match.variationId,
        unitId:      row.categorySlug === 'edge-tapes' ? '2097' : '2094',
        quantity:    row.quantity,
        usdUnitPrice: row.usdUnitPrice,
        face:        row.face,
      })
    } else {
      stillMissing.push(row.posName)
    }
  }

  if (stillMissing.length > 0) {
    await ctx.reply(`⚠️ Created but couldn't resolve for purchase: ${stillMissing.join(', ')}\nThese will be excluded from the purchase order.`)
  }

  ctx.session.pendingPurchaseLines = [...(ctx.session.pendingPurchaseLines ?? []), ...newLines]
  ctx.session.pendingPurchaseMissingRows = undefined
  ctx.session.pendingPurchaseNeedsCreate = undefined
  ctx.session.step = 'await_purchase_supplier'

  const total = ctx.session.pendingPurchaseLines.length
  await ctx.reply(
    `✅ Done — *${total} products* ready for the purchase order.\n\n*Which supplier is this invoice from?*`,
    { parse_mode: 'Markdown' }
  )
  await ctx.reply(
    'Select supplier:',
    Markup.inlineKeyboard([
      ...SUPPLIERS.map(s => [Markup.button.callback(s.name, `purchase_supplier_${s.id}`)]),
      [Markup.button.callback('❌ Cancel', 'cancel_action')],
    ])
  )
}

// ── Bot setup ─────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set')
  process.exit(1)
}

const bot = new Telegraf<BotContext>(BOT_TOKEN)

// Session middleware (in-memory)
bot.use(session({ defaultSession: (): SessionData => ({}) }))

// Auth middleware — runs on every update
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id
  if (!isAuthorized(userId)) {
    if (ctx.chat) {
      await ctx.reply('⛔ Unauthorized. Contact the bot administrator.')
    }
    return
  }
  return next()
})

// ── /start ────────────────────────────────────────────────────────────────────

bot.command('start', async ctx => {
  ctx.session = {}
  await ctx.reply(
    `👋 *Welcome to Modish Standard Bot!*\n\n` +
    `I manage your POS inventory and sync products to the Modish Standard website.\n\n` +
    `*— Add to POS (tracked inventory):*\n` +
    `/add — Add products via text, CSV/Excel, or PDF → choose location → creates in POS → offers Sanity sync\n` +
    `/purchase — Create a formal POS purchase order from a supplier invoice PDF (with supplier, rate, shipping)\n` +
    `/sync [category] — Push POS products → Sanity website\n\n` +
    `*— Supplier invoice PDF (no command needed):*\n` +
    `Just send a supplier PI/PDF directly. I'll detect the invoice rows, check POS, ask which location to create new products at, ask the exchange rate, show cost/selling prices, then create on confirm.\n` +
    `Use /purchase instead when you also need to record a formal purchase order.\n\n` +
    `*— Add to Sanity directly (no POS):*\n` +
    `/addsanity <name> — Add a product directly to the website catalog\n` +
    `/addcategory <name> — Create a new product category\n\n` +
    `*— Content & promo:*\n` +
    `/promote <slug> — Mark one product ready → Workflow A generates a single-product post\n` +
    `/promotecategory <slug> [type] — Mark whole category ready (types: New Product · Promo · Restock Alert)\n` +
    `/campaign <tag> <category-slug> — Set Campaign Tag + trigger Workflow H multi-product campaign\n\n` +
    `*— Images:*\n` +
    `/slug <name> — Look up a product's slug by name\n` +
    `/image <slug> — Upload a photo (phone or desktop) → Cloudinary → attach to product\n` +
    `/setimage <slug> <public-id> — Link an existing Cloudinary image\n` +
    `/matchimages — Auto-match Cloudinary assets to products by slug\n\n` +
    `*— Browse & search:*\n` +
    `/find <name> — Search POS by name, get SKU + edit link\n` +
    `/list [category] — Browse POS products\n` +
    `/syncstock — Trigger n8n stock sync + content generation\n` +
    `/status — Check POS + Sanity connections\n` +
    `/cancel — Cancel current operation\n\n` +
    `*Category slugs* (for /sync, /list, /addsanity):\n` +
    `\`mdf-boards\` · \`hdf-boards\` · \`uv-gloss-boards\`\n` +
    `\`marine-boards\` · \`block-boards\` · \`edge-tapes\`\n` +
    `\`doors\` · \`pu-stone-panels\` · \`accessories\`\n\n` +
    `*Tips:*\n` +
    `• Both /add and /purchase ask which POS location (BL0001 928 or BL0002 952) before creating products\n` +
    `• /addsanity for products not tracked in inventory (e.g. display items)\n` +
    `• /add for products you want to track in POS stock, then /sync to publish\n` +
    `• /find returns a direct POS edit link for price/stock updates`,
    { parse_mode: 'Markdown' }
  )
})

// ── /cancel ───────────────────────────────────────────────────────────────────

bot.command('cancel', async ctx => {
  ctx.session = {}
  await ctx.reply('Operation cancelled.')
})

// ── /status ───────────────────────────────────────────────────────────────────

bot.command('status', async ctx => {
  await ctx.reply('🔄 Checking connections…')

  const results: string[] = []

  // Check POS
  try {
    const pos = createPOSClientFromEnv()
    await pos.login()
    const products = await pos.getProducts()
    results.push(`✅ *POS*: Connected — ${products.length} products`)
  } catch (err: any) {
    results.push(`❌ *POS*: ${err.message ?? err}`)
  }

  // Check Sanity
  try {
    const count: number = await sanity.fetch('count(*[_type == "product"])')
    results.push(`✅ *Sanity*: Connected — ${count} products`)
  } catch (err: any) {
    results.push(`❌ *Sanity*: ${err.message ?? err}`)
  }

  await ctx.reply(results.join('\n'), { parse_mode: 'Markdown' })
})

// ── /list ─────────────────────────────────────────────────────────────────────

bot.command('list', async ctx => {
  const args = ctx.message.text.split(/\s+/).slice(1)
  const filterCat = args[0] || undefined

  await ctx.reply('📦 Fetching products from POS…')

  try {
    const pos = createPOSClientFromEnv()
    await pos.login()
    let products = await pos.getProducts()

    products = products.filter(p => !p.is_inactive && !p.not_for_selling)

    if (filterCat) {
      products = products.filter(p => {
        const cat = inferSanityCategory(p.parsedName, stripHtml(p.category))
        return cat === filterCat
      })
    }

    if (products.length === 0) {
      await ctx.reply('No products found' + (filterCat ? ` in category \`${filterCat}\`` : '') + '.')
      return
    }

    const MAX = 30
    const shown = products.slice(0, MAX)
    const extra = products.length - MAX

    let msg = `📦 *Products${filterCat ? ` — ${filterCat}` : ''} (${products.length})*\n\n`
    for (const p of shown) {
      const price = p.parsedPrice ? `₦${p.parsedPrice.toLocaleString()}` : 'Request Price'
      const stock = p.parsedStock > 0 ? `${p.parsedStock} in stock` : 'out of stock'
      msg += `• *${p.parsedName}* — ${price} (${stock})\n`
    }
    if (extra > 0) {
      msg += `\n_…and ${extra} more. Use \`/list ${filterCat || '<category>'}\` to filter._`
    }

    await sendLong(ctx, msg)
  } catch (err: any) {
    await ctx.reply(`❌ Failed to fetch products: ${err.message ?? err}`)
  }
})

// ── /find ─────────────────────────────────────────────────────────────────────

bot.command('find', async ctx => {
  const query = ctx.message.text.split(/\s+/).slice(1).join(' ').trim()

  if (!query) {
    await ctx.reply('Usage: `/find <product name or partial name>`\nExample: `/find wenge bb`', { parse_mode: 'Markdown' })
    return
  }

  await ctx.reply(`🔍 Searching POS for "*${query}*"…`, { parse_mode: 'Markdown' })

  try {
    const pos = createPOSClientFromEnv()
    await pos.login()
    const all = await pos.getProducts()

    const q = query.toLowerCase()
    const matches = all.filter(p =>
      p.parsedName.toLowerCase().includes(q) ||
      stripHtml(p.category).toLowerCase().includes(q)
    )

    if (matches.length === 0) {
      await ctx.reply(`No products found matching "*${query}*". Try a shorter search term.`, { parse_mode: 'Markdown' })
      return
    }

    let msg = `🔍 *Found ${matches.length} product(s) matching "${query}":*\n\n`
    for (const p of matches.slice(0, 20)) {
      const price = p.parsedPrice ? `₦${p.parsedPrice.toLocaleString()}` : 'No price'
      const stock = p.parsedStock > 0 ? `${p.parsedStock} in stock` : 'out of stock'
      const editUrl = `${process.env.INVENTORY_APP_URL || 'https://pos.virtualrx.com.ng'}/products/${p.id}/edit`
      msg += `*${p.parsedName}*\n`
      msg += `SKU: \`${p.sku}\` | ${price} | ${stock}\n`
      msg += `Edit: ${editUrl}\n\n`
    }
    if (matches.length > 20) {
      msg += `_…and ${matches.length - 20} more. Refine your search to narrow results._`
    }

    await sendLong(ctx, msg)
  } catch (err: any) {
    await ctx.reply(`❌ Search failed: ${err.message ?? err}`)
  }
})

// ── /syncstock ────────────────────────────────────────────────────────────────

bot.command('syncstock', async ctx => {
  const webhookUrl = process.env.N8N_STOCKSYNC_WEBHOOK_URL

  if (!webhookUrl) {
    await ctx.reply(
      `⚠️ *N8N_STOCKSYNC_WEBHOOK_URL is not configured.*\n\n` +
      `To enable this command:\n` +
      `1. Open Workflow J in n8n at https://n8n.modishstandard.com\n` +
      `2. Add a *Webhook* trigger node\n` +
      `3. Copy the webhook URL\n` +
      `4. Add it to \`.env.bot\` on the server:\n` +
      `\`N8N_STOCKSYNC_WEBHOOK_URL=https://n8n.modishstandard.com/webhook/...\`\n` +
      `5. Restart the bot: \`docker-compose up -d product-bot\``,
      { parse_mode: 'Markdown' }
    )
    return
  }

  await ctx.reply('🔄 Triggering stock sync to Airtable via n8n…')

  try {
    const res = await fetch(webhookUrl, { method: 'POST' })
    if (!res.ok) {
      await ctx.reply(`❌ n8n returned an error: HTTP ${res.status}`)
      return
    }
    await ctx.reply(
      `✅ *Stock sync triggered!*\n\n` +
      `Workflow J is now running — it will pull POS stock and update Airtable.\n` +
      `Content workflows (A/E) will pick up new/restocked products within their next scheduled run.`,
      { parse_mode: 'Markdown' }
    )
  } catch (err: any) {
    await ctx.reply(`❌ Failed to reach n8n: ${err.message ?? err}`)
  }
})

// ── /sync ─────────────────────────────────────────────────────────────────────

bot.command('sync', async ctx => {
  const args = ctx.message.text.split(/\s+/).slice(1)
  const categorySlug = args[0] || undefined

  const label = categorySlug ? `category *${categorySlug}*` : 'all products'
  await ctx.reply(`🔄 Syncing ${label} from POS → Sanity…`)

  try {
    const result = await runSync(categorySlug)
    await ctx.reply(
      `✅ *Sync complete!*\n\n` +
      `✨ Created: ${result.created}\n` +
      `🔄 Updated: ${result.updated}\n` +
      `⚠️ Skipped: ${result.skipped}`,
      { parse_mode: 'Markdown' }
    )
  } catch (err: any) {
    await ctx.reply(`❌ Sync failed: ${err.message ?? err}`)
  }
})

// ── /image ────────────────────────────────────────────────────────────────────

bot.command('image', async ctx => {
  const arg = ctx.message.text.split(/\s+/).slice(1).join(' ').trim()

  if (!arg) {
    await ctx.reply(
      'Usage: `/image <slug-or-sku>`\nExample: `/image wenge-bb-board`',
      { parse_mode: 'Markdown' }
    )
    return
  }

  await ctx.reply('🔍 Looking up product…')

  let product: { name: string; slug: { current: string } } | null = null
  try {
    product = await sanity.fetch(
      `*[_type == "product" && (slug.current == $q || sku == $q)][0]{ name, slug }`,
      { q: arg }
    )
  } catch (err: any) {
    await ctx.reply(`❌ Sanity lookup failed: ${err.message ?? err}`)
    return
  }

  if (!product) {
    await ctx.reply(`❌ No product found with slug or SKU \`${arg}\`.`, { parse_mode: 'Markdown' })
    return
  }

  ctx.session.step = 'await_image_photo'
  ctx.session.pendingImageSlug = product.slug.current
  ctx.session.pendingImageProductName = product.name

  await ctx.reply(
    `✅ Found *${product.name}*\n\nNow send the photo (send as a photo, not a file).`,
    { parse_mode: 'Markdown' }
  )
})

// ── /setimage ─────────────────────────────────────────────────────────────────

bot.command('setimage', async ctx => {
  const parts = ctx.message.text.split(/\s+/).slice(1)
  const slug = parts[0]?.trim()
  const publicId = parts.slice(1).join(' ').trim()

  if (!slug || !publicId) {
    await ctx.reply(
      'Usage: `/setimage <slug> <cloudinary-public-id>`\nExample: `/setimage wenge-bb-board modish/products/wenge-bb`',
      { parse_mode: 'Markdown' }
    )
    return
  }

  await ctx.reply('🔍 Looking up product…')

  let product: { _id: string; name: string } | null = null
  try {
    product = await sanity.fetch(
      `*[_type == "product" && slug.current == $slug][0]{ _id, name }`,
      { slug }
    )
  } catch (err: any) {
    await ctx.reply(`❌ Sanity lookup failed: ${err.message ?? err}`)
    return
  }

  if (!product) {
    await ctx.reply(`❌ No product found with slug \`${slug}\`.`, { parse_mode: 'Markdown' })
    return
  }

  try {
    await sanity
      .patch(product._id)
      .set({ images: [{ publicId, alt: product.name }] })
      .commit()
  } catch (err: any) {
    await ctx.reply(`❌ Sanity patch failed: ${err.message ?? err}`)
    return
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const previewUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_400/${publicId}`
  const fullUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${publicId}`

  // Also update Airtable Image URL so content workflows can use the image
  try {
    await airtableUpsertProduct({ 'SKU': `product-${slug}`, 'Image URL': fullUrl })
  } catch (err: any) {
    console.error('[Airtable] image patch failed:', err.message ?? err)
  }

  await ctx.reply(
    `✅ *${product.name}* updated!\n\nCloudinary ID: \`${publicId}\`\nPreview: ${previewUrl}`,
    { parse_mode: 'Markdown' }
  )
})

// ── /matchimages ──────────────────────────────────────────────────────────────

bot.command('matchimages', async ctx => {
  await ctx.reply('🔍 Fetching Cloudinary assets and Sanity products…')

  let cloudinaryAssets: Array<{ public_id: string }>
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'modish/products/',
      max_results: 500,
    })
    cloudinaryAssets = result.resources
  } catch (err: any) {
    await ctx.reply(`❌ Cloudinary API error: ${err.message ?? err}`)
    return
  }

  let sanityProducts: Array<{ _id: string; name: string; slug: string; hasImage: boolean }>
  try {
    sanityProducts = await sanity.fetch(
      `*[_type == "product"]{ _id, name, "slug": slug.current, "hasImage": defined(images[0].publicId) }`
    )
  } catch (err: any) {
    await ctx.reply(`❌ Sanity fetch failed: ${err.message ?? err}`)
    return
  }

  const withoutImage = sanityProducts.filter(p => !p.hasImage)

  if (cloudinaryAssets.length === 0) {
    await ctx.reply('No Cloudinary assets found under `modish/products/`.', { parse_mode: 'Markdown' })
    return
  }

  await ctx.reply(`Found ${cloudinaryAssets.length} Cloudinary asset(s). Matching against ${withoutImage.length} product(s) without images…`)

  const matched: string[] = []
  const unmatched: string[] = []

  for (const asset of cloudinaryAssets) {
    const assetSlug = asset.public_id.replace(/^modish\/products\//, '').replace(/\.[^.]+$/, '')
    const product = withoutImage.find(p => p.slug === assetSlug)

    if (product) {
      try {
        await sanity
          .patch(product._id)
          .set({ images: [{ publicId: asset.public_id, alt: product.name }] })
          .commit()
        matched.push(`✅ ${product.name} ← \`${asset.public_id}\``)
      } catch {
        matched.push(`⚠️ ${product.name}: patch failed`)
      }
    } else {
      unmatched.push(`• \`${asset.public_id}\` (no slug match)`)
    }
  }

  let msg = `*Image match complete*\n\n`
  if (matched.length > 0) {
    msg += `*Matched (${matched.length}):*\n${matched.join('\n')}\n\n`
  }
  if (unmatched.length > 0) {
    msg += `*Unmatched assets (${unmatched.length}):*\n${unmatched.join('\n')}\n\n`
  }
  const stillMissing = withoutImage.filter(p => !matched.some(m => m.includes(p.name)))
  if (stillMissing.length > 0) {
    msg += `*Products still without images (${stillMissing.length}):*\n`
    msg += stillMissing.map(p => `• \`${p.slug}\``).join('\n')
  }

  await sendLong(ctx, msg)
})

// ── /slug ─────────────────────────────────────────────────────────────────────

bot.command('slug', async ctx => {
  const query = ctx.message.text.split(/\s+/).slice(1).join(' ').trim()

  if (!query) {
    await ctx.reply(
      'Usage: `/slug <partial product name>`\nExample: `/slug marble`\n\nReturns matching product slugs so you can use them with /image.',
      { parse_mode: 'Markdown' }
    )
    return
  }

  let products: Array<{ name: string; slug: string }> = []
  try {
    products = await sanity.fetch(
      `*[_type == "product" && lower(name) match $q] | order(name asc) [0..19] { name, "slug": slug.current }`,
      { q: `*${query.toLowerCase()}*` }
    )
  } catch (err: any) {
    await ctx.reply(`❌ Sanity lookup failed: ${err.message ?? err}`)
    return
  }

  if (products.length === 0) {
    await ctx.reply(`No products found matching "*${query}*". Try a shorter or different search term.`, { parse_mode: 'Markdown' })
    return
  }

  const lines = products.map(p => `• ${p.name}\n  \`${p.slug}\``).join('\n')
  await ctx.reply(
    `*Products matching "${query}":*\n\n${lines}\n\nCopy the slug and use it with \`/image <slug>\``,
    { parse_mode: 'Markdown' }
  )
})

// ── /promote ─────────────────────────────────────────────────────────────────

bot.command('promote', async ctx => {
  const slug = ctx.message.text.split(/\s+/).slice(1).join(' ').trim()

  if (!slug) {
    await ctx.reply(
      'Usage: `/promote <product-slug>`\nExample: `/promote wenge-bb-board`\n\nSets Ready for Promo = true in Airtable so Workflow A generates promotional content.',
      { parse_mode: 'Markdown' }
    )
    return
  }

  // Look up product name in Sanity
  let product: { name: string } | null = null
  try {
    product = await sanity.fetch(
      `*[_type == "product" && slug.current == $slug][0]{ name }`,
      { slug }
    )
  } catch (err: any) {
    await ctx.reply(`❌ Sanity lookup failed: ${err.message ?? err}`)
    return
  }

  if (!product) {
    await ctx.reply(`❌ No product found with slug \`${slug}\`.`, { parse_mode: 'Markdown' })
    return
  }

  await ctx.reply(`🔍 Finding *${product.name}* in Airtable…`, { parse_mode: 'Markdown' })

  let records: Array<{ id: string; fields: Record<string, unknown> }>
  try {
    records = await airtableSearch(`{Product Name}="${product.name.replace(/"/g, '\\"')}"`)
  } catch (err: any) {
    await ctx.reply(`❌ Airtable search failed: ${err.message ?? err}`)
    return
  }

  if (records.length === 0) {
    await ctx.reply(
      `⚠️ *${product.name}* is not in the Airtable Product Catalog yet.\n\nIf it came from POS, run /syncstock first. If it was added via /addsanity, the Airtable sync may have failed — try /addsanity again or check AIRTABLE_API_KEY.`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  try {
    await airtablePatchRecords(
      records.map(r => ({ id: r.id, fields: { 'Ready for Promo': true, 'Content Type': 'New Product' } }))
    )
  } catch (err: any) {
    await ctx.reply(`❌ Airtable patch failed: ${err.message ?? err}`)
    return
  }

  await ctx.reply(
    `✅ *${product.name}* is now marked *Ready for Promo*!\n\nWorkflow A will pick it up within the next 30 minutes and generate promotional content.`,
    { parse_mode: 'Markdown' }
  )
})

// ── /promotecategory ──────────────────────────────────────────────────────────

bot.command('promotecategory', async ctx => {
  const args = ctx.message.text.split(/\s+/).slice(1)
  const categorySlug = args[0]?.trim()
  const contentType = args[1]?.trim() || 'Promo'

  // Campaign is handled by Workflow H (/campaign command) — not valid here
  const validTypes = ['New Product', 'Promo', 'Restock Alert']
  const resolvedType = validTypes.find(t => t.toLowerCase() === contentType.toLowerCase()) ?? 'Promo'

  if (!categorySlug) {
    await ctx.reply(
      'Usage: `/promotecategory <category-slug> [content-type]`\n\nExamples:\n`/promotecategory uv-gloss-boards`\n`/promotecategory uv-gloss-boards New Product`\n\nContent types: `New Product` · `Promo` · `Restock Alert`\n\n_For multi-product campaigns use /campaign instead._',
      { parse_mode: 'Markdown' }
    )
    return
  }

  // Get category name from Sanity
  let category: { name: string } | null = null
  try {
    category = await sanity.fetch(
      `*[_type == "category" && slug.current == $slug][0]{ name }`,
      { slug: categorySlug }
    )
  } catch (err: any) {
    await ctx.reply(`❌ Sanity lookup failed: ${err.message ?? err}`)
    return
  }

  if (!category) {
    await ctx.reply(`❌ No category found with slug \`${categorySlug}\`.`, { parse_mode: 'Markdown' })
    return
  }

  await ctx.reply(`🔍 Finding all *${category.name}* products in Airtable…`, { parse_mode: 'Markdown' })

  let records: Array<{ id: string; fields: Record<string, unknown> }>
  try {
    records = await airtableSearch(`{Category}="${category.name.replace(/"/g, '\\"')}"`)
  } catch (err: any) {
    await ctx.reply(`❌ Airtable search failed: ${err.message ?? err}`)
    return
  }

  if (records.length === 0) {
    await ctx.reply(
      `⚠️ No *${category.name}* products found in Airtable.\n\nRun /sync ${categorySlug} to push them from POS first, then try again.`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  await ctx.reply(`Found ${records.length} product(s). Setting *${resolvedType}* + Ready for Promo…`, { parse_mode: 'Markdown' })

  try {
    await airtablePatchRecords(
      records.map(r => ({ id: r.id, fields: { 'Ready for Promo': true, 'Content Type': resolvedType } }))
    )
  } catch (err: any) {
    await ctx.reply(`❌ Airtable patch failed: ${err.message ?? err}`)
    return
  }

  await ctx.reply(
    `✅ *${records.length} ${category.name} product(s)* marked Ready for Promo (${resolvedType})!\n\nWorkflow A will process them within the next 30 minutes.`,
    { parse_mode: 'Markdown' }
  )
})

// ── /campaign ─────────────────────────────────────────────────────────────────

bot.command('campaign', async ctx => {
  const args = ctx.message.text.split(/\s+/).slice(1)
  // Last arg is always the category slug; everything before it is the campaign tag
  const categorySlug = args[args.length - 1]?.trim()
  const campaignTag = args.slice(0, -1).join(' ').trim()

  if (!campaignTag || !categorySlug || args.length < 2) {
    await ctx.reply(
      'Usage: `/campaign <Campaign Tag> <category-slug>`\n\nExample:\n`/campaign UV Gloss June Sale uv-gloss-boards`\n\nThe campaign tag groups all products together into one multi-product post.\nWorkflow H generates a single campaign caption covering all products in the category.',
      { parse_mode: 'Markdown' }
    )
    return
  }

  // Resolve category name from Sanity
  let category: { name: string } | null = null
  try {
    category = await sanity.fetch(
      `*[_type == "category" && slug.current == $slug][0]{ name }`,
      { slug: categorySlug }
    )
  } catch (err: any) {
    await ctx.reply(`❌ Sanity lookup failed: ${err.message ?? err}`)
    return
  }

  if (!category) {
    await ctx.reply(`❌ No category found with slug \`${categorySlug}\`.`, { parse_mode: 'Markdown' })
    return
  }

  await ctx.reply(`🔍 Finding all *${category.name}* products in Airtable…`, { parse_mode: 'Markdown' })

  let records: Array<{ id: string; fields: Record<string, unknown> }>
  try {
    records = await airtableSearch(`{Category}="${category.name.replace(/"/g, '\\"')}"`)
  } catch (err: any) {
    await ctx.reply(`❌ Airtable search failed: ${err.message ?? err}`)
    return
  }

  if (records.length === 0) {
    await ctx.reply(
      `⚠️ No *${category.name}* products found in Airtable.\n\nRun /sync ${categorySlug} first to push them from POS, then try again.`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  await ctx.reply(`Found ${records.length} product(s). Setting Campaign Tag to *"${campaignTag}"*…`, { parse_mode: 'Markdown' })

  // Set Campaign Tag + reset Campaign Generated so Workflow H picks them up
  try {
    await airtablePatchRecords(
      records.map(r => ({
        id: r.id,
        fields: { 'Campaign Tag': campaignTag, 'Campaign Generated': false },
      }))
    )
  } catch (err: any) {
    await ctx.reply(`❌ Airtable patch failed: ${err.message ?? err}`)
    return
  }

  // Trigger Workflow H via webhook
  const webhookUrl = process.env.N8N_CAMPAIGN_WEBHOOK_URL
  let webhookOk = false
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignTag, category: category.name }),
      })
      webhookOk = res.ok
    } catch (err: any) {
      console.error('[Campaign webhook] error:', err.message ?? err)
    }
  }

  await ctx.reply(
    `✅ *Campaign set: "${campaignTag}"*\n\n` +
    `*Category:* ${category.name}\n` +
    `*Products tagged:* ${records.length}\n\n` +
    (webhookOk
      ? `🚀 Workflow H triggered — campaign content will be generated shortly. You'll get a Telegram notification when it's ready.`
      : `⚠️ Airtable tags are set but Workflow H was not triggered automatically.\n\nTo generate the campaign content:\n• Go to n8n.modishstandard.com → Workflow H → Execute\n• Or add \`N8N_CAMPAIGN_WEBHOOK_URL\` to .env.bot on the server`),
    { parse_mode: 'Markdown' }
  )
})

// ── /addsanity ────────────────────────────────────────────────────────────────

bot.command('addsanity', async ctx => {
  const name = ctx.message.text.split(/\s+/).slice(1).join(' ').trim()

  if (!name) {
    await ctx.reply(
      'Usage: `/addsanity <Product Name>`\nExample: `/addsanity Marble PU Stone Panel`\n\nUse this to add products directly to the Sanity website catalog without going through the POS.',
      { parse_mode: 'Markdown' }
    )
    return
  }

  const slug = toSlug(name)

  // Check if product already exists in Sanity
  let existing: { _id: string } | null = null
  try {
    existing = await sanity.fetch(
      `*[_type == "product" && slug.current == $slug][0]{ _id }`,
      { slug }
    )
  } catch (err: any) {
    await ctx.reply(`❌ Sanity lookup failed: ${err.message ?? err}`)
    return
  }

  if (existing) {
    await ctx.reply(
      `⚠️ A product with slug \`${slug}\` already exists in Sanity.\n\nUse a different name or edit it in Sanity Studio.`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  // Fetch available categories
  let categories: Array<{ _id: string; name: string; slug: string }>
  try {
    categories = await sanity.fetch(
      `*[_type == "category"] | order(name asc) { _id, name, "slug": slug.current }`
    )
  } catch (err: any) {
    await ctx.reply(`❌ Failed to fetch categories: ${err.message ?? err}`)
    return
  }

  if (categories.length === 0) {
    await ctx.reply(
      '⚠️ No categories found in Sanity. Create one first with `/addcategory <name>`.',
      { parse_mode: 'Markdown' }
    )
    return
  }

  ctx.session.step = 'await_sanity_product_category'
  ctx.session.pendingSanityProductName = name
  ctx.session.pendingSanityProductSlug = slug

  const catList = categories.map(c => `• \`${c.slug}\` — ${c.name}`).join('\n')
  await ctx.reply(
    `✅ Product: *${name}*\nSlug: \`${slug}\`\n\n*Available categories:*\n${catList}\n\nReply with the category slug, or /cancel to abort.`,
    { parse_mode: 'Markdown' }
  )
})

// ── /addcategory ──────────────────────────────────────────────────────────────

bot.command('addcategory', async ctx => {
  const name = ctx.message.text.split(/\s+/).slice(1).join(' ').trim()

  if (!name) {
    await ctx.reply(
      'Usage: `/addcategory <Category Name>`\nExample: `/addcategory Aluminium Sheets`',
      { parse_mode: 'Markdown' }
    )
    return
  }

  const slug = toSlug(name)

  // Check if a category with this slug already exists
  let existing: { _id: string } | null = null
  try {
    existing = await sanity.fetch(
      `*[_type == "category" && slug.current == $slug][0]{ _id }`,
      { slug }
    )
  } catch (err: any) {
    await ctx.reply(`❌ Sanity lookup failed: ${err.message ?? err}`)
    return
  }

  if (existing) {
    await ctx.reply(
      `⚠️ A category with slug \`${slug}\` already exists.\n\nUse a different name, or manage it in Sanity Studio.`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  ctx.session.step = 'await_category_description'
  ctx.session.pendingCategoryName = name
  ctx.session.pendingCategorySlug = slug

  await ctx.reply(
    `✅ Category name: *${name}*\nSlug: \`${slug}\`\n\nNow send a short description for this category (max 500 characters).\n\nOr /cancel to abort.`,
    { parse_mode: 'Markdown' }
  )
})

// ── /purchase ─────────────────────────────────────────────────────────────────

bot.command('purchase', async ctx => {
  ctx.session = { step: 'await_purchase_file' }
  await ctx.reply(
    `🧾 *Create Purchase Order*\n\n` +
    `Send the supplier invoice PDF.\n\n` +
    `All products must already exist in POS — use /add first if needed.\n\n` +
    `Or /cancel to abort.`,
    { parse_mode: 'Markdown' }
  )
})

// ── /add ──────────────────────────────────────────────────────────────────────

bot.command('add', async ctx => {
  ctx.session = { step: 'await_product_text' }
  await ctx.reply(
    `📝 Describe the products to add (names, category, price).\n\n` +
    `*Examples:*\n` +
    `• \`Wenge BB Board, White Oak BB, Maple BB under block-boards at ₦26000\`\n` +
    `• \`Add: Cherry MDF (mdf-boards) ₦18000, Pine HDF (hdf-boards) ₦22000\`\n` +
    `• Bullet list with category/price footer\n\n` +
    `Or /cancel to abort.`,
    { parse_mode: 'Markdown' }
  )
})

// ── Shared keyboard helpers ───────────────────────────────────────────────────

const LOCATION_LABELS: Record<string, string> = {
  '928': 'BL0001 — Main Store',
  '952': 'BL0002',
}

function locationKeyboard(prefix: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(`🏪 ${LOCATION_LABELS['928']} (928)`, `${prefix}_928`)],
    [Markup.button.callback(`🏬 ${LOCATION_LABELS['952']} (952)`, `${prefix}_952`)],
    [Markup.button.callback('❌ Cancel', 'cancel_action')],
  ])
}

function categoryKeyboard(prefix: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('MDF Boards', `${prefix}_mdf-boards`), Markup.button.callback('HDF Boards', `${prefix}_hdf-boards`)],
    [Markup.button.callback('UV Gloss Boards', `${prefix}_uv-gloss-boards`), Markup.button.callback('Marine Boards', `${prefix}_marine-boards`)],
    [Markup.button.callback('Block Boards', `${prefix}_block-boards`), Markup.button.callback('Doors', `${prefix}_doors`)],
    [Markup.button.callback('PU Stone Panels', `${prefix}_pu-stone-panels`)],
  ])
}

const EXCHANGE_RATE_PROMPT =
  `What exchange rate *(NGN/USD)* should I use? This will be used for both creating the products and the purchase costs.\n_Example: type \`1400\` for ₦1,400 per USD_`

// ── Inline keyboard callbacks ─────────────────────────────────────────────────

bot.action(/^add_loc_(928|952)$/, async ctx => {
  await ctx.answerCbQuery()
  if (ctx.session.step !== 'await_add_location') return

  ctx.session.pendingAddLocationId = ctx.match[1]
  const pending = ctx.session.pendingCreate ?? []
  const needsCategory = pending.some(p => p.categorySlug === 'accessories')

  if (needsCategory) {
    ctx.session.step = 'await_add_category'
    await ctx.reply(
      `✅ Location: *${LOCATION_LABELS[ctx.match[1]]} (${ctx.match[1]})*\n\nSome products couldn't be auto-categorized. Which Sanity category should they go in?`,
      { parse_mode: 'Markdown' }
    )
    await ctx.reply('Select category:', categoryKeyboard('add_cat'))
  } else {
    ctx.session.step = 'await_confirm_create'
    await ctx.reply(
      `Create the ${pending.length} missing product(s) in POS?`,
      Markup.inlineKeyboard([
        Markup.button.callback(`✅ Yes, create ${pending.length}`, 'confirm_create'),
        Markup.button.callback('❌ Cancel', 'cancel_action'),
      ])
    )
  }
})

bot.action(/^add_cat_(.+)$/, async ctx => {
  await ctx.answerCbQuery()
  if (ctx.session.step !== 'await_add_category') return

  const categoryOverride = ctx.match[1]
  ctx.session.pendingAddCategoryOverride = categoryOverride

  const cats = ctx.session.pendingCategories ?? []
  ctx.session.pendingCategories = [
    ...cats.filter(c => c !== 'accessories'),
    categoryOverride,
  ]

  const pending = ctx.session.pendingCreate ?? []
  ctx.session.step = 'await_confirm_create'

  await ctx.reply(`✅ Category: *${categoryOverride}*`, { parse_mode: 'Markdown' })
  await ctx.reply(
    `Create the ${pending.length} missing product(s) in POS?`,
    Markup.inlineKeyboard([
      Markup.button.callback(`✅ Yes, create ${pending.length}`, 'confirm_create'),
      Markup.button.callback('❌ Cancel', 'cancel_action'),
    ])
  )
})

bot.action('confirm_create', async ctx => {
  await ctx.answerCbQuery()

  const pending = ctx.session.pendingCreate
  if (!pending || pending.length === 0) {
    await ctx.reply('Nothing to create. Session may have expired.')
    ctx.session = {}
    return
  }

  await ctx.reply(`✨ Creating ${pending.length} product(s) in POS…`)

  let pos: POSClient
  try {
    pos = createPOSClientFromEnv()
    await pos.login()
  } catch (err: any) {
    await ctx.reply(`❌ POS login failed: ${err.message ?? err}`)
    ctx.session = {}
    return
  }

  const createdNames: string[] = []
  const failures: string[] = []

  const addLocationId = ctx.session.pendingAddLocationId
  for (const product of pending) {
    try {
      await pos.createProduct({
        name: product.name,
        costPrice: product.costPrice ?? Math.round((product.price ?? 0) * 0.65),
        sellingPrice: product.price ?? 0,
        ...(addLocationId ? { locationId: addLocationId } : {}),
      })
      createdNames.push(product.name)
    } catch (err: any) {
      failures.push(`❌ ${product.name}: ${err.message ?? err}`)
    }
  }

  const successes: string[] = []
  if (createdNames.length > 0) {
    const allPos = await pos.getProducts()
    const skuMap = new Map(allPos.map(p => [p.parsedName.toLowerCase(), p.sku]))
    for (const name of createdNames) {
      const sku = skuMap.get(name.toLowerCase()) ?? 'N/A'
      successes.push(`✅ ${name} (SKU: ${sku})`)
    }
  }

  let msg = `*Creation results:*\n\n`
  if (successes.length > 0) msg += successes.join('\n') + '\n'
  if (failures.length > 0) msg += '\n' + failures.join('\n') + '\n'

  await sendLong(ctx, msg)

  const categories = ctx.session.pendingCategories ?? []
  ctx.session.pendingCreate = undefined
  ctx.session.pendingAddLocationId = undefined
  ctx.session.pendingAddCategoryOverride = undefined
  ctx.session.step = 'await_sync_after_create'

  if (successes.length > 0) {
    const catLabel = categories.length > 0 ? categories.join(', ') : 'all'
    await ctx.reply(
      `Sync the updated categories (${catLabel}) to the website?`,
      Markup.inlineKeyboard([
        Markup.button.callback('🔄 Sync to website', 'confirm_sync_after_create'),
        Markup.button.callback('Skip', 'cancel_action'),
      ])
    )
  } else {
    ctx.session = {}
  }
})

bot.action('confirm_sync_after_create', async ctx => {
  await ctx.answerCbQuery()

  const categories = ctx.session.pendingCategories ?? []
  ctx.session = {}

  if (categories.length === 0) {
    await ctx.reply('🔄 Syncing all products to Sanity…')
    try {
      const result = await runSync()
      await ctx.reply(
        `✅ *Sync complete!*\n\n✨ Created: ${result.created}\n🔄 Updated: ${result.updated}\n⚠️ Skipped: ${result.skipped}`,
        { parse_mode: 'Markdown' }
      )
    } catch (err: any) {
      await ctx.reply(`❌ Sync failed: ${err.message ?? err}`)
    }
    return
  }

  const results: string[] = []
  for (const cat of categories) {
    await ctx.reply(`🔄 Syncing *${cat}*…`, { parse_mode: 'Markdown' })
    try {
      const result = await runSync(cat)
      results.push(`*${cat}*: ✨ ${result.created} created, 🔄 ${result.updated} updated, ⚠️ ${result.skipped} skipped`)
    } catch (err: any) {
      results.push(`*${cat}*: ❌ ${err.message ?? err}`)
    }
  }

  await ctx.reply(
    `✅ *Sync complete!*\n\n` + results.join('\n'),
    { parse_mode: 'Markdown' }
  )
})

bot.action('confirm_invoice_create', async ctx => {
  await ctx.answerCbQuery()

  const newRows = ctx.session.pendingInvoiceNewRows ?? []
  const rate = ctx.session.pendingInvoiceExchangeRate ?? 0
  const categorySlugs = ctx.session.pendingInvoiceCategorySlugs ?? ['edge-tapes']
  const invoiceLocationId = ctx.session.pendingInvoiceLocationId
  ctx.session = {}

  if (newRows.length === 0 || rate <= 0) {
    await ctx.reply('Session expired. Please send the PDF again.')
    return
  }

  await ctx.reply(`✨ Creating ${newRows.length} product(s) in POS…`)

  let pos: any
  try {
    pos = createPOSClientFromEnv()
    await pos.login()
  } catch (err: any) {
    await ctx.reply(`❌ POS login failed: ${err.message ?? err}`)
    return
  }

  const createdNames: string[] = []
  const failures: string[] = []

  for (const row of newRows) {
    const costPrice  = Math.round(row.usdUnitPrice * rate)
    const sellingPrice = row.face === 'Glossy' ? INVOICE_SELLING_PRICE_GLOSSY : INVOICE_SELLING_PRICE_NORMAL
    try {
      await pos.createProduct({ name: row.posName, costPrice, sellingPrice, locationId: invoiceLocationId })
      createdNames.push(row.posName)
    } catch (err: any) {
      failures.push(`❌ ${row.posName}: ${err.message ?? err}`)
    }
  }

  const successes: string[] = []
  if (createdNames.length > 0) {
    const allPos = await pos.getProducts()
    const skuMap = new Map(allPos.map((p: any) => [p.parsedName.toLowerCase(), p.sku]))
    for (const name of createdNames) {
      const sku = skuMap.get(name.toLowerCase()) ?? 'N/A'
      successes.push(`✅ ${name} (SKU: ${sku})`)
    }
  }

  let msg = `*Creation results:*\n\n`
  if (successes.length > 0) msg += successes.join('\n') + '\n'
  if (failures.length > 0) msg += '\n' + failures.join('\n') + '\n'
  await sendLong(ctx, msg)

  if (successes.length > 0) {
    await ctx.reply(
      `Sync the new products to the Sanity website?`,
      Markup.inlineKeyboard([
        Markup.button.callback(`🔄 Sync to website`, 'confirm_invoice_sync'),
        Markup.button.callback('Skip', 'cancel_action'),
      ])
    )
    ctx.session.pendingInvoiceCategorySlugs = categorySlugs
  }
})

bot.action('confirm_invoice_sync', async ctx => {
  await ctx.answerCbQuery()
  const categorySlugs = ctx.session.pendingInvoiceCategorySlugs ?? []
  ctx.session = {}

  await ctx.reply(`🔄 Syncing new products to Sanity…`)
  const results: string[] = []
  for (const slug of categorySlugs) {
    try {
      const result = await runSync(slug)
      results.push(`*${slug}*: ✨ ${result.created} created, 🔄 ${result.updated} updated, ⚠️ ${result.skipped} skipped`)
    } catch (err: any) {
      results.push(`*${slug}*: ❌ ${err.message ?? err}`)
    }
  }
  if (results.length > 0) {
    await ctx.reply(`✅ *Sync complete!*\n\n` + results.join('\n'), { parse_mode: 'Markdown' })
  } else {
    await ctx.reply('Nothing to sync.')
  }
})

bot.action(/^inv_loc_(928|952)$/, async ctx => {
  await ctx.answerCbQuery()
  if (ctx.session.step !== 'await_invoice_location') return

  ctx.session.pendingInvoiceLocationId = ctx.match[1]
  ctx.session.step = 'await_exchange_rate_for_invoice'

  await ctx.reply(
    `✅ Location: *${LOCATION_LABELS[ctx.match[1]]} (${ctx.match[1]})*\n\nWhat exchange rate *(NGN/USD)* should I use for purchase prices?\n_Example: type \`1400\` for ₦1,400 per USD_`,
    { parse_mode: 'Markdown' }
  )
})

bot.action('purchase_create_and_continue', async ctx => {
  await ctx.answerCbQuery()
  if (ctx.session.step !== 'await_purchase_missing_confirm') return
  ctx.session.step = 'await_purchase_location'
  await ctx.reply('Which location should the missing products be created at?', locationKeyboard('pur_loc'))
})

// ── Purchase disambiguation ───────────────────────────────────────────────────

async function afterPurchaseDisambigDone(ctx: BotContext): Promise<void> {
  const missingRows = ctx.session.pendingPurchaseMissingRows ?? []

  if (missingRows.length > 0) {
    ctx.session.pendingPurchaseNeedsCreate = true
    ctx.session.step = 'await_purchase_missing_confirm'

    const found = ctx.session.pendingPurchaseLines?.length ?? 0
    let msg = `⚠️ *${missingRows.length} product(s) not yet in POS:*\n\n`
    msg += missingRows.map(r => `• ${r.posName}`).join('\n')
    if (found > 0) msg += `\n\n*${found} product(s)* are already in POS (or matched).`
    msg += `\n\nShould I create the ${missingRows.length} missing product(s) and include all in the purchase?`
    await sendLong(ctx, msg)
    await ctx.reply(
      'What would you like to do?',
      Markup.inlineKeyboard([
        [Markup.button.callback(`✅ Create ${missingRows.length} & continue`, 'purchase_create_and_continue')],
        [Markup.button.callback('❌ Cancel', 'cancel_action')],
      ])
    )
    return
  }

  const total = ctx.session.pendingPurchaseLines?.length ?? 0
  ctx.session.step = 'await_purchase_supplier'
  await ctx.reply(
    `✅ All ${total} products confirmed in POS.\n\n*Which supplier is this invoice from?*`,
    { parse_mode: 'Markdown' }
  )
  await ctx.reply(
    'Select supplier:',
    Markup.inlineKeyboard([
      ...SUPPLIERS.map(s => [Markup.button.callback(s.name, `purchase_supplier_${s.id}`)]),
      [Markup.button.callback('❌ Cancel', 'cancel_action')],
    ])
  )
}

bot.action(/^pur_disambig_use_(\d+)$/, async ctx => {
  await ctx.answerCbQuery()
  if (ctx.session.step !== 'await_purchase_disambig') return

  const queue = ctx.session.pendingPurchaseDisambigQueue ?? []
  if (queue.length === 0) return

  const idx = parseInt(ctx.match[1], 10)
  const item = queue[0]
  const candidate = item.candidates[idx]
  if (!candidate) {
    await ctx.answerCbQuery('⚠️ This button is outdated — please use the latest message.')
    return
  }

  ctx.session.pendingPurchaseLines = [
    ...(ctx.session.pendingPurchaseLines ?? []),
    {
      posName: item.row.posName,
      productId: candidate.productId,
      variationId: candidate.variationId,
      unitId: item.row.categorySlug === 'edge-tapes' ? '2097' : '2094',
      quantity: item.row.quantity,
      usdUnitPrice: item.row.usdUnitPrice,
      face: item.row.face,
    },
  ]
  ctx.session.pendingPurchaseDisambigQueue = queue.slice(1)

  if ((ctx.session.pendingPurchaseDisambigQueue ?? []).length > 0) {
    await showNextPurchaseDisambig(ctx)
  } else {
    await afterPurchaseDisambigDone(ctx)
  }
})

bot.action('pur_disambig_create', async ctx => {
  await ctx.answerCbQuery()
  if (ctx.session.step !== 'await_purchase_disambig') return

  const queue = ctx.session.pendingPurchaseDisambigQueue ?? []
  if (queue.length === 0) return

  const item = queue[0]
  ctx.session.pendingPurchaseMissingRows = [
    ...(ctx.session.pendingPurchaseMissingRows ?? []),
    item.row,
  ]
  ctx.session.pendingPurchaseDisambigQueue = queue.slice(1)

  if ((ctx.session.pendingPurchaseDisambigQueue ?? []).length > 0) {
    await showNextPurchaseDisambig(ctx)
  } else {
    await afterPurchaseDisambigDone(ctx)
  }
})

// ── Invoice disambiguation ────────────────────────────────────────────────────

async function afterInvoiceDisambigDone(ctx: BotContext): Promise<void> {
  const newRows = ctx.session.pendingInvoiceNewRows ?? []

  if (newRows.length === 0) {
    await ctx.reply('✅ All products matched to existing POS entries. Nothing to create.')
    ctx.session = {}
    return
  }

  let msg = `🆕 *${newRows.length} product(s) to create:*\n\n`
  for (const r of newRows) {
    msg += `• ${r.posName} (PDF: ${r.pdfName})\n`
  }

  ctx.session.step = 'await_invoice_location'
  ctx.session.pendingInvoiceCategorySlugs = [...new Set(newRows.map(r => r.categorySlug))]

  await sendLong(ctx, msg)
  await ctx.reply('Which location should these products be created at?', locationKeyboard('inv_loc'))
}

bot.action('inv_disambig_skip', async ctx => {
  await ctx.answerCbQuery()
  if (ctx.session.step !== 'await_invoice_disambig') return

  const queue = ctx.session.pendingInvoiceDisambigQueue ?? []
  if (queue.length === 0) return

  // "Use existing" — skip creation of this row
  ctx.session.pendingInvoiceDisambigQueue = queue.slice(1)

  if ((ctx.session.pendingInvoiceDisambigQueue ?? []).length > 0) {
    await showNextInvoiceDisambig(ctx)
  } else {
    await afterInvoiceDisambigDone(ctx)
  }
})

bot.action('inv_disambig_create', async ctx => {
  await ctx.answerCbQuery()
  if (ctx.session.step !== 'await_invoice_disambig') return

  const queue = ctx.session.pendingInvoiceDisambigQueue ?? []
  if (queue.length === 0) return

  const item = queue[0]
  ctx.session.pendingInvoiceNewRows = [
    ...(ctx.session.pendingInvoiceNewRows ?? []),
    item.row,
  ]
  ctx.session.pendingInvoiceDisambigQueue = queue.slice(1)

  if ((ctx.session.pendingInvoiceDisambigQueue ?? []).length > 0) {
    await showNextInvoiceDisambig(ctx)
  } else {
    await afterInvoiceDisambigDone(ctx)
  }
})

bot.action(/^pur_loc_(928|952)$/, async ctx => {
  await ctx.answerCbQuery()
  if (ctx.session.step !== 'await_purchase_location') return

  ctx.session.pendingPurchaseLocationId = ctx.match[1]
  ctx.session.step = 'await_purchase_rate'
  await ctx.reply(
    `✅ Location: *${LOCATION_LABELS[ctx.match[1]]} (${ctx.match[1]})*`,
    { parse_mode: 'Markdown' }
  )
  await ctx.reply(EXCHANGE_RATE_PROMPT, { parse_mode: 'Markdown' })
})

bot.action(/^purchase_supplier_(\d+)$/, async ctx => {
  await ctx.answerCbQuery()
  const supplierId = ctx.match[1]
  const supplier = SUPPLIERS.find(s => s.id === supplierId)
  if (!supplier || ctx.session.step !== 'await_purchase_supplier') return

  ctx.session.pendingPurchaseSupplierId = supplierId
  ctx.session.pendingPurchaseSupplierName = supplier.name
  ctx.session.step = 'await_purchase_rate'

  await ctx.reply(`✅ Supplier: *${supplier.name}*`, { parse_mode: 'Markdown' })
  await ctx.reply(EXCHANGE_RATE_PROMPT, { parse_mode: 'Markdown' })
})

bot.action(/^purchase_status_(ordered|received|pending)$/, async ctx => {
  await ctx.answerCbQuery()
  const status = ctx.match[1] as 'ordered' | 'received' | 'pending'
  if (ctx.session.step !== 'await_purchase_status') return

  ctx.session.pendingPurchaseStatus = status
  ctx.session.step = 'await_purchase_shipping'

  await ctx.reply(
    `✅ Status: *${status}*\n\nShipping charges in Naira? (type \`0\` to skip)`,
    { parse_mode: 'Markdown' }
  )
})

bot.action('confirm_purchase_create', async ctx => {
  await ctx.answerCbQuery()

  const lines        = ctx.session.pendingPurchaseLines ?? []
  const rate         = ctx.session.pendingPurchaseExchangeRate ?? 0
  const supplierId   = ctx.session.pendingPurchaseSupplierId ?? ''
  const supplierName = ctx.session.pendingPurchaseSupplierName ?? ''
  const status       = ctx.session.pendingPurchaseStatus ?? 'ordered'
  const shipping     = ctx.session.pendingPurchaseShipping ?? 0
  const shLabel      = ctx.session.pendingPurchaseShippingLabel ?? ''
  const purchaseLocationId = ctx.session.pendingPurchaseLocationId
  ctx.session = {}

  if (lines.length === 0 || rate <= 0 || !supplierId) {
    await ctx.reply('Session expired. Please start again with /purchase.')
    return
  }

  await ctx.reply('✨ Creating purchase order in POS…')

  let pos: POSClient
  try {
    pos = createPOSClientFromEnv()
    await pos.login()
  } catch (err: any) {
    await ctx.reply(`❌ POS login failed: ${err.message ?? err}`)
    return
  }

  const purchaseLines: PurchaseLine[] = lines.map(line => ({
    productId:     line.productId,
    variationId:   line.variationId,
    quantity:      line.quantity,
    unitId:        line.unitId,
    purchasePrice: Math.round(line.usdUnitPrice * rate),
    sellingPrice:  line.face === 'Glossy' ? INVOICE_SELLING_PRICE_GLOSSY : INVOICE_SELLING_PRICE_NORMAL,
  }))

  try {
    const result = await pos.createPurchase({
      contactId:       supplierId,
      status,
      locationId:      purchaseLocationId,
      shippingCharges: shipping,
      shippingDetails: shLabel,
      lines:           purchaseLines,
    })
    const posUrl = (process.env.INVENTORY_APP_URL || 'https://pos.virtualrx.com.ng').replace(/\/$/, '')
    await ctx.reply(
      `✅ *Purchase order created!*\n\n` +
      `*Ref:* ${result.refNo}\n` +
      `*Supplier:* ${supplierName}\n` +
      `*Status:* ${status}\n` +
      `*Products:* ${lines.length}\n` +
      `*View:* ${posUrl}/purchases/${result.purchaseId}`,
      { parse_mode: 'Markdown' }
    )
  } catch (err: any) {
    await ctx.reply(`❌ Failed to create purchase: ${err.message ?? err}`)
  }
})

bot.action('cancel_action', async ctx => {
  await ctx.answerCbQuery()
  ctx.session = {}
  await ctx.reply('Cancelled.')
})

// ── Text message handler (multi-step flows) ───────────────────────────────────

bot.on('text', async ctx => {
  const { step } = ctx.session

  if (step === 'await_sanity_product_category') {
    const input = ctx.message.text.trim().toLowerCase()
    const productName = ctx.session.pendingSanityProductName!
    const productSlug = ctx.session.pendingSanityProductSlug!

    // Look up the category by slug
    let category: { _id: string; name: string; slug: string } | null = null
    try {
      category = await sanity.fetch(
        `*[_type == "category" && slug.current == $slug][0]{ _id, name, "slug": slug.current }`,
        { slug: input }
      )
    } catch (err: any) {
      await ctx.reply(`❌ Sanity lookup failed: ${err.message ?? err}`)
      return
    }

    if (!category) {
      await ctx.reply(
        `❌ No category found with slug \`${input}\`. Reply with one of the slugs listed above, or /cancel.`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    ctx.session.step = 'await_sanity_product_price'
    ctx.session.pendingSanityProductCategoryId = category._id
    ctx.session.pendingSanityProductCategorySlug = category.slug
    ctx.session.pendingSanityProductCategoryName = category.name

    await ctx.reply(
      `✅ Category: *${category.name}*\n\nWhat is the price in Naira? (e.g. \`45000\`)\nType \`skip\` if you want to show "Request Price" instead.`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  if (step === 'await_sanity_product_price') {
    const input = ctx.message.text.trim().toLowerCase()
    const productName = ctx.session.pendingSanityProductName!
    const productSlug = ctx.session.pendingSanityProductSlug!

    let price: number | undefined
    if (input !== 'skip') {
      const parsed = parseFloat(input.replace(/[^\d.]/g, ''))
      if (isNaN(parsed) || parsed <= 0) {
        await ctx.reply(
          'Please enter a valid price (numbers only, e.g. `45000`) or type `skip` for "Request Price".',
          { parse_mode: 'Markdown' }
        )
        return
      }
      price = parsed
    }

    ctx.session.step = 'await_sanity_product_description'
    ctx.session.pendingSanityProductPrice = price

    await ctx.reply(
      `✅ Price: ${price ? `₦${price.toLocaleString()}` : 'Request Price'}\n\nSend a short description for this product (shown on the website), or type \`skip\` to generate one automatically.`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  if (step === 'await_sanity_product_description') {
    const input = ctx.message.text.trim()
    const productName = ctx.session.pendingSanityProductName!
    const productSlug = ctx.session.pendingSanityProductSlug!
    const categoryId = ctx.session.pendingSanityProductCategoryId!
    const categoryName = ctx.session.pendingSanityProductCategoryName!
    const price = ctx.session.pendingSanityProductPrice
    ctx.session = {}

    const shortDescription = (input.toLowerCase() === 'skip' || !input)
      ? `${productName}. Premium quality product from Modish Standard, Lagos.`
      : input

    await ctx.reply(`✨ Creating *${productName}* in Sanity…`, { parse_mode: 'Markdown' })

    try {
      await sanity.createOrReplace({
        _id: `product-${productSlug}`,
        _type: 'product',
        name: productName,
        slug: { _type: 'slug', current: productSlug },
        category: { _type: 'reference', _ref: categoryId },
        shortDescription,
        price: price ?? 0,
        stockStatus: 'in_stock',
        isFeatured: false,
        metaTitle: `${productName} | Lagos Nigeria — Modish Standard`.slice(0, 70),
        metaDescription: `Buy ${productName} in Lagos. ${shortDescription}`.slice(0, 160),
      })
    } catch (err: any) {
      await ctx.reply(`❌ Failed to create product: ${err.message ?? err}`)
      return
    }

    // Push to Airtable so n8n content workflows (A, E) can run on it
    let airtableOk = true
    try {
      const today = new Date().toISOString().split('T')[0]
      await airtableUpsertProduct({
        'Product Name': productName,
        'SKU': `product-${productSlug}`,
        'Category': categoryName,
        'Price (₦)': price ?? 0,
        'Description': shortDescription,
        'Stock Status': 'In Stock',
        'Ready for Promo': false,
        'Date Added': today,
        'Content Type': 'New Product',
        'Source Code': 'sanity-direct',
        'Image URL': '',
      })
    } catch (err: any) {
      airtableOk = false
      console.error('[Airtable] upsert failed:', err.message ?? err)
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.modishstandard.com'
    await ctx.reply(
      `✅ *${productName}* is now live on the website!\n\n` +
      `*Slug:* \`${productSlug}\`\n` +
      `*Price:* ${price ? `₦${price.toLocaleString()}` : 'Request Price'}\n` +
      `*URL:* ${siteUrl}/products/${productSlug}\n` +
      (airtableOk
        ? `*Airtable:* ✅ Added to Product Catalog (promo off — use /promote to trigger content)\n`
        : `*Airtable:* ⚠️ Sync failed — check AIRTABLE_API_KEY in .env.bot\n`) +
      `\nUse \`/image ${productSlug}\` to add a photo.`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  if (step === 'await_category_description') {
    const description = ctx.message.text.trim()
    const categoryName = ctx.session.pendingCategoryName!
    const categorySlug = ctx.session.pendingCategorySlug!
    ctx.session = {}

    if (description.length > 500) {
      await ctx.reply(`❌ Description is too long (${description.length} chars). Max is 500. Please send a shorter description.`)
      // Restore session so they can try again
      ctx.session.step = 'await_category_description'
      ctx.session.pendingCategoryName = categoryName
      ctx.session.pendingCategorySlug = categorySlug
      return
    }

    await ctx.reply(`✨ Creating category *${categoryName}*…`, { parse_mode: 'Markdown' })

    try {
      await sanity.createOrReplace({
        _id: `category-${categorySlug}`,
        _type: 'category',
        name: categoryName,
        slug: { _type: 'slug', current: categorySlug },
        description,
      })
    } catch (err: any) {
      await ctx.reply(`❌ Failed to create category: ${err.message ?? err}`)
      return
    }

    await ctx.reply(
      `✅ *Category created!*\n\n` +
      `*Name:* ${categoryName}\n` +
      `*Slug:* \`${categorySlug}\`\n\n` +
      `⚠️ *Note:* The automatic /sync command maps products to categories based on product name patterns. ` +
      `Products won't route to this new category automatically — assign them via Sanity Studio at \`/studio\`, ` +
      `or use the category's slug when adding products.`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  if (step === 'await_exchange_rate_for_invoice') {
    const input = ctx.message.text.trim().replace(/[,_\s]/g, '')
    const rate = parseFloat(input)

    if (isNaN(rate) || rate <= 0) {
      await ctx.reply(
        'Please enter a valid exchange rate (numbers only, e.g. `1400`).',
        { parse_mode: 'Markdown' }
      )
      return
    }

    const newRows = ctx.session.pendingInvoiceNewRows ?? []
    ctx.session.pendingInvoiceExchangeRate = rate
    ctx.session.step = 'await_invoice_confirm'

    let msg = `💱 *Exchange rate: ₦${rate.toLocaleString()} / USD*\n\n`
    msg += `*${newRows.length} products to be created in POS:*\n\n`
    for (const r of newRows) {
      const costPrice  = Math.round(r.usdUnitPrice * rate)
      const sellPrice = r.face === 'Glossy' ? INVOICE_SELLING_PRICE_GLOSSY : INVOICE_SELLING_PRICE_NORMAL
      msg += `• *${r.posName}*\n`
      msg += `  Cost: ₦${costPrice.toLocaleString()} (US$${r.usdUnitPrice} × ${rate}) | Sell: ₦${sellPrice.toLocaleString()}\n\n`
    }

    await sendLong(ctx, msg)
    await ctx.reply(
      `Create these ${newRows.length} products in POS?`,
      Markup.inlineKeyboard([
        Markup.button.callback(`✅ Yes, create ${newRows.length}`, 'confirm_invoice_create'),
        Markup.button.callback('❌ Cancel', 'cancel_action'),
      ])
    )
    return
  }

  if (step === 'await_invoice_confirm') {
    await ctx.reply(
      'Please use the buttons above to confirm or cancel, or type /cancel to abort.'
    )
    return
  }

  if (step === 'await_purchase_file') {
    await ctx.reply('Please send the supplier invoice PDF, or /cancel to abort.')
    return
  }

  if (step === 'await_purchase_missing_confirm') {
    await ctx.reply('Please use the buttons above to choose, or /cancel to abort.')
    return
  }

  if (step === 'await_purchase_disambig') {
    await ctx.reply('Please use the buttons above to choose, or /cancel to abort.')
    return
  }

  if (step === 'await_invoice_disambig') {
    await ctx.reply('Please use the buttons above to choose, or /cancel to abort.')
    return
  }

  if (step === 'await_add_location') {
    await ctx.reply('Please select a location using the buttons above, or /cancel to abort.')
    return
  }

  if (step === 'await_add_category') {
    await ctx.reply('Please select a category using the buttons above, or /cancel to abort.')
    return
  }

  if (step === 'await_invoice_location') {
    await ctx.reply('Please select a location using the buttons above, or /cancel to abort.')
    return
  }

  if (step === 'await_purchase_location') {
    await ctx.reply('Please select a location using the buttons above, or /cancel to abort.')
    return
  }

  if (step === 'await_purchase_supplier') {
    await ctx.reply('Please select a supplier using the buttons above, or /cancel to abort.')
    return
  }

  if (step === 'await_purchase_rate') {
    const input = ctx.message.text.trim().replace(/[,_\s]/g, '')
    const rate = parseFloat(input)
    if (isNaN(rate) || rate <= 0) {
      await ctx.reply(
        'Please enter a valid exchange rate (numbers only, e.g. `1400`).',
        { parse_mode: 'Markdown' }
      )
      return
    }
    ctx.session.pendingPurchaseExchangeRate = rate

    if (ctx.session.pendingPurchaseNeedsCreate) {
      await createMissingAndContinue(ctx, rate)
    } else {
      ctx.session.step = 'await_purchase_status'
      await ctx.reply(
        `✅ Rate: ₦${rate.toLocaleString()}/USD\n\nWhat is the purchase status?`,
        { parse_mode: 'Markdown' }
      )
      await ctx.reply(
        'Select status:',
        Markup.inlineKeyboard([[
          Markup.button.callback('📦 Ordered',  'purchase_status_ordered'),
          Markup.button.callback('✅ Received', 'purchase_status_received'),
          Markup.button.callback('⏳ Pending',  'purchase_status_pending'),
        ]])
      )
    }
    return
  }

  if (step === 'await_purchase_status') {
    await ctx.reply('Please select a status using the buttons above, or /cancel to abort.')
    return
  }

  if (step === 'await_purchase_shipping') {
    const input = ctx.message.text.trim().replace(/[₦,\s]/g, '')
    const amount = parseFloat(input)
    if (isNaN(amount) || amount < 0) {
      await ctx.reply('Please enter a valid amount (or `0` to skip).', { parse_mode: 'Markdown' })
      return
    }
    ctx.session.pendingPurchaseShipping = amount
    if (amount > 0) {
      ctx.session.step = 'await_purchase_shipping_label'
      await ctx.reply(
        `✅ Shipping: ₦${amount.toLocaleString()}\n\nWhat label for the shipping? (e.g. \`Clearing\`, \`Freight\`) Or type \`skip\`.`,
        { parse_mode: 'Markdown' }
      )
    } else {
      ctx.session.step = 'await_purchase_confirm'
      await showPurchaseSummary(ctx)
    }
    return
  }

  if (step === 'await_purchase_shipping_label') {
    const label = ctx.message.text.trim()
    ctx.session.pendingPurchaseShippingLabel = label.toLowerCase() === 'skip' ? '' : label
    ctx.session.step = 'await_purchase_confirm'
    await showPurchaseSummary(ctx)
    return
  }

  if (step === 'await_purchase_confirm') {
    await ctx.reply(
      'Please use the buttons above to confirm or cancel, or type /cancel to abort.'
    )
    return
  }

  if (step === 'await_product_text') {
    ctx.session.step = undefined
    const text = ctx.message.text

    let parsed: ParsedProduct[]
    try {
      parsed = parseTextInput(text)
    } catch (err: any) {
      await ctx.reply(`❌ Couldn't parse that input: ${err.message ?? err}`)
      return
    }

    await checkAndSummarise(ctx, parsed, `Parsed ${parsed.length} product(s) from text`)
    return
  }

  // Unknown message while no active step
  if (!step) {
    await ctx.reply(
      "I didn't understand that. Use /start to see available commands, or /add to add products."
    )
  }
})

// ── Photo handler (/image flow) ───────────────────────────────────────────────

bot.on('photo', async ctx => {
  if (ctx.session.step !== 'await_image_photo') {
    await ctx.reply("Send /image <slug> first to assign a photo to a product.")
    return
  }

  const slug = ctx.session.pendingImageSlug!
  const productName = ctx.session.pendingImageProductName!
  ctx.session = {}

  await ctx.reply('📤 Uploading to Cloudinary…')

  // Largest photo is last in the array
  const photo = ctx.message.photo[ctx.message.photo.length - 1]

  let fileBuffer: Buffer
  try {
    const fileLink = await ctx.telegram.getFileLink(photo.file_id)
    const response = await fetch(fileLink.href)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    fileBuffer = Buffer.from(await response.arrayBuffer())
  } catch (err: any) {
    await ctx.reply(`❌ Failed to download photo: ${err.message ?? err}`)
    return
  }

  const publicId = `modish/products/${slug}`
  let secureUrl: string
  try {
    secureUrl = await cloudinaryUploadBuffer(fileBuffer, publicId)
  } catch (err: any) {
    await ctx.reply(`❌ Cloudinary upload failed: ${err.message ?? err}`)
    return
  }

  try {
    const product = await sanity.fetch<{ _id: string } | null>(
      `*[_type == "product" && slug.current == $slug][0]{ _id }`,
      { slug }
    )
    if (!product) throw new Error(`Product with slug "${slug}" not found`)
    await sanity
      .patch(product._id)
      .set({ images: [{ publicId, alt: productName }] })
      .commit()
  } catch (err: any) {
    await ctx.reply(`❌ Sanity patch failed: ${err.message ?? err}\n\nImage is uploaded at: ${secureUrl}`)
    return
  }

  // Also update Airtable Image URL so content workflows can use the image
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const fullUrl = `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${publicId}`
  try {
    await airtableUpsertProduct({ 'SKU': `product-${slug}`, 'Image URL': fullUrl })
  } catch (err: any) {
    console.error('[Airtable] image patch failed:', err.message ?? err)
  }

  await ctx.reply(
    `✅ *${productName}* image updated!\n\nCloudinary ID: \`${publicId}\`\n${secureUrl}`,
    { parse_mode: 'Markdown' }
  )
})

// ── Document (file) handler ───────────────────────────────────────────────────

bot.on('document', async ctx => {
  const doc = ctx.message.document
  const filename = doc.file_name ?? ''
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  if (!['csv', 'xlsx', 'xls', 'pdf'].includes(ext)) {
    await ctx.reply(
      "Couldn't parse this file. Please send a CSV, Excel (.csv, .xlsx, .xls) or PDF file."
    )
    return
  }

  await ctx.reply(`📥 Downloading *${filename}*…`, { parse_mode: 'Markdown' })

  let fileBuffer: Buffer
  try {
    const fileLink = await ctx.telegram.getFileLink(doc.file_id)
    const response = await fetch(fileLink.href)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    fileBuffer = Buffer.from(await response.arrayBuffer())
  } catch (err: any) {
    await ctx.reply(`❌ Failed to download file: ${err.message ?? err}`)
    return
  }

  // Route to purchase order flow
  if (ctx.session.step === 'await_purchase_file') {
    await handlePurchaseFile(ctx, fileBuffer, ext)
    return
  }

  // PDF: check if it's a supplier invoice first
  if (ext === 'pdf') {
    let rawText = ''
    try {
      const parser = new PDFParse({ data: fileBuffer })
      const result = await parser.getText()
      await parser.destroy()
      rawText = result.text
    } catch (err: any) {
      await ctx.reply(`❌ Failed to read PDF: ${err.message ?? err}`)
      return
    }

    const invoiceRows = parseInvoiceRowsRich(rawText)

    if (invoiceRows.length > 0) {
      // Invoice PDF flow
      await ctx.reply(`🔍 Detected invoice format. Checking ${invoiceRows.length} products against POS…`)

      let pos: any
      try {
        pos = createPOSClientFromEnv()
        await pos.login()
        const allPos = await pos.getProducts()
        const posNameMap = new Map(allPos.map((p: any) => [p.parsedName.toLowerCase(), p]))

        const existing: InvoiceRow[] = []
        const newRows: InvoiceRow[] = []
        const invoiceDisambigQueue: NonNullable<SessionData['pendingInvoiceDisambigQueue']> = []

        for (const row of invoiceRows) {
          if (posNameMap.has(row.posName.toLowerCase())) {
            existing.push(row)
            continue
          }

          // Near-match check: strip size suffix and look for same base color
          const baseColorMatch = row.posName.match(/^(.+?)\s+\d+MM(?:\s+Gloss)?$/i)
          if (baseColorMatch) {
            const baseColorLower = baseColorMatch[1].trim().toLowerCase()
            const nearMatchProducts = allPos.filter((p: any) => {
              const pNameLower = p.parsedName.toLowerCase()
              return pNameLower !== row.posName.toLowerCase() &&
                (pNameLower === baseColorLower || pNameLower.startsWith(baseColorLower + ' '))
            })
            if (nearMatchProducts.length > 0) {
              invoiceDisambigQueue.push({
                row,
                candidates: nearMatchProducts.map((p: any) => ({ posName: p.parsedName })),
              })
              continue
            }
          }

          newRows.push(row)
        }

        if (invoiceDisambigQueue.length > 0) {
          let msg = `📋 *${existing.length} already in POS* — will be skipped\n`
          if (newRows.length > 0) msg += `🆕 *${newRows.length} confirmed new*\n`
          msg += `⚠️ *${invoiceDisambigQueue.length} need disambiguation*`

          ctx.session.step = 'await_invoice_disambig'
          ctx.session.pendingInvoiceNewRows = newRows
          ctx.session.pendingInvoiceDisambigQueue = invoiceDisambigQueue

          await sendLong(ctx, msg)
          await showNextInvoiceDisambig(ctx)
          return
        }

        if (newRows.length === 0) {
          await ctx.reply(
            `✅ All ${invoiceRows.length} products already exist in POS. Nothing to create.`,
            { parse_mode: 'Markdown' }
          )
          ctx.session = {}
          return
        }

        // Show the new products
        let msg = `📋 *${existing.length} already in POS* — will be skipped\n`
        msg += `🆕 *${newRows.length} new products* to be created:\n\n`
        for (const r of newRows) {
          msg += `• ${r.posName} (PDF: ${r.pdfName})\n`
        }

        ctx.session.step = 'await_invoice_location'
        ctx.session.pendingInvoiceNewRows = newRows
        ctx.session.pendingInvoiceCategorySlugs = [...new Set(newRows.map(r => r.categorySlug))]

        await sendLong(ctx, msg)
        await ctx.reply('Which location should these products be created at?', locationKeyboard('inv_loc'))
        return
      } catch (err: any) {
        await ctx.reply(`❌ POS check failed: ${err.message ?? err}`)
        ctx.session = {}
        return
      }
    }

    // Not invoice format — fall back to text parsing (rawText already extracted above)
    let parsed: ParsedProduct[]
    try {
      parsed = parseTextInput(rawText)
    } catch (err: any) {
      await ctx.reply("Couldn't parse this PDF. Please check the file format.")
      return
    }
    await checkAndSummarise(ctx, parsed, `Parsed ${parsed.length} products from ${filename}`)
    return
  }

  // CSV / Excel
  let parsed: ParsedProduct[]
  try {
    if (ext === 'csv') {
      parsed = parseCSV(fileBuffer.toString('utf-8'))
    } else {
      parsed = parseExcel(fileBuffer)
    }
  } catch (err: any) {
    await ctx.reply("Couldn't parse this file. Please send a CSV, Excel, or PDF file.")
    return
  }
  await checkAndSummarise(ctx, parsed, `Parsed ${parsed.length} products from ${filename}`)
})

// ── Unknown command fallback ──────────────────────────────────────────────────

bot.on('message', async ctx => {
  await ctx.reply(
    "I'm not sure what you mean. Use /start to see all available commands."
  )
})

// ── Error handler ─────────────────────────────────────────────────────────────

bot.catch((err: unknown, ctx) => {
  console.error(`[Bot error] for update ${ctx.update.update_id}:`, err)
})

// ── Launch ────────────────────────────────────────────────────────────────────

bot.launch(() => {
  console.log('🤖 Modish Standard Bot is running…')
}).catch(err => {
  console.error('❌ Bot failed to launch:', err)
  process.exit(1)
})

// ── HTTP API server (n8n integration) ─────────────────────────────────────────

const POS_API_KEY = process.env.POS_API_KEY
if (!POS_API_KEY) {
  console.warn('⚠️  POS_API_KEY is not set — HTTP API will accept any Authorization header')
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(payload)
}

function checkApiAuth(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (!POS_API_KEY) return true
  const authHeader = req.headers['authorization'] ?? ''
  if (authHeader === `Bearer ${POS_API_KEY}`) return true
  sendJson(res, 401, { error: 'Unauthorized' })
  return false
}

const apiServer = http.createServer(async (req, res) => {
  const url = req.url ?? '/'
  const method = req.method ?? 'GET'

  if (url === '/health' && method === 'GET') {
    sendJson(res, 200, { status: 'ok' })
    return
  }

  if (url === '/api/products' && method === 'GET') {
    if (!checkApiAuth(req, res)) return

    try {
      const pos = createPOSClientFromEnv()
      await pos.login()
      const rawProducts = await pos.getProducts()

      const active = rawProducts.filter(p => !p.is_inactive && !p.not_for_selling)

      const products = active.map(p => ({
        sku: p.sku,
        name: p.parsedName,
        category: stripHtml(p.category),
        stockQty: p.parsedStock,
        sellingPrice: p.parsedPrice,
        isInStock: p.parsedStock > 0,
      }))

      sendJson(res, 200, products)
    } catch (err: any) {
      sendJson(res, 500, { error: err.message ?? String(err) })
    }
    return
  }

  sendJson(res, 404, { error: 'Not found' })
})

apiServer.listen(3001, () => {
  console.log('📡 POS API server running on :3001')
})

// Graceful shutdown
process.once('SIGINT', () => { bot.stop('SIGINT'); apiServer.close() })
process.once('SIGTERM', () => { bot.stop('SIGTERM'); apiServer.close() })
