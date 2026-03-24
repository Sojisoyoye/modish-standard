"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

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

const STORAGE_KEY = "ms_favourites";
const listeners = new Set<() => void>();

function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function getServerSnapshot(): string {
  return "[]";
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function setStoredFavourites(items: FavouriteItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

function parseItems(raw: string): FavouriteItem[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const items = parseItems(raw);

  function isFavourite(id: string) {
    return items.some((i) => i.id === id);
  }

  function toggleFavourite(item: FavouriteItem) {
    const next = items.some((i) => i.id === item.id)
      ? items.filter((i) => i.id !== item.id)
      : [...items, item];
    setStoredFavourites(next);
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
