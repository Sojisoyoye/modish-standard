"use client";

import { useState } from "react";
import { useWardrobe } from "@/lib/wardrobe";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

interface Props {
  product: {
    id: string;
    name: string;
    slug: string;
    price?: number;
    stockStatus: string;
    category?: string;
  };
}

export default function ProductActions({ product }: Props) {
  const { addItem } = useWardrobe();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const isOutOfStock = product.stockStatus === "out_of_stock";

  const whatsappUrl = buildWhatsAppUrl({ name: product.name, slug: product.slug });

  function handleAddToWardrobe() {
    addItem(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        stockStatus: product.stockStatus,
        category: product.category,
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Quantity selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-600">Quantity</span>
        <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="px-4 py-3 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors text-xl leading-none"
          >
            −
          </button>
          <span className="px-5 py-3 text-lg font-bold text-[#1B2D72] border-x border-gray-200 min-w-[4rem] text-center">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="px-4 py-3 text-gray-500 hover:bg-gray-50 transition-colors text-xl leading-none"
          >
            +
          </button>
        </div>
      </div>

      {/* Add to Order List */}
      <button
        onClick={handleAddToWardrobe}
        disabled={isOutOfStock}
        className={`inline-flex items-center justify-center gap-3 rounded-xl px-8 py-4 text-lg font-bold shadow transition-all ${
          isOutOfStock
            ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
            : added
            ? "bg-[#F0FAF2] text-[#2D8B3C] border-2 border-[#2D8B3C]"
            : "bg-[#1B2D72] text-white hover:bg-[#101D50] shadow-[#1B2D72]/20 shadow-lg"
        }`}
      >
        {added ? (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Added to Order List!
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Add {quantity > 1 ? `${quantity} ` : ""}to Order List
          </>
        )}
      </button>

      {/* Order via WhatsApp */}
      {isOutOfStock ? (
        <span className="inline-flex items-center justify-center gap-3 rounded-xl bg-gray-100 px-8 py-4 text-lg font-bold text-gray-400 cursor-not-allowed">
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Currently Unavailable
        </span>
      ) : (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#128C54] px-8 py-4 text-lg font-bold text-white shadow-lg shadow-[#128C54]/20 transition hover:bg-[#0e7040] hover:shadow-xl"
        >
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Order via WhatsApp
        </a>
      )}

      <p className="text-sm text-gray-400">
        Add to your order list to build a full quote, or chat directly on WhatsApp.
      </p>
    </div>
  );
}
