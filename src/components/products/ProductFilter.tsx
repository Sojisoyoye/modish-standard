"use client";

import { useState } from "react";

interface FilterCategory {
  _id: string;
  name: string;
  slug: { current: string };
}

interface ActiveFilters {
  categories: string[];
  materialType: string[];
  thickness: string[];
  priceRange: { min?: number; max?: number };
}

interface ProductFilterProps {
  categories: FilterCategory[];
  activeFilters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
}

const materialTypes = [
  "MDF",
  "HDF",
  "UV Gloss",
  "Marine Plywood",
  "PVC",
  "ABS",
  "PU Stone",
  "Solid Wood",
];

const thicknessOptions = [
  "3mm",
  "4mm",
  "6mm",
  "8mm",
  "9mm",
  "12mm",
  "15mm",
  "18mm",
  "25mm",
];

const priceRanges = [
  { label: "Under \u20A610,000", min: 0, max: 10000 },
  { label: "\u20A610,000 - \u20A625,000", min: 10000, max: 25000 },
  { label: "\u20A625,000 - \u20A650,000", min: 25000, max: 50000 },
  { label: "\u20A650,000 - \u20A6100,000", min: 50000, max: 100000 },
  { label: "Over \u20A6100,000", min: 100000, max: undefined },
];

export default function ProductFilter({
  categories,
  activeFilters,
  onFilterChange,
}: ProductFilterProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount =
    activeFilters.categories.length +
    activeFilters.materialType.length +
    activeFilters.thickness.length +
    (activeFilters.priceRange.min !== undefined ||
    activeFilters.priceRange.max !== undefined
      ? 1
      : 0);

  function toggleCategory(slug: string) {
    const updated = activeFilters.categories.includes(slug)
      ? activeFilters.categories.filter((c) => c !== slug)
      : [...activeFilters.categories, slug];
    onFilterChange({ ...activeFilters, categories: updated });
  }

  function toggleMaterial(material: string) {
    const updated = activeFilters.materialType.includes(material)
      ? activeFilters.materialType.filter((m) => m !== material)
      : [...activeFilters.materialType, material];
    onFilterChange({ ...activeFilters, materialType: updated });
  }

  function toggleThickness(thickness: string) {
    const updated = activeFilters.thickness.includes(thickness)
      ? activeFilters.thickness.filter((t) => t !== thickness)
      : [...activeFilters.thickness, thickness];
    onFilterChange({ ...activeFilters, thickness: updated });
  }

  function setPriceRange(min?: number, max?: number) {
    const current = activeFilters.priceRange;
    const isSame = current.min === min && current.max === max;
    onFilterChange({
      ...activeFilters,
      priceRange: isSame ? { min: undefined, max: undefined } : { min, max },
    });
  }

  function resetFilters() {
    onFilterChange({
      categories: [],
      materialType: [],
      thickness: [],
      priceRange: { min: undefined, max: undefined },
    });
  }

  const filterContent = (
    <div className="space-y-6">
      {/* Header with Reset */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          Filters
        </h3>
        {activeCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-xs font-medium text-[#1B2D72] hover:text-[#101D50] transition-colors"
          >
            Reset All ({activeCount})
          </button>
        )}
      </div>

      {/* Categories */}
      <div>
        <h4 className="mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
          Categories
        </h4>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label
              key={cat._id}
              className="flex items-center gap-3 cursor-pointer group min-h-[40px]"
            >
              <input
                type="checkbox"
                checked={activeFilters.categories.includes(cat.slug.current)}
                onChange={() => toggleCategory(cat.slug.current)}
                className="h-4 w-4 rounded border-gray-300 text-[#1B2D72] focus:ring-[#1B2D72] focus:ring-offset-0"
              />
              <span className="text-sm text-gray-600 group-hover:text-[#1B2D72] transition-colors">
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Material Type */}
      <div>
        <h4 className="mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
          Material Type
        </h4>
        <div className="space-y-2">
          {materialTypes.map((material) => (
            <label
              key={material}
              className="flex items-center gap-3 cursor-pointer group min-h-[40px]"
            >
              <input
                type="checkbox"
                checked={activeFilters.materialType.includes(material)}
                onChange={() => toggleMaterial(material)}
                className="h-4 w-4 rounded border-gray-300 text-[#1B2D72] focus:ring-[#1B2D72] focus:ring-offset-0"
              />
              <span className="text-sm text-gray-600 group-hover:text-[#1B2D72] transition-colors">
                {material}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Thickness */}
      <div>
        <h4 className="mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
          Thickness
        </h4>
        <div className="flex flex-wrap gap-2">
          {thicknessOptions.map((thickness) => (
            <button
              key={thickness}
              onClick={() => toggleThickness(thickness)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[32px] ${
                activeFilters.thickness.includes(thickness)
                  ? "bg-[#1B2D72] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-[#EEF2FF] hover:text-[#1B2D72]"
              }`}
            >
              {thickness}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
          Price Range
        </h4>
        <div className="space-y-2">
          {priceRanges.map((range) => {
            const isActive =
              activeFilters.priceRange.min === range.min &&
              activeFilters.priceRange.max === range.max;
            return (
              <button
                key={range.label}
                onClick={() => setPriceRange(range.min, range.max)}
                className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors min-h-[40px] ${
                  isActive
                    ? "bg-[#EEF2FF] text-[#1B2D72] border border-[#1B2D72]/30 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-[#1B2D72]"
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[48px]"
        >
          <span className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
              />
            </svg>
            Filters
            {activeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1B2D72] text-xs font-bold text-white">
                {activeCount}
              </span>
            )}
          </span>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${mobileOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {mobileOpen && (
          <div className="mt-2 rounded-lg border border-gray-200 bg-white p-4">{filterContent}</div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block rounded-lg border border-gray-200 bg-white p-6">
        {filterContent}
      </aside>
    </>
  );
}
