import { sanityFetch } from "@/lib/sanity/client";
import {
  FEATURED_PRODUCTS_QUERY,
  ALL_CATEGORIES_QUERY,
} from "@/lib/sanity/queries";
import HeroBanner from "@/components/home/HeroBanner";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CategoryHighlights from "@/components/home/CategoryHighlights";
import TrustIndicators from "@/components/home/TrustIndicators";
import type { Product, Category } from "@/types";
import { STATIC_CATEGORIES } from "@/lib/staticCategories";

export const revalidate = 300;

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    sanityFetch<Product[]>(FEATURED_PRODUCTS_QUERY),
    sanityFetch<Category[]>(ALL_CATEGORIES_QUERY),
  ]);

  const displayCategories = [
    ...categories,
    ...STATIC_CATEGORIES.filter((c) => !categories.some((sc) => sc.slug.current === c.slug.current)),
  ];

  return (
    <>
      <HeroBanner />
      {products.length > 0 && <FeaturedProducts products={products} />}
      <CategoryHighlights categories={displayCategories} />
      <TrustIndicators />
    </>
  );
}
