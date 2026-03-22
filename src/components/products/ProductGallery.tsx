"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { urlFor } from "@/lib/sanity/client";

interface GalleryImage {
  asset: { _ref: string };
  alt?: string;
}

interface ProductGalleryProps {
  images: GalleryImage[];
}

export default function ProductGallery({ images }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const goToPrevious = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  useEffect(() => {
    if (!lightboxOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, goToPrevious, goToNext]);

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-2xl bg-[#F8F9FA] border border-gray-100 flex items-center justify-center">
        <svg
          className="h-16 w-16 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
      </div>
    );
  }

  const activeImage = images[activeIndex];
  const mainImageUrl = urlFor(activeImage).width(800).height(800).url();

  return (
    <>
      <div className="space-y-4">
        {/* Main Image */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="relative block w-full aspect-square rounded-2xl bg-[#F8F9FA] border border-gray-100 overflow-hidden cursor-zoom-in"
          aria-label="Open image in lightbox"
        >
          <Image
            src={mainImageUrl}
            alt={activeImage.alt || "Product image"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </button>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((image, index) => {
              const thumbUrl = urlFor(image).width(120).height(120).url();
              return (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`relative shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border-2 transition-colors ${
                    index === activeIndex
                      ? "border-[#1B2D72]"
                      : "border-transparent hover:border-gray-300"
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <Image
                    src={thumbUrl}
                    alt={image.alt || `Product image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close lightbox"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous Arrow */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Previous image"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Lightbox Image */}
          <div
            className="relative h-[85vh] w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={urlFor(images[activeIndex]).width(1200).height(1200).url()}
              alt={images[activeIndex].alt || "Product image"}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>

          {/* Next Arrow */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Next image"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white">
              {activeIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
