"use client";

import { useState } from "react";
import { trackContactSubmit } from "@/lib/analytics";
import type { ContactFormData, ShowroomInfo } from "@/types";

interface FormErrors {
  name?: string;
  phone?: string;
  message?: string;
}

interface ContactFormProps {
  showroom: ShowroomInfo;
}

export default function ContactForm({ showroom }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [serverError, setServerError] = useState("");

  const phone = showroom.phone?.[0] || "";
  const whatsappNumber = showroom.whatsapp || "";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setServerError(data.error || "Something went wrong. Please try again.");
        }
        setIsSubmitting(false);
        return;
      }

      setWhatsappUrl(data.whatsappUrl);
      setIsSuccess(true);
      trackContactSubmit();
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      {/* Form */}
      <div>
        {isSuccess ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#F0FAF2]">
              <svg className="h-8 w-8 text-[#2D8B3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-[#1B2D72]">
              Message Received!
            </h2>
            <p className="mb-6 text-gray-500">
              Thank you for reaching out. We will get back to you shortly.
              For a faster response, chat with us directly on WhatsApp.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#128C54] px-6 py-3 font-bold text-white transition hover:bg-[#0e7040]"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Continue on WhatsApp
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-8">
            <h2 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold text-[#1B2D72]">
              Send Us a Message
            </h2>

            {serverError && (
              <div className="mb-6 rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-600">
                {serverError}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 placeholder-gray-400 transition focus:border-[#1B2D72] focus:outline-none focus:ring-2 focus:ring-[#1B2D72]/10"
                  placeholder="Your full name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 placeholder-gray-400 transition focus:border-[#1B2D72] focus:outline-none focus:ring-2 focus:ring-[#1B2D72]/10"
                  placeholder="08012345678"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Nigerian format: 080XXXXXXXX or +234XXXXXXXXXX
                </p>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-semibold text-gray-700">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 placeholder-gray-400 transition focus:border-[#1B2D72] focus:outline-none focus:ring-2 focus:ring-[#1B2D72]/10"
                  placeholder="Tell us about the products you need, quantities, or any questions..."
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-red-500">{errors.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#1B2D72] px-6 py-4 text-base font-bold text-white transition hover:bg-[#101D50] disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-[#1B2D72]/20"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sidebar */}
      <aside className="flex flex-col gap-5">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-7">
          <h3 className="mb-5 font-[family-name:var(--font-display)] text-xl font-bold text-[#1B2D72]">
            Visit Our Showroom
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0 mt-0.5">
                <svg className="h-4 w-4 text-[#1B2D72]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800">{showroom.address}</p>
                <p className="text-gray-500">{showroom.city}, {showroom.state}, Nigeria</p>
              </div>
            </div>
            {phone && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-[#1B2D72]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <a href={`tel:${phone}`} className="font-semibold text-[#1B2D72] transition hover:text-[#2D8B3C]">
                  {phone}
                </a>
              </div>
            )}
            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Follow Us</p>
              <div className="flex gap-3">
                <a
                  href="https://www.facebook.com/ModishStandardLimited"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on Facebook"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1877F2] text-white transition-opacity hover:opacity-80"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/modish.standard"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on Instagram"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-opacity hover:opacity-80"
                  style={{ background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@modish.standard"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on TikTok"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#010101] text-white transition-opacity hover:opacity-80"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.16 8.16 0 005.58 2.17v-3.44a4.85 4.85 0 01-3.77-1.47V6.69h3.77z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-7">
          <h3 className="mb-5 font-[family-name:var(--font-display)] text-xl font-bold text-[#1B2D72]">
            Opening Hours
          </h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Mon – Fri</span>
              <span className="font-semibold text-gray-800">{showroom.openingHours.weekdays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Saturday</span>
              <span className="font-semibold text-gray-800">{showroom.openingHours.saturday}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sunday</span>
              <span className="font-semibold text-red-400">{showroom.openingHours.sunday}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#2D8B3C]/15 bg-[#F0FAF2] p-7 text-center">
          <p className="mb-4 text-sm text-gray-500">
            Need a quick response? Chat with us directly.
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#128C54] px-6 py-3 font-bold text-white transition hover:bg-[#0e7040] shadow-md shadow-[#128C54]/20"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp Us
          </a>
        </div>
      </aside>
    </div>
  );
}
