"use client";

import { useFavourites, FavouriteItem } from "@/lib/favourites";

interface Props {
  product: FavouriteItem;
  className?: string;
}

export default function FavouriteButton({ product, className = "" }: Props) {
  const { isFavourite, toggleFavourite } = useFavourites();
  const saved = isFavourite(product.id);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        toggleFavourite(product);
      }}
      aria-label={saved ? "Remove from favourites" : "Add to favourites"}
      className={`flex items-center justify-center rounded-full transition-all ${
        saved
          ? "text-red-500 hover:text-red-600"
          : "text-gray-300 hover:text-red-400"
      } ${className}`}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
