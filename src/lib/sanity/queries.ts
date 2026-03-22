export const FEATURED_PRODUCTS_QUERY = `*[_type == "product" && isFeatured == true] | order(_createdAt desc) [0...8] {
  _id,
  name,
  slug,
  shortDescription,
  price,
  currency,
  stockStatus,
  "image": images[0]{ asset, alt },
  isFeatured,
  "category": category->{
    _id,
    name,
    slug
  }
}`

export const PRODUCTS_BY_CATEGORY_QUERY = `*[_type == "product" && category->slug.current == $categorySlug] | order(_createdAt desc) {
  _id,
  name,
  slug,
  shortDescription,
  price,
  currency,
  stockStatus,
  "image": images[0]{ asset, alt },
  isFeatured,
  materialType,
  colorFinish,
  dimensions,
  "category": category->{
    _id,
    name,
    slug
  }
}`

export const PRODUCT_DETAIL_QUERY = `*[_type == "product" && slug.current == $slug][0] {
  _id,
  name,
  slug,
  shortDescription,
  fullDescription,
  price,
  currency,
  stockStatus,
  images[]{ asset, alt },
  isFeatured,
  materialType,
  colorFinish,
  dimensions,
  metaTitle,
  metaDescription,
  "category": category->{
    _id,
    name,
    slug,
    description
  },
  "related": *[_type == "product" && category._ref == ^.category._ref && slug.current != $slug][0...4] {
    _id, name, slug, price, stockStatus,
    "image": images[0]{ asset, alt }
  }
}`

export const ALL_CATEGORIES_QUERY = `*[_type == "category"] | order(name asc) {
  _id,
  name,
  slug,
  description,
  image,
  "productCount": count(*[_type == "product" && references(^._id)])
}`

export const ALL_PRODUCTS_QUERY = `*[_type == "product"
  && ($categorySlug == "" || category->slug.current == $categorySlug)
  && ($materialType == "" || materialType == $materialType)
  && ($stockStatus == "" || stockStatus == $stockStatus)
] | order(
  select(
    $sortBy == "price_asc" => price asc,
    $sortBy == "price_desc" => price desc,
    $sortBy == "name_asc" => name asc,
    $sortBy == "name_desc" => name desc,
    _createdAt desc
  )
) [$start...$end] {
  _id,
  name,
  slug,
  shortDescription,
  price,
  currency,
  stockStatus,
  "image": images[0]{ asset, alt },
  isFeatured,
  materialType,
  colorFinish,
  dimensions,
  "category": category->{
    _id,
    name,
    slug
  }
}`

export const SEARCH_PRODUCTS_QUERY = `*[_type == "product" && (
  name match $searchTerm ||
  shortDescription match $searchTerm ||
  materialType match $searchTerm ||
  colorFinish match $searchTerm ||
  category->name match $searchTerm
)] | order(_createdAt desc) [0...20] {
  _id,
  name,
  slug,
  shortDescription,
  price,
  currency,
  stockStatus,
  "image": images[0]{ asset, alt },
  isFeatured,
  materialType,
  "category": category->{
    _id,
    name,
    slug
  }
}`

export const SHOWROOM_QUERY = `*[_type == "showroom"][0] {
  address,
  city,
  state,
  mapEmbedUrl,
  phone,
  whatsapp,
  openingHours,
  gallery
}`
