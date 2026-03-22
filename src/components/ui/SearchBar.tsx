"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search products...",
  defaultValue = "",
  className = "",
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (onSearch) {
          onSearch(newValue);
        }
      }, 300);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (onSearch) {
      onSearch(value);
    } else {
      const trimmed = value.trim();
      if (trimmed) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    }
  }

  function handleClear() {
    setValue("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (onSearch) {
      onSearch("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      {/* Search Icon */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-10 text-base text-gray-800 placeholder-gray-400 focus:border-[#1B2D72] focus:outline-none focus:ring-2 focus:ring-[#1B2D72]/10 transition-colors min-h-[48px]"
        aria-label="Search"
      />

      {/* Clear Button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </form>
  );
}
