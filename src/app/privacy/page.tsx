import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Modish Standard",
  description:
    "Privacy Policy for Modish Standard Limited — how we collect, use, and protect your personal information.",
};

const sections = [
  {
    title: "1. Who We Are",
    content: `Modish Standard Limited is a Nigerian business supplying premium board materials, edge tapes, doors, and related products. We operate from Lagos, Nigeria.

Contact: 07080227780
Address: 331, Agege Motor Road, Challenge Bus Stop, Mushin, Lagos, Nigeria
Email: hello@modishstandard.com`,
  },
  {
    title: "2. Information We Collect",
    content: `We collect information you provide directly to us, including:

• Name and contact details (phone number, email address, WhatsApp number)
• Order and purchase information
• Messages and enquiries sent via WhatsApp, our website contact form, or social media
• Photos or files you share with us for product orders or customisation requests

We do not collect payment card details directly — all payments are handled in person or via bank transfer.`,
  },
  {
    title: "3. How We Use Your Information",
    content: `We use the information we collect to:

• Process and fulfil your orders
• Respond to your enquiries and customer service requests
• Send you product updates, promotions, and offers via WhatsApp or email (only if you have contacted us or opted in)
• Improve our products and services
• Comply with applicable Nigerian law`,
  },
  {
    title: "4. WhatsApp and Social Media",
    content: `If you message us on WhatsApp, your number is stored and may be used to send you product updates or promotional messages. You can opt out at any time by replying STOP.

Our social media accounts (Instagram, Facebook, TikTok) are governed by the respective platforms' privacy policies. We use these platforms to publish product content and may interact with public comments and messages.`,
  },
  {
    title: "5. Sharing Your Information",
    content: `We do not sell your personal information. We may share it with:

• Service providers who help us operate our business (e.g. delivery partners, payment processors) — only the minimum information needed
• Government or regulatory authorities where required by Nigerian law

We do not share your data with third-party advertisers.`,
  },
  {
    title: "6. Data Retention",
    content: `We retain your personal information for as long as necessary to fulfil the purposes in this policy or as required by law. Customer order records are kept for a minimum of 6 years in line with Nigerian tax and business regulations.`,
  },
  {
    title: "7. Your Rights",
    content: `Under the Nigeria Data Protection Act (NDPA) 2023, you have the right to:

• Access the personal information we hold about you
• Request correction of inaccurate information
• Request deletion of your information (subject to legal obligations)
• Withdraw consent to marketing communications at any time

To exercise any of these rights, contact us at 07080227780 or hello@modishstandard.com.`,
  },
  {
    title: "8. Cookies",
    content: `Our website uses essential cookies to function correctly. We do not use tracking or advertising cookies. No personal data is collected through cookies.`,
  },
  {
    title: "9. Security",
    content: `We take reasonable steps to protect your personal information from unauthorised access, loss, or disclosure. However, no internet transmission is completely secure. Please contact us immediately if you believe your information has been compromised.`,
  },
  {
    title: "10. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. The latest version will always be available at www.modishstandard.com/privacy. The date at the top of this page shows when it was last updated.`,
  },
  {
    title: "11. Contact Us",
    content: `For any questions or concerns about this Privacy Policy or how we handle your data:

Modish Standard Limited
331, Agege Motor Road, Challenge Bus Stop, Mushin, Lagos, Nigeria
Phone / WhatsApp: 07080227780
Email: hello@modishstandard.com`,
  },
];

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Last updated: June 6, 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-gray-600 text-lg leading-relaxed mb-10">
          This Privacy Policy explains how Modish Standard Limited (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
          collects, uses, and protects your personal information when you interact with us through
          our website, WhatsApp, social media, or in person.
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
