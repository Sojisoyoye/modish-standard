const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '2348000000000'
const BASE_URL = 'https://wa.me'

export function buildWhatsAppUrl(product?: { name: string; slug: string | { current: string } }): string {
  if (product) {
    const slugStr = typeof product.slug === 'string' ? product.slug : product.slug.current
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.modishstandard.com'
    const message = encodeURIComponent(
      `Hello, I am interested in ordering: *${product.name}*. Please send me pricing and availability details. Product link: ${siteUrl}/products/${slugStr}`
    )
    return `${BASE_URL}/${WHATSAPP_NUMBER}?text=${message}`
  }

  const message = encodeURIComponent(
    `Hi Modish Standard,\n\nI'd like to make an enquiry about your products. Please assist me. Thank you.`
  )
  return `${BASE_URL}/${WHATSAPP_NUMBER}?text=${message}`
}

export function buildPriceListUrl(): string {
  const message = encodeURIComponent(
    `Hi Modish Standard,\n\nI'd like to request your latest price list for all available products. Thank you.`
  )
  return `${BASE_URL}/${WHATSAPP_NUMBER}?text=${message}`
}
