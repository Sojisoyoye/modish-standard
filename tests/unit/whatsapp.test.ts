import { buildWhatsAppUrl, buildPriceListUrl } from '@/lib/whatsapp'

const DEFAULT_NUMBER = '2348000000000'

describe('buildWhatsAppUrl', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    delete process.env.NEXT_PUBLIC_SITE_URL
  })

  it('returns generic enquiry URL when no product provided', () => {
    const url = buildWhatsAppUrl()
    expect(url).toContain(`https://wa.me/${DEFAULT_NUMBER}`)
    expect(url).toContain('text=')
    expect(url).toContain(encodeURIComponent('enquiry about your products'))
  })

  it('includes encoded product name in URL when product provided', () => {
    const url = buildWhatsAppUrl({ name: 'UV Gloss Board', slug: 'uv-gloss-board' })
    expect(url).toContain(encodeURIComponent('*UV Gloss Board*'))
  })

  it('includes site URL in product message', () => {
    const url = buildWhatsAppUrl({ name: 'MDF Board', slug: 'mdf-board' })
    expect(url).toContain(encodeURIComponent('https://www.modishstandard.com/products/mdf-board'))
  })

  it('uses the configured WhatsApp number', () => {
    const url = buildWhatsAppUrl()
    expect(url).toMatch(/https:\/\/wa\.me\/\d+/)
  })

  it('handles slug as a string', () => {
    const url = buildWhatsAppUrl({ name: 'Edge Tape', slug: 'edge-tape' })
    expect(url).toContain(encodeURIComponent('/products/edge-tape'))
  })

  it('handles slug as an object with current property', () => {
    const url = buildWhatsAppUrl({ name: 'Edge Tape', slug: { current: 'edge-tape' } })
    expect(url).toContain(encodeURIComponent('/products/edge-tape'))
  })
})

describe('buildPriceListUrl', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  })

  it('returns price list enquiry URL', () => {
    const url = buildPriceListUrl()
    expect(url).toContain(encodeURIComponent('latest price list'))
  })

  it('includes WhatsApp number', () => {
    const url = buildPriceListUrl()
    expect(url).toContain(`https://wa.me/${DEFAULT_NUMBER}`)
  })
})
