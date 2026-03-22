import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-white">
      <div className="mx-auto max-w-lg px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-[#EEF2FF] border border-[#1B2D72]/20 text-[#1B2D72] px-4 py-2 rounded-full text-sm font-semibold mb-6">
          Error 404
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-8xl font-bold text-[#1B2D72]">
          404
        </h1>
        <h2 className="mt-4 text-2xl font-bold text-gray-800">
          Page Not Found
        </h2>
        <p className="mt-4 text-gray-500">
          The page you are looking for does not exist or has been moved. Let us
          help you find what you need.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-xl bg-[#1B2D72] px-6 py-3 font-semibold text-white transition hover:bg-[#101D50]"
          >
            Go Home
          </Link>
          <Link
            href="/products"
            className="rounded-xl border-2 border-[#1B2D72] px-6 py-3 font-semibold text-[#1B2D72] transition hover:bg-[#EEF2FF]"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </section>
  );
}
