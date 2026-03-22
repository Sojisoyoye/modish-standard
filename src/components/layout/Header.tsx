"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import WardrobeIcon from "@/components/wardrobe/WardrobeIcon";
import FavouritesIcon from "@/components/favourites/FavouritesIcon";

const categories = [
  { name: "MDF Boards", slug: "mdf-boards" },
  { name: "HDF Boards", slug: "hdf-boards" },
  { name: "UV Gloss Boards", slug: "uv-gloss-boards" },
  { name: "Marine Boards", slug: "marine-boards" },
  { name: "Edge Tapes", slug: "edge-tapes" },
  { name: "Doors", slug: "doors" },
  { name: "PU Stone Panels", slug: "pu-stone-panels" },
  { name: "Block Boards", slug: "block-boards" },
  { name: "Accessories", slug: "accessories" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[96px] items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/logo.png"
              alt="Modish Standard"
              width={280}
              height={80}
              className="h-20 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7">
            <Link
              href="/products"
              className="text-sm font-medium text-gray-600 hover:text-[#1B2D72] transition-colors"
            >
              Products
            </Link>

            {/* Categories Dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-[#1B2D72] transition-colors"
                aria-expanded={categoryDropdownOpen}
                aria-haspopup="true"
              >
                Categories
                <svg
                  className={`h-4 w-4 transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {categoryDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-56 rounded-xl bg-white py-2 shadow-xl border border-gray-100">
                  {categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/categories/${cat.slug}`}
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-[#EEF2FF] hover:text-[#1B2D72] transition-colors"
                      onClick={() => setCategoryDropdownOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/showroom"
              className="text-sm font-medium text-gray-600 hover:text-[#1B2D72] transition-colors"
            >
              Showroom
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-gray-600 hover:text-[#1B2D72] transition-colors"
            >
              Contact
            </Link>

            {/* Search Icon */}
            <Link
              href="/search"
              className="p-2 text-gray-400 hover:text-[#1B2D72] transition-colors"
              aria-label="Search products"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>

            {/* Favourites Icon */}
            <FavouritesIcon />

            {/* Wardrobe Icon */}
            <WardrobeIcon />

            {/* CTA Button */}
            <Link
              href="/products"
              className="inline-flex items-center rounded-lg bg-[#2D8B3C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#236930] transition-colors shadow-sm"
            >
              Get a Quote
            </Link>
          </nav>

          {/* Mobile: Search + Wardrobe + Hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/search"
              className="p-2 text-gray-500 hover:text-[#1B2D72] transition-colors"
              aria-label="Search products"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>
            <FavouritesIcon />
            <WardrobeIcon />

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-[#1B2D72] transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <nav className="px-4 py-4 space-y-1">
            <Link
              href="/products"
              className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-[#1B2D72] hover:bg-[#EEF2FF] rounded-lg transition-colors min-h-[48px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Products
            </Link>

            <div>
              <button
                onClick={() => setMobileCategoryOpen(!mobileCategoryOpen)}
                className="w-full flex items-center justify-between px-3 py-3 text-base font-medium text-gray-700 hover:text-[#1B2D72] hover:bg-[#EEF2FF] rounded-lg transition-colors min-h-[48px]"
                aria-expanded={mobileCategoryOpen}
              >
                Categories
                <svg
                  className={`h-4 w-4 transition-transform ${mobileCategoryOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {mobileCategoryOpen && (
                <div className="pl-4 space-y-1">
                  {categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/categories/${cat.slug}`}
                      className="block px-3 py-2.5 text-sm text-gray-600 hover:text-[#1B2D72] hover:bg-[#EEF2FF] rounded-lg transition-colors min-h-[48px] flex items-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/showroom"
              className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-[#1B2D72] hover:bg-[#EEF2FF] rounded-lg transition-colors min-h-[48px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Showroom
            </Link>

            <Link
              href="/contact"
              className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-[#1B2D72] hover:bg-[#EEF2FF] rounded-lg transition-colors min-h-[48px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>

            <div className="pt-2">
              <Link
                href="/products"
                className="block w-full text-center rounded-lg bg-[#2D8B3C] px-5 py-3 text-base font-semibold text-white hover:bg-[#236930] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get a Quote
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
