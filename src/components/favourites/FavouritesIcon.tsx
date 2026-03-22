"use client";

import Link from "next/link";
import { useFavourites } from "@/lib/favourites";

export default function FavouritesIcon() {
  const { totalFavourites } = useFavourites();

  return (
    <Link
      href="/favourites"
      aria-label={`Favourites${totalFavourites > 0 ? ` (${totalFavourites})` : ""}`}
      className="relative flex items-center justify-center h-10 w-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-red-500 transition-colors"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
      {totalFavourites > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {totalFavourites > 99 ? "99+" : totalFavourites}
        </span>
      )}
    </Link>
  );
}
