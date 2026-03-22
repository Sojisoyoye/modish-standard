"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SearchBar from "@/components/ui/SearchBar";
import ProductGrid from "@/components/products/ProductGrid";
import type { Product } from "@/types";
import Link from "next/link";

const suggestedCategories = [
  { name: "MDF Boards", slug: "mdf-boards" },
  { name: "HDF Boards", slug: "hdf-boards" },
  { name: "UV Gloss Boards", slug: "uv-gloss-boards" },
  { name: "Marine Boards", slug: "marine-boards" },
  { name: "Edge Tapes", slug: "edge-tapes" },
  { name: "Doors", slug: "doors" },
  { name: "PU Stone Panels", slug: "pu-stone-panels" },
  { name: "Accessories", slug: "accessories" },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch(
        `/api/products?search=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      setResults(data.products || []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) {
      fetchResults(query);
    }
  }, [query, fetchResults]);

  const handleSearch = (searchQuery: string) => {
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <section className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-[#EEF2FF] border-b border-[#1B2D72]/10 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-7 font-[family-name:var(--font-display)] text-4xl font-bold text-[#1B2D72] md:text-5xl">
            Search Products
          </h1>
          <div className="max-w-2xl">
            <SearchBar defaultValue={query} onSearch={handleSearch} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-[#1B2D72]" />
          </div>
        )}

        {/* Results */}
        {!isLoading && hasSearched && results.length > 0 && (
          <div>
            <p className="mb-8 text-sm text-gray-400 font-medium">
              {results.length} result{results.length !== 1 ? "s" : ""} for{" "}
              <span className="text-[#1B2D72] font-semibold">&ldquo;{query}&rdquo;</span>
            </p>
            <ProductGrid products={results} />
          </div>
        )}

        {/* No results */}
        {!isLoading && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mb-6">
              <svg className="h-10 w-10 text-[#1B2D72]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-[#1B2D72]">
              No products found
            </h2>
            <p className="mb-8 max-w-md text-gray-500">
              We couldn&apos;t find any products matching &ldquo;{query}&rdquo;.
              Try a different search term or browse our categories.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {suggestedCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/categories/${cat.slug}`}
                  className="rounded-full border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 transition hover:border-[#1B2D72] hover:text-[#1B2D72] hover:bg-[#EEF2FF]"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mb-6">
              <svg className="h-10 w-10 text-[#1B2D72]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-[#1B2D72]">
              Find What You Need
            </h2>
            <p className="mb-8 max-w-md text-gray-500">
              Search our catalog of premium board materials, panels, doors, and
              finishing products.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {suggestedCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/categories/${cat.slug}`}
                  className="rounded-full border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 transition hover:border-[#1B2D72] hover:text-[#1B2D72] hover:bg-[#EEF2FF]"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
