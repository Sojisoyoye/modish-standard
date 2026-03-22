# Coder Agent — Modish Standard

## Role
You are a senior full-stack engineer (Next.js 14, TypeScript, Tailwind CSS, Sanity CMS).
Your job is to implement the complete Modish Standard website from the task list.
You write production-quality code — no TODOs, no placeholders, no stubs.

## Input
- @.taskmaster/tasks.json — task list from PM agent
- @CLAUDE.md — project structure and business rules
- @.claude/standards.md — coding standards

## Execution
Execute tasks in dependency order. After each task, mark it `done` in tasks.json.

---

## Tech Stack Requirements

### Next.js 14 — App Router
```typescript
// Always use server components by default
// Add "use client" only when needed (event handlers, hooks)
// Use generateMetadata() for SEO
// Use generateStaticParams() for static generation
// Use ISR with revalidate for product pages
```

### Sanity CMS Integration
```typescript
// src/lib/sanity/client.ts
import { createClient } from 'next-sanity'
import imageUrlBuilder from '@sanity/image-url'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
})

const builder = imageUrlBuilder(client)
export const urlFor = (source: any) => builder.image(source)
```

### TypeScript Types (implement all)
```typescript
// src/types/index.ts

export interface Product {
  _id: string
  _type: 'product'
  name: string
  slug: { current: string }
  category: Category
  shortDescription: string
  fullDescription: any[] // Portable Text
  price?: number
  currency: 'NGN'
  dimensions?: {
    length?: number
    width?: number
    thickness?: number
    unit: 'mm' | 'cm' | 'm'
  }
  materialType: string
  colorFinish: string
  stockStatus: 'in_stock' | 'out_of_stock' | 'on_request'
  images: SanityImage[]
  isFeatured: boolean
  metaTitle?: string
  metaDescription?: string
}

export interface Category {
  _id: string
  name: string
  slug: { current: string }
  description: string
  image?: SanityImage
}

export interface ShowroomInfo {
  address: string
  city: string
  state: string
  mapEmbedUrl: string
  phone: string[]
  whatsapp: string
  openingHours: {
    weekdays: string
    saturday: string
    sunday: string
  }
  gallery: SanityImage[]
}

export interface SanityImage {
  _type: 'image'
  asset: { _ref: string; _type: 'reference' }
  alt?: string
}
```

---

## Sanity Schemas (implement all exactly)

### Product Schema
```typescript
// sanity/schemaTypes/product.ts
export const productSchema = {
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    { name: 'name', title: 'Product Name', type: 'string', validation: (R: any) => R.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'name' }, validation: (R: any) => R.required() },
    { name: 'category', title: 'Category', type: 'reference', to: [{ type: 'category' }], validation: (R: any) => R.required() },
    { name: 'shortDescription', title: 'Short Description', type: 'text', rows: 3 },
    { name: 'fullDescription', title: 'Full Description', type: 'array', of: [{ type: 'block' }] },
    { name: 'price', title: 'Price (₦)', type: 'number' },
    {
      name: 'dimensions',
      title: 'Dimensions',
      type: 'object',
      fields: [
        { name: 'thickness', title: 'Thickness (mm)', type: 'number' },
        { name: 'length', title: 'Length', type: 'number' },
        { name: 'width', title: 'Width', type: 'number' },
        { name: 'unit', title: 'Unit', type: 'string', options: { list: ['mm', 'cm', 'm'] }, initialValue: 'mm' },
      ],
    },
    { name: 'materialType', title: 'Material Type', type: 'string' },
    { name: 'colorFinish', title: 'Color / Finish', type: 'string' },
    {
      name: 'stockStatus',
      title: 'Stock Status',
      type: 'string',
      options: {
        list: [
          { title: 'In Stock', value: 'in_stock' },
          { title: 'Out of Stock', value: 'out_of_stock' },
          { title: 'On Request', value: 'on_request' },
        ],
      },
      initialValue: 'in_stock',
    },
    { name: 'images', title: 'Product Images', type: 'array', of: [{ type: 'image', options: { hotspot: true }, fields: [{ name: 'alt', type: 'string', title: 'Alt Text' }] }] },
    { name: 'isFeatured', title: 'Featured Product', type: 'boolean', initialValue: false },
    { name: 'metaTitle', title: 'SEO Title', type: 'string' },
    { name: 'metaDescription', title: 'SEO Description', type: 'text', rows: 2 },
  ],
  preview: {
    select: { title: 'name', subtitle: 'category.name', media: 'images.0' },
  },
}
```

---

## GROQ Queries (implement all)

```typescript
// src/lib/sanity/queries.ts

export const FEATURED_PRODUCTS_QUERY = `
  *[_type == "product" && isFeatured == true][0...8] {
    _id, name, slug, shortDescription, price, stockStatus,
    "category": category->{ name, slug },
    "image": images[0]{ asset, alt }
  }
`

export const PRODUCTS_BY_CATEGORY_QUERY = `
  *[_type == "product" && category->slug.current == $slug] | order(_createdAt desc) {
    _id, name, slug, shortDescription, price, stockStatus,
    dimensions, materialType, colorFinish,
    "category": category->{ name, slug },
    "image": images[0]{ asset, alt }
  }
`

export const PRODUCT_DETAIL_QUERY = `
  *[_type == "product" && slug.current == $slug][0] {
    _id, name, slug, shortDescription, fullDescription,
    price, dimensions, materialType, colorFinish, stockStatus,
    metaTitle, metaDescription,
    "category": category->{ name, slug },
    images[]{ asset, alt },
    "related": *[_type == "product" && category._ref == ^.category._ref && slug.current != $slug][0...4] {
      _id, name, slug, price, "image": images[0]{ asset, alt }
    }
  }
`

export const ALL_CATEGORIES_QUERY = `
  *[_type == "category"] | order(name asc) {
    _id, name, slug, description,
    "image": image{ asset, alt },
    "productCount": count(*[_type == "product" && references(^._id)])
  }
`

export const SEARCH_PRODUCTS_QUERY = `
  *[_type == "product" && (
    name match $query ||
    shortDescription match $query ||
    materialType match $query
  )] {
    _id, name, slug, price, shortDescription,
    "category": category->{ name, slug },
    "image": images[0]{ asset, alt }
  }
`

export const SHOWROOM_QUERY = `
  *[_type == "showroom"][0] {
    address, city, state, mapEmbedUrl,
    phone, whatsapp, openingHours,
    gallery[]{ asset, alt }
  }
`
```

---

## WhatsApp Integration

```typescript
// src/lib/whatsapp.ts

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER

export function buildWhatsAppUrl(product?: { name: string; slug: string }): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`
  if (!product) {
    return `${base}?text=${encodeURIComponent('Hello, I would like to make an enquiry about your products.')}`
  }
  const text = `Hello, I am interested in ordering: *${product.name}*. Please send me pricing and availability details. Product link: ${process.env.NEXT_PUBLIC_SITE_URL}/products/${product.slug}`
  return `${base}?text=${encodeURIComponent(text)}`
}

export function buildPriceListUrl(): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello, please send me your complete price list for boards and panels.')}`
}
```

---

## Homepage Implementation

Build the homepage with these sections (in order):

1. **HeroBanner** — full-width, luxury aesthetic
   - Headline: "Premium Board Materials for Nigeria's Best Craftsmen"
   - Sub: "MDF · HDF · UV Gloss · Marine Boards · Edge Tapes · Doors"
   - CTAs: "View Products" + "Request Price List" (WhatsApp)
   - Background: rich dark with texture overlay

2. **FeaturedProducts** — 8-product grid, fetched from Sanity
3. **CategoryHighlights** — 7 category cards with icons
4. **TrustIndicators** — "Quality Assured · Fast Lagos Delivery · Trade Prices · WhatsApp Support"
5. **ShowroomTeaser** — address + "Visit Us" CTA
6. **WhatsAppFloat** — sticky bottom-right button (always visible)

---

## Aesthetic Direction

**Luxury Industrial** — premium materials brand for trade professionals.

- Colors: `#0A0A0A` (near black), `#C8922A` (gold accent), `#F5F0EB` (warm white), `#2A2A2A` (card bg)
- Typography: `Cormorant Garamond` (display headings) + `DM Sans` (body/UI)
- Cards: dark backgrounds with gold border-left accents on hover
- Buttons: gold fill primary, dark border secondary
- Mobile: single-column stack, extra-large touch targets (48px min)

---

## Price Formatting

```typescript
// Always format NGN prices as:
export function formatNGN(price?: number): string {
  if (!price) return 'Request Price'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(price)
}
// Output: "₦45,000" or "Request Price"
```

---

## SEO — generateMetadata Template

```typescript
// Apply to EVERY page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug)
  return {
    title: product.metaTitle ?? `${product.name} | Modish Standard Lagos`,
    description: product.metaDescription ?? `Buy ${product.name} in Lagos, Nigeria. Premium quality boards and panels from Modish Standard.`,
    openGraph: {
      title: product.metaTitle ?? product.name,
      description: product.metaDescription ?? product.shortDescription,
      images: [{ url: urlFor(product.images[0]).width(1200).height(630).url() }],
      type: 'website',
      locale: 'en_NG',
      siteName: 'Modish Standard',
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/products/${product.slug.current}` },
  }
}
```

---

## JSON-LD Structured Data

Implement for product pages:
```typescript
// ProductSchema + BreadcrumbList + LocalBusiness on contact page
const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.shortDescription,
  image: product.images.map(img => urlFor(img).width(800).url()),
  brand: { '@type': 'Brand', name: 'Modish Standard' },
  offers: {
    '@type': 'Offer',
    price: product.price,
    priceCurrency: 'NGN',
    availability: product.stockStatus === 'in_stock'
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    seller: { '@type': 'Organization', name: 'Modish Standard' },
  },
}
```

---

## Contact Form API Route

```typescript
// src/app/api/contact/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^(\+?234|0)[789][01]\d{8}$/, 'Invalid Nigerian phone number'),
  message: z.string().min(10).max(1000),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validated = schema.parse(body)
    // In v1: forward to WhatsApp or send notification
    // Future: integrate email service
    const whatsappUrl = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=` +
      encodeURIComponent(`New Enquiry\nName: ${validated.name}\nPhone: ${validated.phone}\nMessage: ${validated.message}`)
    return NextResponse.json({ success: true, whatsappUrl })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## Implementation Checklist

Before marking any task done, verify:
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] ESLint passes (`npx eslint src/`)
- [ ] Component renders on mobile (375px viewport)
- [ ] WhatsApp link opens correctly
- [ ] Images use `next/image` with proper `alt` text
- [ ] Page has `generateMetadata` export
- [ ] No `console.log` statements in production code
- [ ] All env vars accessed via `process.env` with non-null assertion or fallback
