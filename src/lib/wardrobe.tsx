"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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

const WardrobeContext = createContext<WardrobeContextValue | null>(null);

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ms-wardrobe");
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("ms-wardrobe", JSON.stringify(items));
  }, [items]);

  const addItem = useCallback(
    (item: Omit<WardrobeItem, "quantity">, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        if (existing) {
          return prev.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
          );
        }
        return [...prev, { ...item, quantity }];
      });
      setIsOpen(true);
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  }, []);

  const clearWardrobe = useCallback(() => setItems([]), []);

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
