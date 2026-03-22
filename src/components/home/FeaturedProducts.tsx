import Link from "next/link";
import ProductCard from "@/components/products/ProductCard";

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

interface FeaturedProductsProps {
  products: ProductCardProduct[];
}

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <section className="bg-[#F8F9FA] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10 md:mb-14 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#EEF2FF] text-[#1B2D72] px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
              Handpicked Selection
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2D72]">
              Featured Products
            </h2>
            <p className="mt-3 text-gray-500 text-base sm:text-lg max-w-2xl">
              Premium materials trusted by Nigeria&apos;s leading craftsmen and interior designers.
            </p>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-2 text-[#2D8B3C] font-semibold hover:text-[#236930] transition-colors text-sm shrink-0 group"
          >
            View All
            <svg
              className="h-4 w-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>

        {/* View All — mobile */}
        <div className="mt-10 text-center sm:hidden">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#1B2D72] px-8 py-3.5 text-sm font-semibold text-[#1B2D72] hover:bg-[#EEF2FF] transition-colors group"
          >
            View All Products
            <svg
              className="h-4 w-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
