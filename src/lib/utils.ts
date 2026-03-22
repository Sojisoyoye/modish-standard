export function formatNGN(price?: number): string {
  if (price == null || price <= 0) {
    return 'Request Price'
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}
