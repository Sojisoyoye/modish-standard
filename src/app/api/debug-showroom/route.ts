import { NextResponse } from 'next/server'
import { createClient } from 'next-sanity'

export const dynamic = 'force-dynamic'

export async function GET() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

  if (!projectId) {
    return NextResponse.json({ error: 'Sanity not configured' }, { status: 500 })
  }

  const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', useCdn: false })

  const raw = await client.fetch(`*[_type == "showroom"][0]`)
  const withQuery = await client.fetch(`*[_type == "showroom"][0] {
    locations[] { name, address, city, state, phone, mapEmbedUrl },
    whatsapp, openingHours
  }`)

  return NextResponse.json({ raw, withQuery })
}
