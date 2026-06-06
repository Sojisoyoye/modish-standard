import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Modish Standard",
  description:
    "Terms of Service for Modish Standard Limited — the terms governing your use of our website and purchase of our products.",
};

const sections = [
  {
    title: "1. About Us",
    content: `Modish Standard Limited is a Nigerian business supplying premium board materials, edge tapes, doors, UV gloss panels, and related products.

Address: 331, Agege Motor Road, Challenge Bus Stop, Mushin, Lagos, Nigeria
Phone / WhatsApp: 07080227780
Email: hello@modishstandard.com

By using our website or purchasing from us, you agree to these Terms of Service.`,
  },
  {
    title: "2. Products and Pricing",
    content: `All products are subject to availability. Prices displayed on our website or quoted via WhatsApp are in Nigerian Naira (₦) and are subject to change without notice.

We reserve the right to refuse or cancel any order if a pricing error has occurred. In such cases, we will notify you promptly and offer a full refund if payment has already been made.`,
  },
  {
    title: "3. Orders and Payment",
    content: `Orders can be placed via our website, WhatsApp, or in person at our showroom. An order is confirmed only after payment has been received or agreed payment terms have been established.

We accept payment via bank transfer and in-person cash. We do not store or process card payment details.

For custom or bulk orders, a deposit may be required before production or procurement begins.`,
  },
  {
    title: "4. Delivery",
    content: `We deliver within Lagos and can arrange delivery to other states in Nigeria. Delivery timelines and fees are communicated at the time of order.

We are not responsible for delays caused by third-party delivery services, traffic, weather, or circumstances beyond our control. Risk of damage or loss passes to you upon delivery.`,
  },
  {
    title: "5. Returns and Refunds",
    content: `We accept returns within 7 days of delivery for products that are:

• Defective or damaged on arrival
• Significantly different from what was ordered

Products must be unused, in their original condition, and accompanied by proof of purchase.

Custom-cut or custom-order products cannot be returned unless they are defective.

Refunds are processed within 5–10 business days after the returned product is inspected and accepted.`,
  },
  {
    title: "6. Warranty",
    content: `Our products carry the manufacturer's warranty where applicable. Warranty claims must be reported within the warranty period with proof of purchase. Warranty does not cover damage caused by improper installation, misuse, or normal wear and tear.`,
  },
  {
    title: "7. Website Use",
    content: `You may use our website for lawful purposes only. You must not:

• Use the site in any way that is unlawful, harmful, or fraudulent
• Attempt to gain unauthorised access to any part of the site or its systems
• Scrape, copy, or reproduce site content without written permission

We reserve the right to restrict access to the site at any time.`,
  },
  {
    title: "8. Intellectual Property",
    content: `All content on this website — including text, images, product descriptions, logos, and graphics — is owned by or licensed to Modish Standard Limited. You may not reproduce, distribute, or use any content without our prior written consent.`,
  },
  {
    title: "9. Limitation of Liability",
    content: `To the fullest extent permitted by Nigerian law, Modish Standard Limited is not liable for:

• Indirect, incidental, or consequential losses arising from the use of our products or website
• Loss of profits, data, or business opportunity
• Delays or failures caused by circumstances outside our reasonable control

Our total liability for any claim shall not exceed the amount paid by you for the relevant product or service.`,
  },
  {
    title: "10. Governing Law",
    content: `These Terms of Service are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be subject to the jurisdiction of the Nigerian courts.`,
  },
  {
    title: "11. Changes to These Terms",
    content: `We may update these Terms of Service from time to time. The latest version will always be available at www.modishstandard.com/terms. Continued use of our website or services after changes are posted constitutes acceptance of the updated terms.`,
  },
  {
    title: "12. Contact Us",
    content: `For questions about these Terms of Service:

Modish Standard Limited
331, Agege Motor Road, Challenge Bus Stop, Mushin, Lagos, Nigeria
Phone / WhatsApp: 07080227780
Email: hello@modishstandard.com`,
  },
];

export default function TermsPage() {
  return (
    <section className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#EEF2FF] border-b border-[#1B2D72]/10 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-[#2D8B3C] font-semibold mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2D8B3C]" />
            Legal
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-[#1B2D72] md:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Last updated: June 6, 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-gray-600 text-lg leading-relaxed mb-10">
          These Terms of Service govern your use of the Modish Standard website
          and your purchase of products from Modish Standard Limited. Please read
          them carefully before placing an order or using our services.
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-bold text-[#1B2D72] mb-3">
                {section.title}
              </h2>
              <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
