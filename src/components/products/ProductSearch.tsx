"use client";

import { useState, useMemo } from "react";
import ProductGrid from "@/components/products/ProductGrid";

interface Product {
  _id: string;
  name: string;
  slug: { current: string };
  shortDescription?: string;
  price?: number;
  stockStatus: string;
  category?: { name: string; slug: { current: string } };
  image?: { asset: { _ref: string }; alt?: string };
}

interface Props {
  products: Product[];
  placeholder?: string;
  cols?: 3 | 4;
}

export default function ProductSearch({ products, placeholder = "Search products…", cols }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription?.toLowerCase().includes(q) ||
        p.category?.name.toLowerCase().includes(q)
    );
  }, [query, products]);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-[#1B2D72]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="font-semibold text-gray-600">Products out of stock</p>
        <p className="mt-1 text-sm text-gray-400">Check back soon or browse other categories.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#1B2D72] focus:ring-2 focus:ring-[#1B2D72]/10"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="mb-6 text-sm font-medium text-gray-400">
        {query ? (
          <>
            <span className="text-[#1B2D72] font-semibold">{filtered.length}</span>{" "}
            result{filtered.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </>
        ) : (
          <>
            {products.length} product{products.length !== 1 ? "s" : ""}
          </>
        )}
      </p>

      {/* Grid or empty state */}
      {filtered.length > 0 ? (
        <ProductGrid products={filtered} cols={cols} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-[#1B2D72]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-500">No results for &ldquo;{query}&rdquo;</p>
          <p className="mt-1 text-sm text-gray-400">Try a different name or colour.</p>
        </div>
      )}
    </div>
  );
}
