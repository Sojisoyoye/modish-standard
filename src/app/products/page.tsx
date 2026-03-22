import type { Metadata } from "next";
import { sanityFetch } from "@/lib/sanity/client";
import { ALL_CATEGORIES_QUERY } from "@/lib/sanity/queries";
import ProductSearch from "@/components/products/ProductSearch";
import type { Category } from "@/types";
import Link from "next/link";
import { STATIC_CATEGORIES } from "@/lib/staticCategories";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Products | Modish Standard - Premium Board Materials Lagos",
  description:
    "Browse our full catalog of premium MDF boards, HDF boards, UV gloss panels, marine boards, edge tapes, doors, and PU stone panels available in Lagos, Nigeria.",
};

interface ProductListItem {
  _id: string;
  name: string;
  slug: { current: string };
  shortDescription?: string;
  price?: number;
  stockStatus: string;
  category?: { name: string; slug: { current: string } };
  image?: { asset: { _ref: string }; alt?: string };
}

const SIMPLE_ALL_PRODUCTS = `*[_type == "product"] | order(_createdAt desc) {
  _id, name, slug, shortDescription, price, stockStatus,
  "category": category->{ name, slug },
  "image": images[0]{ asset, alt }
}`;

async function getProductsData() {
  const [products, categories] = await Promise.all([
    sanityFetch<ProductListItem[]>(SIMPLE_ALL_PRODUCTS),
    sanityFetch<Category[]>(ALL_CATEGORIES_QUERY),
  ]);
  return { products, categories };
}

export default async function ProductsPage() {
  const { products, categories } = await getProductsData();
  const hasAccessories = categories.some((c) => c.slug.current === "accessories");
  const displayCategories = hasAccessories
    ? categories
    : [...categories, ...STATIC_CATEGORIES.filter((c) => !categories.some((sc) => sc.slug.current === c.slug.current))];

  return (
    <section className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-[#EEF2FF] border-b border-[#1B2D72]/10 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-[#2D8B3C] font-semibold mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2D8B3C]" />
            Our Catalog
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#1B2D72] md:text-5xl">
            Our Products
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-500">
            Explore our premium range of board materials, panels, and finishing
            products sourced for quality and durability.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Category filter pills */}
        <div className="mb-10 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="rounded-full bg-[#1B2D72] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#101D50] shadow-sm"
            >
              All Products
            </Link>
            {displayCategories.map((category) => (
              <Link
                key={category._id}
                href={`/categories/${category.slug.current}`}
                className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-600 transition hover:border-[#1B2D72] hover:text-[#1B2D72] hover:bg-[#EEF2FF]"
              >
                {category.name}
              </Link>
            ))}
          </div>

        <ProductSearch
          products={products}
          placeholder="Search by name, colour, or material…"
        />
      </div>
    </section>
  );
}
