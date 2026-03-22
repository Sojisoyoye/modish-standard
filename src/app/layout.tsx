import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Script from "next/script";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppFloat from "@/components/layout/WhatsAppFloat";
import { WardrobeProvider } from "@/lib/wardrobe";
import WardrobeDrawer from "@/components/wardrobe/WardrobeDrawer";
import { FavouritesProvider } from "@/lib/favourites";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const dmSans = DM_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Modish Standard | Premium Board Materials Lagos, Nigeria",
  description:
    "Premium MDF boards, HDF boards, UV gloss panels, marine boards, edge tapes, doors, and PU stone panels. Quality building materials supplier in Lagos, Nigeria.",
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "Modish Standard",
    title: "Modish Standard | Premium Board Materials Lagos, Nigeria",
    description:
      "Premium MDF boards, HDF boards, UV gloss panels, marine boards, edge tapes, doors, and PU stone panels. Quality building materials supplier in Lagos, Nigeria.",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.modishstandard.com"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable} bg-white`}>
      <body className="font-[family-name:var(--font-body)] antialiased min-h-screen flex flex-col bg-white">
        <FavouritesProvider>
        <WardrobeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppFloat />
          <WardrobeDrawer />
        </WardrobeProvider>
        </FavouritesProvider>

        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
