export interface Product {
  _id: string
  _type: 'product'
  name: string
  slug: { current: string }
  category: Category
  shortDescription: string
  fullDescription: Array<{ _type: string; [key: string]: unknown }>
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
  productCount?: number
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

export interface ContactFormData {
  name: string
  phone: string
  message: string
}
