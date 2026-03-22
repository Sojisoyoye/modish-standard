import Link from "next/link";
import { Category } from "@/types";

interface CategoryHighlightsProps {
  categories: Category[];
}

export default function CategoryHighlights({ categories }: CategoryHighlightsProps) {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 bg-[#F0FAF2] text-[#2D8B3C] px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
            Browse by Type
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2D72]">
            Our Product Range
          </h2>
          <p className="mt-3 text-gray-500 text-base sm:text-lg max-w-2xl">
            Explore our comprehensive range of premium board materials and architectural finishes.
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category) => (
            <Link
              key={category._id}
              href={`/categories/${category.slug.current}`}
              className="group block rounded-2xl bg-[#F8F9FA] border border-gray-100 p-6 hover:border-[#1B2D72]/20 hover:bg-[#EEF2FF] hover:shadow-md transition-all duration-200"
            >
              {/* Icon placeholder */}
              <div className="h-10 w-10 rounded-lg bg-[#1B2D72]/10 flex items-center justify-center mb-4 group-hover:bg-[#1B2D72]/20 transition-colors">
                <svg className="h-5 w-5 text-[#1B2D72]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-[#1B2D72] group-hover:text-[#101D50] transition-colors">
                {category.name}
              </h3>

              {category.description && (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2 leading-relaxed">
                  {category.description}
                </p>
              )}

              {typeof category.productCount === "number" && (
                <p className="mt-3 text-xs font-semibold text-[#2D8B3C] uppercase tracking-wider">
                  {category.productCount}{" "}
                  {category.productCount === 1 ? "Product" : "Products"}
                </p>
              )}

              <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-[#1B2D72] opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Browse</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
