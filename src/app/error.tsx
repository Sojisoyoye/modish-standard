"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-white">
      <div className="mx-auto max-w-lg px-4 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50">
          <svg
            className="h-10 w-10 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">
          Something went wrong
        </h1>
        <p className="mt-4 text-gray-500">
          We encountered an unexpected error. Please try again or contact us if
          the problem persists.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="rounded-xl bg-[#1B2D72] px-6 py-3 font-semibold text-white transition hover:bg-[#101D50]"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-xl border-2 border-[#1B2D72] px-6 py-3 font-semibold text-[#1B2D72] transition hover:bg-[#EEF2FF]"
          >
            Go Home
          </Link>
        </div>
      </div>
    </section>
  );
}
