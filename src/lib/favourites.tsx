"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface FavouriteItem {
  id: string;
  name: string;
  slug: string;
  price?: number;
  stockStatus: string;
  category?: string;
  imageUrl?: string;
}

interface FavouritesContextValue {
  items: FavouriteItem[];
  isFavourite: (id: string) => boolean;
  toggleFavourite: (item: FavouriteItem) => void;
  totalFavourites: number;
}

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FavouriteItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ms_favourites");
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("ms_favourites", JSON.stringify(items));
  }, [items]);

  function isFavourite(id: string) {
    return items.some((i) => i.id === id);
  }

  function toggleFavourite(item: FavouriteItem) {
    setItems((prev) =>
      prev.some((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  }

  return (
    <FavouritesContext.Provider
      value={{ items, isFavourite, toggleFavourite, totalFavourites: items.length }}
    >
      {children}
    </FavouritesContext.Provider>
  );
}

export function useFavourites() {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error("useFavourites must be used inside FavouritesProvider");
  return ctx;
}
