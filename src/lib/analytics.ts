type GtagEventParams = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    gtag?: (...args: [string, string, GtagEventParams?]) => void
  }
}

export function trackEvent(eventName: string, params?: GtagEventParams): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params)
  }
}

export function trackWhatsAppClick(productName?: string): void {
  trackEvent('whatsapp_click', {
    product_name: productName || 'general_enquiry',
    contact_method: 'whatsapp',
  })
}

export function trackProductView(productName: string): void {
  trackEvent('view_item', {
    item_name: productName,
  })
}

export function trackContactSubmit(): void {
  trackEvent('generate_lead', {
    contact_method: 'contact_form',
  })
}
