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
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import * as http from 'node:http'
import { Telegraf, session, Markup, Context } from 'telegraf'
import { createClient } from 'next-sanity'
import { POSClient, createPOSClientFromEnv, type POSProduct } from './pos-client'
import {
  parseCSV,
  parseExcel,
  parseTextInput,
  type ParsedProduct,
} from './parse-product-doc'

// ── Sanity client ─────────────────────────────────────────────────────────────

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

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
  step?: 'await_product_text' | 'await_confirm_create' | 'await_sync_after_create'
  pendingCreate?: ParsedProduct[]
  pendingCategories?: string[]
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
        _id: `product-sku-${p.sku}`,
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

  const existingIds: string[] = await sanity.fetch('*[_type == "product"]._id')
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
  ctx.session.step = 'await_confirm_create'

  await ctx.reply(
    `Create the ${missingParsed.length} missing product(s) in POS?`,
    Markup.inlineKeyboard([
      Markup.button.callback(`✅ Yes, create ${missingParsed.length}`, 'confirm_create'),
      Markup.button.callback('❌ Cancel', 'cancel_action'),
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
    `*Commands:*\n` +
    `/add — Add products to POS via text, or upload a CSV/Excel file\n` +
    `/find [name] — Search POS by name, get SKU + direct edit link\n` +
    `/sync [category] — Push POS → Sanity website (omit category to sync all)\n` +
    `/syncstock — Sync stock to Airtable and trigger content generation (Instagram/WhatsApp)\n` +
    `/list [category] — Browse products currently in POS\n` +
    `/status — Check POS + Sanity connections\n` +
    `/cancel — Cancel the current operation\n\n` +
    `*Category slugs* (for /sync and /list):\n` +
    `\`mdf-boards\` · \`hdf-boards\` · \`uv-gloss-boards\`\n` +
    `\`marine-boards\` · \`block-boards\` · \`edge-tapes\`\n` +
    `\`doors\` · \`pu-stone-panels\` · \`accessories\`\n\n` +
    `*Tips:*\n` +
    `• /add then describe products in plain text, or just send a CSV/Excel file directly\n` +
    `• /sync with no argument syncs everything at once\n` +
    `• /find returns a direct POS edit link so you can update price/stock immediately`,
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

// ── Inline keyboard callbacks ─────────────────────────────────────────────────

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

  const successes: string[] = []
  const failures: string[] = []

  for (const product of pending) {
    try {
      const result = await pos.createProduct({
        name: product.name,
        costPrice: product.costPrice ?? Math.round((product.price ?? 0) * 0.65),
        sellingPrice: product.price ?? 0,
      })
      successes.push(`✅ ${result.name} (SKU: ${result.sku})`)
    } catch (err: any) {
      failures.push(`❌ ${product.name}: ${err.message ?? err}`)
    }
  }

  let msg = `*Creation results:*\n\n`
  if (successes.length > 0) msg += successes.join('\n') + '\n'
  if (failures.length > 0) msg += '\n' + failures.join('\n') + '\n'

  await sendLong(ctx, msg)

  const categories = ctx.session.pendingCategories ?? []
  ctx.session.pendingCreate = undefined
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

bot.action('cancel_action', async ctx => {
  await ctx.answerCbQuery()
  ctx.session = {}
  await ctx.reply('Cancelled.')
})

// ── Text message handler (multi-step flows) ───────────────────────────────────

bot.on('text', async ctx => {
  const { step } = ctx.session

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

// ── Document (file) handler ───────────────────────────────────────────────────

bot.on('document', async ctx => {
  const doc = ctx.message.document
  const filename = doc.file_name ?? ''
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    await ctx.reply(
      "Couldn't parse this file. Please send a CSV or Excel file (.csv, .xlsx, .xls)."
    )
    return
  }

  await ctx.reply(`📥 Downloading *${filename}*…`, { parse_mode: 'Markdown' })

  let fileBuffer: Buffer
  try {
    const fileLink = await ctx.telegram.getFileLink(doc.file_id)
    const response = await fetch(fileLink.href)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    fileBuffer = Buffer.from(arrayBuffer)
  } catch (err: any) {
    await ctx.reply(`❌ Failed to download file: ${err.message ?? err}`)
    return
  }

  let parsed: ParsedProduct[]
  try {
    if (ext === 'csv') {
      parsed = parseCSV(fileBuffer.toString('utf-8'))
    } else {
      parsed = parseExcel(fileBuffer)
    }
  } catch (err: any) {
    await ctx.reply("Couldn't parse this file. Please send a CSV or Excel file.")
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
