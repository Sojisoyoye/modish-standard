import Link from "next/link";
import Image from "next/image";
import { buildPriceListUrl } from "@/lib/whatsapp";

export default function HeroBanner() {
  return (
    <section className="relative bg-white overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#EEF2FF] via-white to-white pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center py-16 md:py-20 lg:py-28">

          {/* Left: Text Content */}
          <div className="order-2 lg:order-1 flex flex-col items-start">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#F0FAF2] border border-[#2D8B3C]/20 text-[#2D8B3C] px-4 py-2 rounded-full text-sm font-semibold mb-7">
              <span className="h-2 w-2 rounded-full bg-[#2D8B3C] animate-pulse" />
              Premium Materials · Lagos, Nigeria
            </div>

            {/* Headline */}
            <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1B2D72] leading-[1.1] tracking-tight">
              Premium Building, Furnishing and Interior Design Materials for Nigeria&apos;s Best Craftsmen
            </h1>

            {/* Product tagline */}
            <p className="mt-6 text-base sm:text-lg font-semibold text-[#2D8B3C] tracking-wide">
              MDF &middot; HDF &middot; UV Gloss &middot; Marine Boards &middot; Edge Tapes &middot; Doors &middot; Accessories
            </p>

            {/* Description */}
            <p className="mt-4 text-base sm:text-lg text-gray-500 max-w-lg leading-relaxed">
              Sourced globally, delivered across Lagos and Nigeria. Trade-quality boards for furniture makers, interior designers, and contractors.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-xl bg-[#1B2D72] px-8 py-4 text-base font-semibold text-white hover:bg-[#101D50] transition-colors shadow-lg shadow-[#1B2D72]/20 min-h-[52px]"
              >
                View Products
              </Link>
              <a
                href={buildPriceListUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#2D8B3C] px-8 py-4 text-base font-semibold text-[#2D8B3C] hover:bg-[#F0FAF2] transition-colors min-h-[52px]"
              >
                {/* WhatsApp icon */}
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Request Price List
              </a>
            </div>

            {/* Stats strip */}
            <div className="mt-12 grid grid-cols-3 gap-6 pt-8 border-t border-gray-100 w-full max-w-lg">
              <div>
                <p className="text-2xl font-bold text-[#1B2D72]">500+</p>
                <p className="text-sm text-gray-500 mt-0.5">Products</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1B2D72]">10+</p>
                <p className="text-sm text-gray-500 mt-0.5">Years Experience</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1B2D72]">1,000+</p>
                <p className="text-sm text-gray-500 mt-0.5">Clients Served</p>
              </div>
            </div>
          </div>

          {/* Right: Kitchen Image */}
          <div className="order-1 lg:order-2 relative">
            {/* Decorative blob behind image */}
            <div className="absolute -top-8 -right-8 w-72 h-72 bg-[#EEF2FF] rounded-full blur-3xl opacity-70" />
            <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-[#F0FAF2] rounded-full blur-2xl opacity-80" />

            <div className="relative rounded-2xl overflow-hidden shadow-2xl h-[360px] sm:h-[460px] lg:h-[580px]">
              <Image
                src="/hero-img.png"
                alt="Modern luxury kitchen featuring premium MDF board materials"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Subtle dark vignette at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

              {/* Floating trust badge */}
              <div className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/80 max-w-[180px]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-[#2D8B3C]" />
                  <p className="text-xs font-semibold text-[#2D8B3C] uppercase tracking-wider">Quality Assured</p>
                </div>
                <p className="text-sm font-bold text-[#1B2D72]">Trusted by Top Craftsmen</p>
                <p className="text-xs text-gray-500 mt-0.5">Across Nigeria</p>
              </div>

              {/* Category count badge */}
              <div className="absolute top-5 right-5 bg-[#1B2D72] rounded-xl px-4 py-3 shadow-lg">
                <p className="text-2xl font-bold text-white leading-none">7</p>
                <p className="text-xs text-white/80 mt-0.5">Categories</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
