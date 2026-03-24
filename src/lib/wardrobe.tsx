"use client";

import React, {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";

export interface WardrobeItem {
  id: string;
  name: string;
  slug: string;
  price?: number;
  stockStatus: string;
  category?: string;
  quantity: number;
}

interface WardrobeContextValue {
  items: WardrobeItem[];
  totalItems: number;
  isOpen: boolean;
  openWardrobe: () => void;
  closeWardrobe: () => void;
  addItem: (item: Omit<WardrobeItem, "quantity">, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearWardrobe: () => void;
}

const STORAGE_KEY = "ms-wardrobe";
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

function setStoredItems(items: WardrobeItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

function parseItems(raw: string): WardrobeItem[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

const WardrobeContext = createContext<WardrobeContextValue | null>(null);

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const items = parseItems(raw);
  const [isOpen, setIsOpen] = useState(false);

  function addItem(item: Omit<WardrobeItem, "quantity">, quantity = 1) {
    const current = parseItems(getSnapshot());
    const existing = current.find((i) => i.id === item.id);
    if (existing) {
      setStoredItems(
        current.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        )
      );
    } else {
      setStoredItems([...current, { ...item, quantity }]);
    }
    setIsOpen(true);
  }

  function removeItem(id: string) {
    const current = parseItems(getSnapshot());
    setStoredItems(current.filter((i) => i.id !== id));
  }

  function updateQuantity(id: string, quantity: number) {
    if (quantity < 1) return;
    const current = parseItems(getSnapshot());
    setStoredItems(
      current.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  }

  function clearWardrobe() {
    setStoredItems([]);
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <WardrobeContext.Provider
      value={{
        items,
        totalItems,
        isOpen,
        openWardrobe: () => setIsOpen(true),
        closeWardrobe: () => setIsOpen(false),
        addItem,
        removeItem,
        updateQuantity,
        clearWardrobe,
      }}
    >
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe() {
  const ctx = useContext(WardrobeContext);
  if (!ctx) throw new Error("useWardrobe must be used within WardrobeProvider");
  return ctx;
}
