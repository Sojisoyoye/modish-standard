const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

export function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  const q = quality ?? 'auto'
  return `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_${q},w_${width}/${src}`
}

export function cloudinaryUrl(publicId: string, opts = 'f_auto,q_auto,w_1200') {
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${opts}/${publicId}`
}
