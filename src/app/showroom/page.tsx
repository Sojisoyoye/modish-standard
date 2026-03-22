import type { Metadata } from "next";
import { sanityFetch, urlFor } from "@/lib/sanity/client";
import { SHOWROOM_QUERY } from "@/lib/sanity/queries";
import { buildPriceListUrl } from "@/lib/whatsapp";
import type { ShowroomInfo } from "@/types";
import Image from "next/image";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Showroom | Modish Standard - Visit Us in Lagos",
  description:
    "Visit the Modish Standard showroom in Ikeja, Lagos to see our premium MDF boards, HDF boards, UV gloss panels, and more. Open Monday to Saturday.",
};

const fallbackData: ShowroomInfo = {
  address: "15 Aromire Avenue, Ikeja",
  city: "Lagos",
  state: "Lagos",
  mapEmbedUrl: "",
  phone: ["08012345678"],
  whatsapp: "2348012345678",
  openingHours: {
    weekdays: "8am - 6pm",
    saturday: "9am - 4pm",
    sunday: "Closed",
  },
  gallery: [],
};

export default async function ShowroomPage() {
  const sanityData = await sanityFetch<ShowroomInfo | null>(SHOWROOM_QUERY, {}, null);
  const showroom = sanityData || fallbackData;

  const whatsappUrl = buildPriceListUrl();

  return (
    <section className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-[#EEF2FF] border-b border-[#1B2D72]/10 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-[#2D8B3C] font-semibold mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2D8B3C]" />
            Visit Us
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#1B2D72] md:text-5xl">
            Our Showroom
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-500">
            Visit us in person to see and feel our premium board materials.
            Our team is ready to help you find the perfect products for your project.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Left: Info cards */}
          <div className="flex flex-col gap-6">
            {/* Location */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8">
              <h2 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold text-[#1B2D72] flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-[#1B2D72]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                Location
              </h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div>
                    <p className="font-semibold text-gray-800">{showroom.address}</p>
                    <p className="text-gray-500">{showroom.city}, {showroom.state}, Nigeria</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div>
                    {showroom.phone.map((number, idx) => (
                      <a
                        key={idx}
                        href={`tel:${number}`}
                        className="block font-semibold text-[#1B2D72] transition hover:text-[#2D8B3C]"
                      >
                        {number}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Opening Hours */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8">
              <h2 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold text-[#1B2D72] flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-[#1B2D72]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Opening Hours
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Monday – Friday</span>
                  <span className="font-semibold text-gray-800">{showroom.openingHours.weekdays}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">Saturday</span>
                  <span className="font-semibold text-gray-800">{showroom.openingHours.saturday}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Sunday</span>
                  <span className="font-semibold text-red-400">{showroom.openingHours.sunday}</span>
                </div>
              </div>
            </div>

            {/* WhatsApp CTA */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#128C54] px-8 py-4 text-lg font-bold text-white shadow-lg shadow-[#128C54]/20 transition hover:bg-[#0e7040]"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Chat With Us on WhatsApp
            </a>
          </div>

          {/* Right: Map + Gallery */}
          <div className="flex flex-col gap-8">
            {showroom.mapEmbedUrl && (
              <div className="aspect-video overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
                <iframe
                  src={showroom.mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Modish Standard Showroom Location"
                />
              </div>
            )}

            {showroom.gallery && showroom.gallery.length > 0 && (
              <div>
                <h2 className="mb-5 font-[family-name:var(--font-display)] text-2xl font-bold text-[#1B2D72]">
                  Showroom Gallery
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {showroom.gallery.map((image, idx) => (
                    <div key={idx} className="relative aspect-square overflow-hidden rounded-xl border border-gray-100">
                      <Image
                        src={urlFor(image).width(600).height(600).url()}
                        alt={`Modish Standard showroom photo ${idx + 1}`}
                        fill
                        className="object-cover transition duration-300 hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!showroom.gallery || showroom.gallery.length === 0) && !showroom.mapEmbedUrl && (
              <div className="flex aspect-video items-center justify-center rounded-2xl bg-[#F8F9FA] border border-gray-100">
                <div className="text-center">
                  <svg className="mx-auto h-14 w-14 text-[#1B2D72]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="mt-4 text-gray-400 text-sm">
                    Visit our showroom to see our products in person
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
