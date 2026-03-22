"use client";

import Link from "next/link";
import Image from "next/image";
import { useFavourites } from "@/lib/favourites";
import { formatNGN } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import FavouriteButton from "@/components/products/FavouriteButton";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export default function FavouritesPage() {
  const { items } = useFavourites();

  return (
    <section className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#EEF2FF] border-b border-[#1B2D72]/10 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-red-500 font-semibold mb-3">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            Saved Items
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#1B2D72] md:text-5xl">
            My Favourites
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            {items.length > 0
              ? `${items.length} product${items.length !== 1 ? "s" : ""} saved`
              : "Products you love will appear here."}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-20 w-20 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
              <svg className="h-10 w-10 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-gray-500">No favourites yet</p>
            <p className="mt-2 text-gray-400">Tap the heart icon on any product to save it here.</p>
            <Link
              href="/products"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#1B2D72] px-6 py-3 font-semibold text-white transition hover:bg-[#101D50]"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group rounded-xl bg-white overflow-hidden border border-gray-100 hover:border-[#1B2D72]/20 hover:shadow-lg transition-all duration-200"
              >
                {/* Image */}
                <Link href={`/products/${item.slug}`} className="block relative aspect-[4/3] bg-gray-50">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                      <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <FavouriteButton
                      product={item}
                      className="h-8 w-8 rounded-full bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white"
                    />
                  </div>
                </Link>

                {/* Content */}
                <div className="p-4">
                  {item.category && (
                    <p className="text-xs font-semibold text-[#2D8B3C] uppercase tracking-wider mb-1">
                      {item.category}
                    </p>
                  )}
                  <Link href={`/products/${item.slug}`}>
                    <h3 className="font-[family-name:var(--font-display)] text-base sm:text-lg font-semibold text-[#1B2D72] line-clamp-2 group-hover:text-[#101D50] transition-colors">
                      {item.name}
                    </h3>
                  </Link>

                  <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                    {item.price ? (
                      <p className="text-lg font-bold text-[#111827]">{formatNGN(item.price)}</p>
                    ) : (
                      <p className="text-sm font-semibold text-[#1B2D72]">Request Price</p>
                    )}
                    <Badge status={item.stockStatus} />
                  </div>

                  <a
                    href={buildWhatsAppUrl({ name: item.name, slug: item.slug })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#128C54] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e7040] transition-colors min-h-[44px]"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Order via WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
