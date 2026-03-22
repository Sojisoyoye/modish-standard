import ProductCard from "@/components/products/ProductCard";

interface ProductCardProduct {
  _id: string;
  name: string;
  slug: { current: string };
  shortDescription?: string;
  price?: number;
  stockStatus: string;
  category?: { name: string; slug: { current: string } };
  image?: { asset: { _ref: string }; alt?: string };
}

interface ProductGridProps {
  products: ProductCardProduct[];
  cols?: 3 | 4;
}

export default function ProductGrid({ products, cols = 4 }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-[#1B2D72]/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[#1B2D72]">
          No products found
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          Try adjusting your filters or search terms.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 ${cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4"}`}>
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
