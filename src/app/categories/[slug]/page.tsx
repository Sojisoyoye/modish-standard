import type { Metadata } from "next";
import { sanityFetch } from "@/lib/sanity/client";
import {
  PRODUCTS_BY_CATEGORY_QUERY,
  ALL_CATEGORIES_QUERY,
} from "@/lib/sanity/queries";
import ProductSearch from "@/components/products/ProductSearch";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import type { Product, Category } from "@/types";
import Link from "next/link";
import { STATIC_CATEGORIES } from "@/lib/staticCategories";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const categories = await sanityFetch<Array<{ slug: string }>>(
    `*[_type == "category"]{ "slug": slug.current }`
  );
  return categories.map((cat) => ({ slug: cat.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await sanityFetch<Category | null>(
    `*[_type == "category" && slug.current == $slug][0]{ name, description }`,
    { slug },
    null,
  );

  if (!category) {
    return { title: "Category Not Found | Modish Standard" };
  }

  return {
    title: `${category.name} | Modish Standard - Premium Board Materials Lagos`,
    description:
      category.description ||
      `Browse our selection of premium ${category.name} available in Lagos, Nigeria. Quality board materials from Modish Standard.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  const [category, products, fetchedCategories] = await Promise.all([
    sanityFetch<Category | null>(
      `*[_type == "category" && slug.current == $slug][0]`,
      { slug },
      null,
    ),
    sanityFetch<Product[]>(PRODUCTS_BY_CATEGORY_QUERY, {
      categorySlug: slug,
    }),
    sanityFetch<Category[]>(ALL_CATEGORIES_QUERY),
  ]);

  const allCategories = [
    ...fetchedCategories,
    ...STATIC_CATEGORIES.filter((c) => !fetchedCategories.some((sc) => sc.slug.current === c.slug.current)),
  ];

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    { label: category?.name || "Category" },
  ];

  return (
    <section className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-[#EEF2FF] border-b border-[#1B2D72]/10 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbs} />
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold text-[#1B2D72] md:text-5xl">
            {category?.name || "Category"}
          </h1>
          {category?.description && (
            <p className="mt-4 max-w-2xl text-lg text-gray-500">
              {category.description}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
              Categories
            </h3>
            <nav className="flex flex-col gap-1">
              {allCategories.map((cat) => (
                <Link
                  key={cat._id}
                  href={`/categories/${cat.slug.current}`}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    cat.slug.current === slug
                      ? "bg-[#EEF2FF] text-[#1B2D72] font-semibold border-l-4 border-[#1B2D72]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-[#1B2D72]"
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          </aside>

          <div>
            {/* Mobile category pills */}
            <div className="mb-6 flex flex-wrap gap-2 lg:hidden">
              {allCategories.map((cat) => (
                <Link
                  key={cat._id}
                  href={`/categories/${cat.slug.current}`}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    cat.slug.current === slug
                      ? "bg-[#1B2D72] text-white"
                      : "border border-gray-200 text-gray-600 hover:border-[#1B2D72] hover:text-[#1B2D72]"
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            <ProductSearch
              products={products}
              placeholder={`Search in ${category?.name || "this category"}…`}
              cols={3}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
