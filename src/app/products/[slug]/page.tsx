import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sanityFetch, urlFor } from "@/lib/sanity/client";
import { PRODUCT_DETAIL_QUERY } from "@/lib/sanity/queries";
import { formatNGN } from "@/lib/utils";
import ProductGallery from "@/components/products/ProductGallery";
import ProductGrid from "@/components/products/ProductGrid";
import ProductActions from "@/components/products/ProductActions";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Badge from "@/components/ui/Badge";
import { PortableText } from "@portabletext/react";

export const revalidate = 300;

interface ProductDetail {
  _id: string;
  name: string;
  slug: { current: string };
  shortDescription: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fullDescription?: any[];
  price?: number;
  dimensions?: {
    length?: number;
    width?: number;
    thickness?: number;
    unit: string;
  };
  materialType?: string;
  colorFinish?: string;
  stockStatus: string;
  metaTitle?: string;
  metaDescription?: string;
  category?: { name: string; slug: { current: string } };
  images?: Array<{ asset: { _ref: string }; alt?: string }>;
  related?: Array<{
    _id: string;
    name: string;
    slug: { current: string };
    price?: number;
    stockStatus: string;
    image?: { asset: { _ref: string }; alt?: string };
  }>;
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const products = await sanityFetch<Array<{ slug: string }>>(
    `*[_type == "product"]{ "slug": slug.current }`
  );
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await sanityFetch<ProductDetail | null>(PRODUCT_DETAIL_QUERY, { slug }, null);

  if (!product) {
    return { title: "Product Not Found | Modish Standard" };
  }

  const ogImage = product.images?.[0]
    ? urlFor(product.images[0]).width(1200).height(630).url()
    : undefined;

  return {
    title:
      product.metaTitle ||
      `${product.name} | Modish Standard - Lagos, Nigeria`,
    description:
      product.metaDescription ||
      `Buy ${product.name} in Lagos, Nigeria. Premium quality boards and panels from Modish Standard.`,
    openGraph: {
      title: product.metaTitle || product.name,
      description: product.metaDescription || product.shortDescription,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
      type: "website",
      locale: "en_NG",
      siteName: "Modish Standard",
    },
    twitter: { card: "summary_large_image" },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.modishstandard.com"}/products/${product.slug.current}`,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await sanityFetch<ProductDetail | null>(PRODUCT_DETAIL_QUERY, { slug }, null);

  if (!product) {
    notFound();
  }

  const relatedProducts = product.related || [];

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    ...(product.category
      ? [
          {
            label: product.category.name,
            href: `/categories/${product.category.slug.current}`,
          },
        ]
      : []),
    { label: product.name },
  ];

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.modishstandard.com";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    image: product.images?.map((img) => urlFor(img).width(800).url()),
    brand: { "@type": "Brand", name: "Modish Standard" },
    ...(product.price && {
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: "NGN",
        availability:
          product.stockStatus === "in_stock"
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        seller: { "@type": "Organization", name: "Modish Standard" },
      },
    }),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs
      .filter((b) => b.href)
      .map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.label,
        item: `${baseUrl}${b.href}`,
      })),
  };

  const formatDimensions = () => {
    if (!product.dimensions) return null;
    const parts: string[] = [];
    if (product.dimensions.thickness)
      parts.push(`${product.dimensions.thickness}${product.dimensions.unit} thick`);
    if (product.dimensions.length)
      parts.push(`${product.dimensions.length}${product.dimensions.unit} L`);
    if (product.dimensions.width)
      parts.push(`${product.dimensions.width}${product.dimensions.unit} W`);
    return parts.join(" x ");
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className="min-h-screen bg-white">
        {/* Breadcrumb bar */}
        <div className="bg-[#F8F9FA] border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <ProductGallery images={product.images || []} />

            <div className="flex flex-col gap-6">
              <div>
                {product.category && (
                  <span className="text-sm font-semibold uppercase tracking-wider text-[#2D8B3C]">
                    {product.category.name}
                  </span>
                )}
                <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[#1B2D72] md:text-4xl">
                  {product.name}
                </h1>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-[#111827]">
                  {formatNGN(product.price)}
                </span>
                <Badge status={product.stockStatus} />
              </div>

              {product.shortDescription && (
                <p className="text-lg leading-relaxed text-gray-600">
                  {product.shortDescription}
                </p>
              )}

              {product.fullDescription && (
                <div className="prose max-w-none text-gray-600">
                  <PortableText value={product.fullDescription} />
                </div>
              )}

              {(product.dimensions || product.materialType || product.colorFinish) && (
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <h3 className="border-b border-gray-100 bg-[#F8F9FA] px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#1B2D72]">
                    Specifications
                  </h3>
                  <table className="w-full">
                    <tbody>
                      {product.dimensions && (
                        <tr className="border-b border-gray-50">
                          <td className="px-6 py-3 text-sm font-medium text-gray-400 w-1/3">
                            Dimensions
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-gray-800">
                            {formatDimensions()}
                          </td>
                        </tr>
                      )}
                      {product.materialType && (
                        <tr className="border-b border-gray-50">
                          <td className="px-6 py-3 text-sm font-medium text-gray-400 w-1/3">
                            Material
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-gray-800">
                            {product.materialType}
                          </td>
                        </tr>
                      )}
                      {product.colorFinish && (
                        <tr>
                          <td className="px-6 py-3 text-sm font-medium text-gray-400 w-1/3">
                            Color / Finish
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-gray-800">
                            {product.colorFinish}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <ProductActions
                product={{
                  id: product._id,
                  name: product.name,
                  slug: product.slug.current,
                  price: product.price,
                  stockStatus: product.stockStatus,
                  category: product.category?.name,
                }}
              />
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <div className="mt-20 pt-12 border-t border-gray-100">
              <h2 className="mb-8 font-[family-name:var(--font-display)] text-2xl font-bold text-[#1B2D72]">
                Related Products
              </h2>
              <ProductGrid products={relatedProducts} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
