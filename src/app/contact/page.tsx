import type { Metadata } from "next";
import { sanityFetch } from "@/lib/sanity/client";
import { SHOWROOM_QUERY } from "@/lib/sanity/queries";
import type { ShowroomInfo } from "@/types";
import ContactForm from "./ContactForm";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contact Us | Modish Standard - Premium Board Materials Lagos",
  description:
    "Get in touch with Modish Standard. Visit our showroom or contact us for quotes on MDF boards, HDF boards, UV gloss panels and more in Lagos, Nigeria.",
};

const fallbackShowroom: ShowroomInfo = {
  address: "331, Agege motor road, Challenge bus stop",
  city: "Mushin",
  state: "Lagos",
  mapEmbedUrl: "",
  phone: ["07080227780"],
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2347080227780",
  openingHours: { weekdays: "8am - 6pm", saturday: "9am - 4pm", sunday: "Closed" },
  gallery: [],
};

export default async function ContactPage() {
  const sanityData = await sanityFetch<ShowroomInfo | null>(SHOWROOM_QUERY, {}, null);
  const showroom = sanityData || fallbackShowroom;

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Modish Standard",
    description:
      "Premium MDF boards, HDF boards, UV gloss panels, marine boards, edge tapes, doors, and PU stone panels supplier in Lagos, Nigeria.",
    address: {
      "@type": "PostalAddress",
      streetAddress: showroom.address,
      addressLocality: showroom.city,
      addressRegion: showroom.state,
      addressCountry: "NG",
    },
    telephone: showroom.phone?.[0] || "",
    sameAs: [
      "https://www.facebook.com/ModishStandardLimited",
      "https://www.instagram.com/modish.standard",
      "https://www.tiktok.com/@modish.standard",
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "16:00",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />

      <section className="min-h-screen bg-white">
        {/* Page Header */}
        <div className="bg-[#EEF2FF] border-b border-[#1B2D72]/10 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-sm text-[#2D8B3C] font-semibold mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2D8B3C]" />
              Get in Touch
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#1B2D72] md:text-5xl">
              Contact Us
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-gray-500">
              Have a question about our products or need a quote? Get in touch
              and our team will respond promptly.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <ContactForm showroom={showroom} />
        </div>
      </section>
    </>
  );
}
