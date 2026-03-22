"use client";

import { useState } from "react";
import { useWardrobe } from "@/lib/wardrobe";

interface Props {
  product: {
    id: string;
    name: string;
    slug: string;
    price?: number;
    stockStatus: string;
    category?: string;
  };
  compact?: boolean;
  disabled?: boolean;
}

export default function AddToWardrobeButton({ product, compact = false, disabled = false }: Props) {
  const { addItem } = useWardrobe();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      stockStatus: product.stockStatus,
      category: product.category,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (compact) {
    return (
      <button
        onClick={handleAdd}
        disabled={disabled}
        className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors min-h-[44px] ${
          disabled
            ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
            : added
            ? "border-[#2D8B3C] bg-[#F0FAF2] text-[#2D8B3C]"
            : "border-[#1B2D72] text-[#1B2D72] hover:bg-[#EEF2FF]"
        }`}
      >
        {added ? (
          <>
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Added
          </>
        ) : (
          <>
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Add to Order List
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-lg font-bold shadow transition-all ${
        added
          ? "bg-[#F0FAF2] text-[#2D8B3C] border-2 border-[#2D8B3C]"
          : "bg-white border-2 border-[#1B2D72] text-[#1B2D72] hover:bg-[#EEF2FF]"
      }`}
    >
      {added ? (
        <>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Added to Order List
        </>
      ) : (
        <>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Add to Order List
        </>
      )}
    </button>
  );
}
