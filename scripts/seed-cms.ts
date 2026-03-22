/**
 * Sanity CMS Seed Script — Real Product Data from CSV
 * Run: npm run seed
 *
 * Sources all products from the Modish Standard inventory CSV.
 * Deletes placeholder products and seeds real data.
 */

import { createClient } from 'next-sanity'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

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

// SKUs to mark as featured (top sellers by stock volume)
const FEATURED_SKUS = new Set([
  '301409', // Perfect White MDF UV — 307 pcs
  '301413', // Dark Grey MDF UV — 244 pcs
  '301406', // Off White MDF UV — 224 pcs
  '301419', // Off White HDF UV — 155 pcs
  '301410', // Black MDF UV — 159 pcs
  '274858', // Switch 48MM Edge Tape — 148 rolls
  '275151', // Gold 48MM Edge Tape — 144 rolls
  '274852', // Wenge 48MM Edge Tape — 105 rolls
])

interface CategorySeed {
  name: string
  slug: string
  description: string
}

interface RawProduct {
  name: string
  price: number
  stock: number
  categorySlug: string
  sku: string
  materialType: string
  colorFinish: string
  dimWidth?: number
  dimThickness?: number
}

const categories: CategorySeed[] = [
  {
    name: 'MDF Boards',
    slug: 'mdf-boards',
    description: 'Medium-density fiberboard and specialty board types for furniture, cabinetry, and interior panelling. Available in various finishes.',
  },
  {
    name: 'HDF Boards',
    slug: 'hdf-boards',
    description: 'High-density fiberboard with superior strength and ultra-smooth surface. Ideal for door skins, flooring, and premium furniture.',
  },
  {
    name: 'UV Gloss Boards',
    slug: 'uv-gloss-boards',
    description: 'High-gloss UV-coated boards available on MDF and HDF substrates. Perfect for kitchens, wardrobes, and feature walls in Lagos.',
  },
  {
    name: 'Marine Boards',
    slug: 'marine-boards',
    description: 'Moisture-resistant boards engineered for wet areas including bathrooms, kitchens, and outdoor furniture applications.',
  },
  {
    name: 'Edge Tapes',
    slug: 'edge-tapes',
    description: 'Professional edge banding tapes in 21mm and 48mm widths. Available in matt and gloss finishes to match all board colours.',
  },
  {
    name: 'Doors',
    slug: 'doors',
    description: 'Interior and exterior doors in flush and panel designs. Available in multiple finishes and standard Nigerian sizes.',
  },
  {
    name: 'PU Stone Panels',
    slug: 'pu-stone-panels',
    description: 'Lightweight polyurethane stone-effect wall panels for stunning interior and exterior feature walls.',
  },
  {
    name: 'Block Boards',
    slug: 'block-boards',
    description: 'Solid block boards with timber core and veneer facing. Strong, stable, and ideal for heavy-duty furniture and structural panelling.',
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Fitting accessories, hardware and complementary products for board installation and finishing.',
  },
]

const rawProducts: RawProduct[] = [
  // ── UV GLOSS BOARDS (MDF base) ────────────────────────────────────────────
  { name: 'Black MDF UV Board', price: 26500, stock: 159, categorySlug: 'uv-gloss-boards', sku: '301410', materialType: 'MDF', colorFinish: 'Black' },
  { name: 'Cappuccino MDF UV Board', price: 26500, stock: 6, categorySlug: 'uv-gloss-boards', sku: '301415', materialType: 'MDF', colorFinish: 'Cappuccino' },
  { name: 'Dark Grey MDF UV Board', price: 26500, stock: 244, categorySlug: 'uv-gloss-boards', sku: '301413', materialType: 'MDF', colorFinish: 'Dark Grey' },
  { name: 'Light Grey MDF UV Board', price: 26500, stock: 79, categorySlug: 'uv-gloss-boards', sku: '301418', materialType: 'MDF', colorFinish: 'Light Grey' },
  { name: 'Off White MDF UV Board', price: 26500, stock: 224, categorySlug: 'uv-gloss-boards', sku: '301406', materialType: 'MDF', colorFinish: 'Off White' },
  { name: 'Perfect White MDF UV Board', price: 26500, stock: 307, categorySlug: 'uv-gloss-boards', sku: '301409', materialType: 'MDF', colorFinish: 'Perfect White' },

  // ── UV GLOSS BOARDS (HDF base) ────────────────────────────────────────────
  { name: 'Cappuccino HDF UV Board', price: 44500, stock: 8, categorySlug: 'uv-gloss-boards', sku: '301425', materialType: 'HDF', colorFinish: 'Cappuccino' },
  { name: 'Dark Grey HDF UV Board', price: 44500, stock: 1, categorySlug: 'uv-gloss-boards', sku: '301422', materialType: 'HDF', colorFinish: 'Dark Grey' },
  { name: 'Off White HDF UV Board', price: 44500, stock: 155, categorySlug: 'uv-gloss-boards', sku: '301419', materialType: 'HDF', colorFinish: 'Off White' },
  { name: 'Perfect White HDF UV Board', price: 44500, stock: 0, categorySlug: 'uv-gloss-boards', sku: '301420', materialType: 'HDF', colorFinish: 'Perfect White' },

  // ── BLOCK BOARDS (BB type) ────────────────────────────────────────────────
  { name: 'Brown Masonia BB Board', price: 26000, stock: 36, categorySlug: 'block-boards', sku: '333361', materialType: 'Block Board', colorFinish: 'Brown Masonia' },
  { name: 'Customer Code BB Board', price: 26000, stock: 0, categorySlug: 'block-boards', sku: '333360', materialType: 'Block Board', colorFinish: 'Custom' },

  // ── EDGE TAPES ────────────────────────────────────────────────────────────
  { name: 'Akala Edge Tape 0.5×48MM', price: 16000, stock: 0, categorySlug: 'edge-tapes', sku: '279606', materialType: 'Edge Tape', colorFinish: 'Akala', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Akala Edge Tape 0.5×48MM Gloss', price: 16500, stock: 7, categorySlug: 'edge-tapes', sku: '274841', materialType: 'Edge Tape', colorFinish: 'Akala Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Akala Edge Tape 48MM', price: 16500, stock: 30, categorySlug: 'edge-tapes', sku: '274851', materialType: 'Edge Tape', colorFinish: 'Akala', dimWidth: 48 },
  { name: 'Asunranmu Edge Tape 21MM', price: 15000, stock: 0, categorySlug: 'edge-tapes', sku: '274112', materialType: 'Edge Tape', colorFinish: 'Asunranmu', dimWidth: 21 },
  { name: 'Asunranmu Edge Tape 48MM', price: 17000, stock: 5, categorySlug: 'edge-tapes', sku: '275136', materialType: 'Edge Tape', colorFinish: 'Asunranmu', dimWidth: 48 },
  { name: 'Bamboo Edge Tape 48MM', price: 15000, stock: 66, categorySlug: 'edge-tapes', sku: '354515', materialType: 'Edge Tape', colorFinish: 'Bamboo', dimWidth: 48 },
  { name: 'Beech Edge Tape 48MM', price: 15000, stock: 46, categorySlug: 'edge-tapes', sku: '354513', materialType: 'Edge Tape', colorFinish: 'Beech', dimWidth: 48 },
  { name: 'Biege Edge Tape 0.5×48MM', price: 15000, stock: 35, categorySlug: 'edge-tapes', sku: '274838', materialType: 'Edge Tape', colorFinish: 'Biege', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Biege Edge Tape 0.5×48MM Gloss', price: 15500, stock: 14, categorySlug: 'edge-tapes', sku: '274848', materialType: 'Edge Tape', colorFinish: 'Biege Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Biege Edge Tape 21MM', price: 15000, stock: 26, categorySlug: 'edge-tapes', sku: '273965', materialType: 'Edge Tape', colorFinish: 'Biege', dimWidth: 21 },
  { name: 'Biege Edge Tape 48MM', price: 16000, stock: 38, categorySlug: 'edge-tapes', sku: '274808', materialType: 'Edge Tape', colorFinish: 'Biege', dimWidth: 48 },
  { name: 'Black Edge Tape 0.5×48MM', price: 16000, stock: 10, categorySlug: 'edge-tapes', sku: '279610', materialType: 'Edge Tape', colorFinish: 'Black', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Black Edge Tape 0.5×48MM Gloss', price: 16500, stock: 20, categorySlug: 'edge-tapes', sku: '279616', materialType: 'Edge Tape', colorFinish: 'Black Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Black Edge Tape 21MM', price: 15500, stock: 17, categorySlug: 'edge-tapes', sku: '273959', materialType: 'Edge Tape', colorFinish: 'Black', dimWidth: 21 },
  { name: 'Black Edge Tape 21MM Gloss', price: 16000, stock: 12, categorySlug: 'edge-tapes', sku: '273937', materialType: 'Edge Tape', colorFinish: 'Black Gloss', dimWidth: 21 },
  { name: 'Black Edge Tape 48MM', price: 14500, stock: 58, categorySlug: 'edge-tapes', sku: '274850', materialType: 'Edge Tape', colorFinish: 'Black', dimWidth: 48 },
  { name: 'Black Edge Tape 48MM Gloss', price: 15500, stock: 50, categorySlug: 'edge-tapes', sku: '275149', materialType: 'Edge Tape', colorFinish: 'Black Gloss', dimWidth: 48 },
  { name: 'Brown Masonia Edge Tape 21MM Gloss', price: 16000, stock: 17, categorySlug: 'edge-tapes', sku: '274114', materialType: 'Edge Tape', colorFinish: 'Brown Masonia Gloss', dimWidth: 21 },
  { name: 'Brown Masonia Edge Tape 48MM', price: 16000, stock: 29, categorySlug: 'edge-tapes', sku: '275137', materialType: 'Edge Tape', colorFinish: 'Brown Masonia', dimWidth: 48 },
  { name: 'Cappuccino Edge Tape 0.5×48MM', price: 15000, stock: 10, categorySlug: 'edge-tapes', sku: '274830', materialType: 'Edge Tape', colorFinish: 'Cappuccino', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Cappuccino Edge Tape 0.5×48MM Gloss', price: 16500, stock: 2, categorySlug: 'edge-tapes', sku: '279615', materialType: 'Edge Tape', colorFinish: 'Cappuccino Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Cappuccino Edge Tape 21MM Gloss', price: 16000, stock: 2, categorySlug: 'edge-tapes', sku: '273934', materialType: 'Edge Tape', colorFinish: 'Cappuccino Gloss', dimWidth: 21 },
  { name: 'Cappuccino Edge Tape 48MM', price: 14500, stock: 93, categorySlug: 'edge-tapes', sku: '274121', materialType: 'Edge Tape', colorFinish: 'Cappuccino', dimWidth: 48 },
  { name: 'Cappuccino Edge Tape 48MM Gloss', price: 15500, stock: 59, categorySlug: 'edge-tapes', sku: '275147', materialType: 'Edge Tape', colorFinish: 'Cappuccino Gloss', dimWidth: 48 },
  { name: 'Cedar Edge Tape 0.5×48MM', price: 16000, stock: 4, categorySlug: 'edge-tapes', sku: '279609', materialType: 'Edge Tape', colorFinish: 'Cedar', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Cedar Edge Tape 0.5×48MM Gloss', price: 16500, stock: 12, categorySlug: 'edge-tapes', sku: '279612', materialType: 'Edge Tape', colorFinish: 'Cedar Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Cedar Edge Tape 21MM Gloss', price: 16000, stock: 5, categorySlug: 'edge-tapes', sku: '274115', materialType: 'Edge Tape', colorFinish: 'Cedar Gloss', dimWidth: 21 },
  { name: 'Cedar Edge Tape 48MM', price: 15000, stock: 85, categorySlug: 'edge-tapes', sku: '274854', materialType: 'Edge Tape', colorFinish: 'Cedar', dimWidth: 48 },
  { name: 'Cedar Edge Tape 48MM Gloss', price: 16500, stock: 12, categorySlug: 'edge-tapes', sku: '275148', materialType: 'Edge Tape', colorFinish: 'Cedar Gloss', dimWidth: 48 },
  { name: 'Codoba Edge Tape 21MM', price: 15500, stock: 20, categorySlug: 'edge-tapes', sku: '273855', materialType: 'Edge Tape', colorFinish: 'Codoba', dimWidth: 21 },
  { name: 'Color 1123-1 Edge Tape 48MM', price: 15000, stock: 27, categorySlug: 'edge-tapes', sku: '354522', materialType: 'Edge Tape', colorFinish: 'Color 1123-1', dimWidth: 48 },
  { name: 'Color 40 Edge Tape 21MM', price: 15500, stock: 13, categorySlug: 'edge-tapes', sku: '273926', materialType: 'Edge Tape', colorFinish: 'Color 40', dimWidth: 21 },
  { name: 'Color 40 Edge Tape 48MM', price: 16000, stock: 28, categorySlug: 'edge-tapes', sku: '275142', materialType: 'Edge Tape', colorFinish: 'Color 40', dimWidth: 48 },
  { name: 'Color 5201 Edge Tape 48MM', price: 17000, stock: 5, categorySlug: 'edge-tapes', sku: '275143', materialType: 'Edge Tape', colorFinish: 'Color 5201', dimWidth: 48 },
  { name: 'Color 6200 Edge Tape 48MM', price: 15000, stock: 64, categorySlug: 'edge-tapes', sku: '354516', materialType: 'Edge Tape', colorFinish: 'Color 6200', dimWidth: 48 },
  { name: 'Color 6490 Edge Tape 48MM', price: 16000, stock: 1, categorySlug: 'edge-tapes', sku: '274857', materialType: 'Edge Tape', colorFinish: 'Color 6490', dimWidth: 48 },
  { name: 'Color 6655 Edge Tape 48MM', price: 15000, stock: 42, categorySlug: 'edge-tapes', sku: '354517', materialType: 'Edge Tape', colorFinish: 'Color 6655', dimWidth: 48 },
  { name: 'Akala Masonia Edge Tape 21MM', price: 15523, stock: 39, categorySlug: 'edge-tapes', sku: '273928', materialType: 'Edge Tape', colorFinish: 'Akala Masonia', dimWidth: 21 },
  { name: 'Akala Masonia Edge Tape 48MM', price: 32000, stock: 1, categorySlug: 'edge-tapes', sku: '273945', materialType: 'Edge Tape', colorFinish: 'Akala Masonia', dimWidth: 48 },
  { name: 'Akala Masonia Edge Tape 48MM Gloss', price: 32000, stock: 4, categorySlug: 'edge-tapes', sku: '273949', materialType: 'Edge Tape', colorFinish: 'Akala Masonia Gloss', dimWidth: 48 },
  { name: 'Color 7049 Edge Tape 48MM', price: 15000, stock: 37, categorySlug: 'edge-tapes', sku: '354518', materialType: 'Edge Tape', colorFinish: 'Color 7049', dimWidth: 48 },
  { name: 'Color 7469 Edge Tape 21MM', price: 15523, stock: 2, categorySlug: 'edge-tapes', sku: '273927', materialType: 'Edge Tape', colorFinish: 'Color 7469', dimWidth: 21 },
  { name: 'Color 7742 Edge Tape 21MM', price: 15500, stock: 21, categorySlug: 'edge-tapes', sku: '273930', materialType: 'Edge Tape', colorFinish: 'Color 7742', dimWidth: 21 },
  { name: 'Color 7742 Edge Tape 48MM', price: 32000, stock: 4, categorySlug: 'edge-tapes', sku: '273946', materialType: 'Edge Tape', colorFinish: 'Color 7742', dimWidth: 48 },
  { name: 'Color 7901 Edge Tape 21MM', price: 15500, stock: 18, categorySlug: 'edge-tapes', sku: '273933', materialType: 'Edge Tape', colorFinish: 'Color 7901', dimWidth: 21 },
  { name: 'Color 7901 Edge Tape 48MM', price: 15500, stock: 0, categorySlug: 'edge-tapes', sku: '273932', materialType: 'Edge Tape', colorFinish: 'Color 7901', dimWidth: 48 },
  { name: 'Customer Code Edge Tape 21MM', price: 15500, stock: 0, categorySlug: 'edge-tapes', sku: '277602', materialType: 'Edge Tape', colorFinish: 'Custom', dimWidth: 21 },
  { name: 'Customer Code Edge Tape 48MM', price: 16000, stock: 3, categorySlug: 'edge-tapes', sku: '274853', materialType: 'Edge Tape', colorFinish: 'Custom', dimWidth: 48 },
  { name: 'Dark Grey Edge Tape 0.5×48MM', price: 15000, stock: 18, categorySlug: 'edge-tapes', sku: '274836', materialType: 'Edge Tape', colorFinish: 'Dark Grey', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Dark Grey Edge Tape 0.5×48MM Gloss', price: 16500, stock: 11, categorySlug: 'edge-tapes', sku: '274845', materialType: 'Edge Tape', colorFinish: 'Dark Grey Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Dark Grey Edge Tape 21MM Gloss', price: 16000, stock: 24, categorySlug: 'edge-tapes', sku: '273939', materialType: 'Edge Tape', colorFinish: 'Dark Grey Gloss', dimWidth: 21 },
  { name: 'Dark Grey Edge Tape 48MM', price: 14500, stock: 68, categorySlug: 'edge-tapes', sku: '274849', materialType: 'Edge Tape', colorFinish: 'Dark Grey', dimWidth: 48 },
  { name: 'Dark Grey Edge Tape 48MM Gloss', price: 15500, stock: 42, categorySlug: 'edge-tapes', sku: '275150', materialType: 'Edge Tape', colorFinish: 'Dark Grey Gloss', dimWidth: 48 },
  { name: 'Gold Edge Tape 48MM', price: 39000, stock: 144, categorySlug: 'edge-tapes', sku: '275151', materialType: 'Edge Tape', colorFinish: 'Gold', dimWidth: 48 },
  { name: 'Grey Edge Tape 0.5×48MM Gloss', price: 16500, stock: 14, categorySlug: 'edge-tapes', sku: '274844', materialType: 'Edge Tape', colorFinish: 'Grey Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Grey Edge Tape 21MM Gloss', price: 16000, stock: 2, categorySlug: 'edge-tapes', sku: '273935', materialType: 'Edge Tape', colorFinish: 'Grey Gloss', dimWidth: 21 },
  { name: 'Grey Edge Tape 48MM Gloss', price: 16500, stock: 4, categorySlug: 'edge-tapes', sku: '273954', materialType: 'Edge Tape', colorFinish: 'Grey Gloss', dimWidth: 48 },
  { name: 'HC059 Edge Tape 21MM', price: 15500, stock: 1, categorySlug: 'edge-tapes', sku: '273931', materialType: 'Edge Tape', colorFinish: 'HC059', dimWidth: 21 },
  { name: 'Light Dark Grey Edge Tape 0.5×48MM', price: 15000, stock: 27, categorySlug: 'edge-tapes', sku: '274837', materialType: 'Edge Tape', colorFinish: 'Light Dark Grey', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Light Dark Grey Edge Tape 0.5×48MM Gloss', price: 15500, stock: 18, categorySlug: 'edge-tapes', sku: '274847', materialType: 'Edge Tape', colorFinish: 'Light Dark Grey Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Light Dark Grey Edge Tape 0.5×48MM Gloss B', price: 14250, stock: 0, categorySlug: 'edge-tapes', sku: '274846', materialType: 'Edge Tape', colorFinish: 'Light Dark Grey Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Light Dark Grey Edge Tape 21MM', price: 15000, stock: 11, categorySlug: 'edge-tapes', sku: '273966', materialType: 'Edge Tape', colorFinish: 'Light Dark Grey', dimWidth: 21 },
  { name: 'Light Dark Grey Edge Tape 48MM', price: 15500, stock: 6, categorySlug: 'edge-tapes', sku: '274811', materialType: 'Edge Tape', colorFinish: 'Light Dark Grey', dimWidth: 48 },
  { name: 'Light Grey Edge Tape 0.5×48MM', price: 15000, stock: 13, categorySlug: 'edge-tapes', sku: '274834', materialType: 'Edge Tape', colorFinish: 'Light Grey', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Light Grey Edge Tape 21MM', price: 15000, stock: 73, categorySlug: 'edge-tapes', sku: '273956', materialType: 'Edge Tape', colorFinish: 'Light Grey', dimWidth: 21 },
  { name: 'Light Grey Edge Tape 48MM', price: 14500, stock: 57, categorySlug: 'edge-tapes', sku: '274120', materialType: 'Edge Tape', colorFinish: 'Light Grey', dimWidth: 48 },
  { name: 'Light Grey Edge Tape 48MM Gloss', price: 15500, stock: 30, categorySlug: 'edge-tapes', sku: '354525', materialType: 'Edge Tape', colorFinish: 'Light Grey Gloss', dimWidth: 48 },
  { name: 'M4 Edge Tape 48MM', price: 16500, stock: 2, categorySlug: 'edge-tapes', sku: '274855', materialType: 'Edge Tape', colorFinish: 'M4', dimWidth: 48 },
  { name: 'Marble Edge Tape 21MM', price: 15500, stock: 22, categorySlug: 'edge-tapes', sku: '273871', materialType: 'Edge Tape', colorFinish: 'Marble', dimWidth: 21 },
  { name: 'Marble Edge Tape 21MM Gloss', price: 16000, stock: 35, categorySlug: 'edge-tapes', sku: '274116', materialType: 'Edge Tape', colorFinish: 'Marble Gloss', dimWidth: 21 },
  { name: 'Marble Edge Tape 48MM', price: 32000, stock: 3, categorySlug: 'edge-tapes', sku: '273942', materialType: 'Edge Tape', colorFinish: 'Marble', dimWidth: 48 },
  { name: 'Marble Edge Tape 48MM Gloss', price: 16000, stock: 7, categorySlug: 'edge-tapes', sku: '274817', materialType: 'Edge Tape', colorFinish: 'Marble Gloss', dimWidth: 48 },
  { name: 'Masonia1 Edge Tape 48MM', price: 16500, stock: 0, categorySlug: 'edge-tapes', sku: '274860', materialType: 'Edge Tape', colorFinish: 'Masonia', dimWidth: 48 },
  { name: 'Masonia4 Edge Tape 21MM', price: 15000, stock: 0, categorySlug: 'edge-tapes', sku: '274111', materialType: 'Edge Tape', colorFinish: 'Masonia', dimWidth: 21 },
  { name: 'Masonia4 Edge Tape 48MM', price: 15000, stock: 87, categorySlug: 'edge-tapes', sku: '273862', materialType: 'Edge Tape', colorFinish: 'Masonia', dimWidth: 48 },
  { name: 'New Cedar Edge Tape 48MM', price: 15000, stock: 54, categorySlug: 'edge-tapes', sku: '354511', materialType: 'Edge Tape', colorFinish: 'Cedar', dimWidth: 48 },
  { name: 'Off White Edge Tape 0.5×48MM Gloss', price: 16500, stock: 11, categorySlug: 'edge-tapes', sku: '279614', materialType: 'Edge Tape', colorFinish: 'Off White Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Off White Edge Tape 21MM', price: 15000, stock: 1, categorySlug: 'edge-tapes', sku: '273958', materialType: 'Edge Tape', colorFinish: 'Off White', dimWidth: 21 },
  { name: 'Off White Edge Tape 21MM Gloss', price: 16000, stock: 5, categorySlug: 'edge-tapes', sku: '274119', materialType: 'Edge Tape', colorFinish: 'Off White Gloss', dimWidth: 21 },
  { name: 'Off White Edge Tape 48MM', price: 16000, stock: 32, categorySlug: 'edge-tapes', sku: '273940', materialType: 'Edge Tape', colorFinish: 'Off White', dimWidth: 48 },
  { name: 'Off White Edge Tape 48MM Gloss', price: 15500, stock: 67, categorySlug: 'edge-tapes', sku: '274821', materialType: 'Edge Tape', colorFinish: 'Off White Gloss', dimWidth: 48 },
  { name: 'Perfect White Edge Tape 21MM', price: 15000, stock: 46, categorySlug: 'edge-tapes', sku: '273964', materialType: 'Edge Tape', colorFinish: 'Perfect White', dimWidth: 21 },
  { name: 'Perfect White Edge Tape 21MM Gloss', price: 16000, stock: 1, categorySlug: 'edge-tapes', sku: '274117', materialType: 'Edge Tape', colorFinish: 'Perfect White Gloss', dimWidth: 21 },
  { name: 'Perfect White Edge Tape 48MM', price: 16000, stock: 5, categorySlug: 'edge-tapes', sku: '273941', materialType: 'Edge Tape', colorFinish: 'Perfect White', dimWidth: 48 },
  { name: 'Perfect White Edge Tape 48MM Gloss', price: 16500, stock: 3, categorySlug: 'edge-tapes', sku: '274818', materialType: 'Edge Tape', colorFinish: 'Perfect White Gloss', dimWidth: 48 },
  { name: 'Perfect White Edge Tape 0.5×48MM', price: 16000, stock: 1, categorySlug: 'edge-tapes', sku: '274827', materialType: 'Edge Tape', colorFinish: 'Perfect White', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Perfect White Edge Tape 0.5×48MM Gloss', price: 16500, stock: 13, categorySlug: 'edge-tapes', sku: '279613', materialType: 'Edge Tape', colorFinish: 'Perfect White Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Red Rose Edge Tape 0.5×48MM', price: 16000, stock: 11, categorySlug: 'edge-tapes', sku: '274824', materialType: 'Edge Tape', colorFinish: 'Red Rose', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Red Rose Edge Tape 0.5×48MM Gloss', price: 16500, stock: 11, categorySlug: 'edge-tapes', sku: '274843', materialType: 'Edge Tape', colorFinish: 'Red Rose Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Red Rose Edge Tape 21MM', price: 15000, stock: 0, categorySlug: 'edge-tapes', sku: '274110', materialType: 'Edge Tape', colorFinish: 'Red Rose', dimWidth: 21 },
  { name: 'Red Rose Edge Tape 48MM', price: 16000, stock: 1, categorySlug: 'edge-tapes', sku: '274814', materialType: 'Edge Tape', colorFinish: 'Red Rose', dimWidth: 48 },
  { name: 'Silver Edge Tape 21MM Gloss', price: 30000, stock: 24, categorySlug: 'edge-tapes', sku: '273936', materialType: 'Edge Tape', colorFinish: 'Silver Gloss', dimWidth: 21 },
  { name: 'Silver Grey Edge Tape 21MM', price: 15500, stock: 0, categorySlug: 'edge-tapes', sku: '273845', materialType: 'Edge Tape', colorFinish: 'Silver Grey', dimWidth: 21 },
  { name: 'Silver Grey Edge Tape 48MM', price: 16500, stock: 1, categorySlug: 'edge-tapes', sku: '274856', materialType: 'Edge Tape', colorFinish: 'Silver Grey', dimWidth: 48 },
  { name: 'Soldier Edge Tape 48MM', price: 16000, stock: 0, categorySlug: 'edge-tapes', sku: '275144', materialType: 'Edge Tape', colorFinish: 'Soldier', dimWidth: 48 },
  { name: 'ST-7890 Edge Tape 48MM', price: 15000, stock: 45, categorySlug: 'edge-tapes', sku: '354519', materialType: 'Edge Tape', colorFinish: 'ST-7890', dimWidth: 48 },
  { name: 'ST-89 Edge Tape 48MM', price: 15000, stock: 43, categorySlug: 'edge-tapes', sku: '354521', materialType: 'Edge Tape', colorFinish: 'ST-89', dimWidth: 48 },
  { name: 'St-z2 Edge Tape 21MM', price: 15500, stock: 6, categorySlug: 'edge-tapes', sku: '273925', materialType: 'Edge Tape', colorFinish: 'St-z2', dimWidth: 21 },
  { name: 'ST-z2 Edge Tape 48MM', price: 16000, stock: 0, categorySlug: 'edge-tapes', sku: '274859', materialType: 'Edge Tape', colorFinish: 'St-z2', dimWidth: 48 },
  { name: 'Switch Edge Tape 0.5×48MM', price: 16000, stock: 0, categorySlug: 'edge-tapes', sku: '279608', materialType: 'Edge Tape', colorFinish: 'Switch', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Switch Edge Tape 0.5×48MM Gloss', price: 16500, stock: 6, categorySlug: 'edge-tapes', sku: '279611', materialType: 'Edge Tape', colorFinish: 'Switch Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Switch Edge Tape 21MM Gloss', price: 16000, stock: 16, categorySlug: 'edge-tapes', sku: '274113', materialType: 'Edge Tape', colorFinish: 'Switch Gloss', dimWidth: 21 },
  { name: 'Switch Edge Tape 48MM', price: 15000, stock: 148, categorySlug: 'edge-tapes', sku: '274858', materialType: 'Edge Tape', colorFinish: 'Switch', dimWidth: 48 },
  { name: 'Switch Edge Tape 48MM Gloss', price: 17000, stock: 22, categorySlug: 'edge-tapes', sku: '275145', materialType: 'Edge Tape', colorFinish: 'Switch Gloss', dimWidth: 48 },
  { name: 'Wenge Edge Tape 0.5×48MM', price: 16000, stock: 4, categorySlug: 'edge-tapes', sku: '279605', materialType: 'Edge Tape', colorFinish: 'Wenge', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Wenge Edge Tape 0.5×48MM Gloss', price: 16500, stock: 26, categorySlug: 'edge-tapes', sku: '274840', materialType: 'Edge Tape', colorFinish: 'Wenge Gloss', dimWidth: 48, dimThickness: 0.5 },
  { name: 'Wenge Edge Tape 21MM', price: 15000, stock: 7, categorySlug: 'edge-tapes', sku: '274109', materialType: 'Edge Tape', colorFinish: 'Wenge', dimWidth: 21 },
  { name: 'Wenge Edge Tape 21MM Gloss', price: 16000, stock: 13, categorySlug: 'edge-tapes', sku: '273938', materialType: 'Edge Tape', colorFinish: 'Wenge Gloss', dimWidth: 21 },
  { name: 'Wenge Edge Tape 48MM', price: 15000, stock: 105, categorySlug: 'edge-tapes', sku: '274852', materialType: 'Edge Tape', colorFinish: 'Wenge', dimWidth: 48 },
  { name: 'Wenge Edge Tape 48MM Gloss', price: 16500, stock: 22, categorySlug: 'edge-tapes', sku: '275146', materialType: 'Edge Tape', colorFinish: 'Wenge Gloss', dimWidth: 48 },
  { name: 'White Edge Tape 21MM', price: 15000, stock: 16, categorySlug: 'edge-tapes', sku: '273957', materialType: 'Edge Tape', colorFinish: 'White', dimWidth: 21 },
  { name: 'White Edge Tape 21MM Gloss', price: 16000, stock: 25, categorySlug: 'edge-tapes', sku: '274118', materialType: 'Edge Tape', colorFinish: 'White Gloss', dimWidth: 21 },
  { name: 'White Edge Tape 48MM Gloss', price: 16500, stock: 3, categorySlug: 'edge-tapes', sku: '273953', materialType: 'Edge Tape', colorFinish: 'White Gloss', dimWidth: 48 },
  { name: 'White Masonia Edge Tape 0.5×48MM', price: 16000, stock: 1, categorySlug: 'edge-tapes', sku: '279607', materialType: 'Edge Tape', colorFinish: 'White Masonia', dimWidth: 48, dimThickness: 0.5 },
  { name: 'White Masonia Edge Tape 48MM', price: 15000, stock: 61, categorySlug: 'edge-tapes', sku: '275141', materialType: 'Edge Tape', colorFinish: 'White Masonia', dimWidth: 48 },
  { name: 'Zebrano Edge Tape 21MM', price: 15500, stock: 5, categorySlug: 'edge-tapes', sku: '273874', materialType: 'Edge Tape', colorFinish: 'Zebrano', dimWidth: 21 },
  { name: 'Zebrano Edge Tape 48MM', price: 32000, stock: 0, categorySlug: 'edge-tapes', sku: '273943', materialType: 'Edge Tape', colorFinish: 'Zebrano', dimWidth: 48 },
]

// Plain solid colours — no embossed texture
const PLAIN_COLORS = new Set([
  'white', 'black', 'dark grey', 'light dark grey', 'light grey', 'grey',
  'cappuccino', 'biege', 'off white', 'perfect white', 'red rose',
  'silver grey', 'custom', 'white masonia',
])

// Gold and Silver always carry Gloss finish label only
const GLOSS_ONLY = new Set(['gold', 'silver'])

/**
 * Resolves the final colorFinish label applying embossed/gloss-matt/gloss-embossed rules.
 * - Plain colours (non-gloss)       → unchanged  e.g. "Black"
 * - Plain colours (gloss)           → "X Gloss Matt"
 * - Non-plain colours (non-gloss)   → "X Embossed"
 * - Non-plain colours (gloss)       → "X Gloss Embossed"
 * - Gold / Silver (any)             → "X Gloss"
 */
function resolveFinish(colorFinish: string): string {
  const isGloss = colorFinish.toLowerCase().endsWith(' gloss')
  const base = isGloss ? colorFinish.slice(0, -6).trim() : colorFinish
  const baseLower = base.toLowerCase()

  if (GLOSS_ONLY.has(baseLower)) return `${base} Gloss`
  if (PLAIN_COLORS.has(baseLower)) return isGloss ? `${base} Gloss Matt` : base
  return isGloss ? `${base} Gloss Embossed` : `${base} Embossed`
}

function buildShortDescription(p: RawProduct): string {
  if (p.categorySlug === 'uv-gloss-boards') {
    return `UV gloss ${p.materialType} board in ${p.colorFinish} finish. Premium quality for kitchens, wardrobes, and cabinetry. Sold per piece. Available in Lagos, Nigeria.`
  }
  if (p.categorySlug === 'mdf-boards') {
    return `${p.colorFinish} MDF board for furniture and interior use. Smooth surface, consistent density. Available at Modish Standard, Lagos.`
  }
  if (p.categorySlug === 'block-boards') {
    return `${p.colorFinish} block board with solid timber core and veneer facing. Strong and stable for heavy-duty furniture and structural panelling. Available at Modish Standard, Lagos.`
  }
  if (p.categorySlug === 'edge-tapes') {
    const resolvedFinish = resolveFinish(p.colorFinish)
    const effectiveThickness = p.dimThickness ?? 1
    const width = p.dimWidth ? `${p.dimWidth}mm wide` : ''
    const thick = `, ${effectiveThickness}mm thick`
    const rollLength = p.dimWidth === 21 ? '200-metre' : '100-metre'
    return `${resolvedFinish} edge banding tape, ${width}${thick}. ${rollLength} roll. Matches standard MDF and HDF board finishes.`
  }
  return `${p.name}. Premium quality product from Modish Standard, Lagos.`
}

async function seed() {
  console.log('🌱 Starting Modish Standard CMS seed...\n')

  // Step 1 — Delete all existing products to start fresh
  console.log('🗑  Deleting existing products...')
  const existingIds: string[] = await client.fetch('*[_type == "product"]._id')
  for (const id of existingIds) {
    await client.delete(id)
  }
  console.log(`   Deleted ${existingIds.length} existing products.\n`)

  // Step 2 — Upsert categories
  console.log('📂 Upserting categories...')
  const categoryRefs: Record<string, string> = {}
  for (const cat of categories) {
    const doc = await client.createOrReplace({
      _id: `category-${cat.slug}`,
      _type: 'category',
      name: cat.name,
      slug: { _type: 'slug', current: cat.slug },
      description: cat.description,
    })
    categoryRefs[cat.slug] = doc._id
    console.log(`   ✓ ${cat.name}`)
  }

  console.log(`\n📦 Creating ${rawProducts.length} products...\n`)

  // Step 3 — Create all real products
  let count = 0
  for (const p of rawProducts) {
    const slug = toSlug(p.name)
    const stockStatus: 'in_stock' | 'out_of_stock' | 'on_request' =
      p.stock > 0 ? 'in_stock' : 'out_of_stock'

    const doc: Record<string, unknown> & { _id: string; _type: string } = {
      _id: `product-sku-${p.sku}`,
      _type: 'product',
      name: p.name,
      slug: { _type: 'slug', current: slug },
      category: { _type: 'reference', _ref: categoryRefs[p.categorySlug] },
      shortDescription: buildShortDescription(p),
      price: p.price,
      materialType: p.materialType,
      colorFinish: p.categorySlug === 'edge-tapes' ? resolveFinish(p.colorFinish) : p.colorFinish,
      stockStatus,
      isFeatured: FEATURED_SKUS.has(p.sku),
      metaTitle: `${p.name} | Lagos Nigeria — Modish Standard`.slice(0, 70),
      metaDescription: `Buy ${p.name} in Lagos. ${buildShortDescription(p)}`.slice(0, 160),
    }

    if (p.dimWidth || p.dimThickness || p.categorySlug === 'edge-tapes') {
      doc.dimensions = {
        ...(p.dimWidth ? { width: p.dimWidth } : {}),
        thickness: p.dimThickness ?? (p.categorySlug === 'edge-tapes' ? 1 : undefined),
        unit: 'mm',
      }
    }

    await client.createOrReplace(doc)
    count++
    if (count % 20 === 0) console.log(`   ... ${count}/${rawProducts.length}`)
  }

  console.log(`\n✅ Seed complete!`)
  console.log(`   Categories : ${categories.length}`)
  console.log(`   Products   : ${count}`)
  console.log(`   Featured   : ${rawProducts.filter(p => FEATURED_SKUS.has(p.sku)).length}`)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
