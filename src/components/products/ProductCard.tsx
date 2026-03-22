import Link from "next/link";
import Image from "next/image";
import { urlFor } from "@/lib/sanity/client";
import { formatNGN } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import Badge from "@/components/ui/Badge";
import AddToWardrobeButton from "@/components/products/AddToWardrobeButton";
import FavouriteButton from "@/components/products/FavouriteButton";

interface ProductCardProduct {
  _id: string;
  name: string;
  slug: { current: string };
  shortDescription?: string;
  price?: number;
  stockStatus: string;
  category?: { name: string; slug: { current: string } };
  image?: { asset: { _ref: string }; alt?: string };
}

interface ProductCardProps {
  product: ProductCardProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.image
    ? urlFor(product.image).width(400).height(300).url()
    : null;
  const isOutOfStock = product.stockStatus === "out_of_stock";

  return (
    <div className="group rounded-xl bg-white overflow-hidden border border-gray-100 hover:border-[#1B2D72]/20 hover:shadow-lg transition-all duration-200">
      {/* Image */}
      <Link
        href={`/products/${product.slug.current}`}
        className="block relative aspect-[4/3] bg-gray-50"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.image?.alt || product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <svg
              className="h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
              />
            </svg>
          </div>
        )}

        {/* Favourite button overlay */}
        <div className="absolute top-2 right-2">
          <FavouriteButton
            product={{
              id: product._id,
              name: product.name,
              slug: product.slug.current,
              price: product.price,
              stockStatus: product.stockStatus,
              category: product.category?.name,
              imageUrl: imageUrl ?? undefined,
            }}
            className="h-8 w-8 rounded-full bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white"
          />
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        {product.category && (
          <p className="text-xs font-semibold text-[#2D8B3C] uppercase tracking-wider mb-1">
            {product.category.name}
          </p>
        )}

        {/* Name */}
        <Link href={`/products/${product.slug.current}`}>
          <h3 className="mt-1 text-base sm:text-[17px] font-extrabold leading-snug text-[#111827] line-clamp-2 group-hover:text-[#1B2D72] transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Short Description */}
        {product.shortDescription && (
          <p className="mt-1 text-xs text-gray-400 line-clamp-2">
            {product.shortDescription}
          </p>
        )}

        {/* Price + Stock */}
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          {product.price ? (
            <p className="text-lg font-bold text-[#111827]">
              {formatNGN(product.price)}
            </p>
          ) : (
            <p className="text-sm font-semibold text-[#1B2D72]">Request Price</p>
          )}
          <Badge status={product.stockStatus} />
        </div>

        {/* WhatsApp Quick Order */}
        {isOutOfStock ? (
          <span className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-400 cursor-not-allowed min-h-[44px]">
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Out of Stock
          </span>
        ) : (
          <a
            href={buildWhatsAppUrl({ name: product.name, slug: product.slug.current })}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#128C54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e7040] transition-colors min-h-[44px]"
          >
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Order via WhatsApp
          </a>
        )}

        {/* Add to Order List */}
        <AddToWardrobeButton
          compact
          disabled={isOutOfStock}
          product={{
            id: product._id,
            name: product.name,
            slug: product.slug.current,
            price: product.price,
            stockStatus: product.stockStatus,
            category: product.category?.name,
          }}
        />
      </div>
    </div>
  );
}
