"use client";

import { useWardrobe } from "@/lib/wardrobe";

export default function WardrobeIcon() {
  const { totalItems, openWardrobe } = useWardrobe();

  return (
    <button
      onClick={openWardrobe}
      aria-label={`Open wardrobe${totalItems > 0 ? ` (${totalItems} items)` : ""}`}
      className="relative flex items-center justify-center h-10 w-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-[#1B2D72] transition-colors"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2D8B3C] text-[10px] font-bold text-white">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}
    </button>
  );
}
