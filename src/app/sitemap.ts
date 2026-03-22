import type { MetadataRoute } from "next";
import { sanityFetch } from "@/lib/sanity/client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.modishstandard.com";

  const [products, categories] = await Promise.all([
    sanityFetch<{ slug: string; _updatedAt: string }[]>(
      `*[_type == "product"]{ "slug": slug.current, _updatedAt }`
    ),
    sanityFetch<{ slug: string; _updatedAt: string }[]>(
      `*[_type == "category"]{ "slug": slug.current, _updatedAt }`
    ),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/showroom`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  ];

  const productPages: MetadataRoute.Sitemap = (products || []).map((p) => ({
    url: `${baseUrl}/products/${p.slug}`,
    lastModified: new Date(p._updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((c) => ({
    url: `${baseUrl}/categories/${c.slug}`,
    lastModified: new Date(c._updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...productPages, ...categoryPages];
}
