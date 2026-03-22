export default function Loading() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-100 border-t-[#1B2D72]" />
        <p className="text-sm font-medium text-gray-400">Loading...</p>
      </div>
    </section>
  );
}
