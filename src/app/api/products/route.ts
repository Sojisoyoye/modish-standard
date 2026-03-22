import { NextRequest, NextResponse } from "next/server";
import { sanityFetch } from "@/lib/sanity/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const material = searchParams.get("material");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort");

    const filters: string[] = ['_type == "product"'];

    if (category) {
      filters.push(`category->slug.current == $category`);
    }

    if (material) {
      filters.push(`materialType match $material`);
    }

    if (search) {
      filters.push(
        `(name match $search || shortDescription match $search || materialType match $search || category->name match $search)`
      );
    }

    let orderClause = "| order(_createdAt desc)";
    if (sort === "price-asc") {
      orderClause = "| order(price asc)";
    } else if (sort === "price-desc") {
      orderClause = "| order(price desc)";
    } else if (sort === "name-asc") {
      orderClause = "| order(name asc)";
    } else if (sort === "name-desc") {
      orderClause = "| order(name desc)";
    }

    const filterString = filters.join(" && ");
    const query = `*[${filterString}] ${orderClause} {
      _id,
      name,
      slug,
      shortDescription,
      price,
      stockStatus,
      materialType,
      colorFinish,
      dimensions,
      "category": category->{ _id, name, slug },
      "image": images[0]{ asset, alt }
    }`;

    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (material) params.material = `*${material}*`;
    if (search) params.search = `*${search}*`;

    const products = await sanityFetch(query, params);

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
