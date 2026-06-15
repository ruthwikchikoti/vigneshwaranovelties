import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { PendingInquiryBanner } from "@/components/pwa/PendingInquiryBanner";
import { site } from "@/lib/site";
import { getAnnouncement } from "@/lib/admin/settings";
import "../globals.css";

// Self-hosted fonts — no Google Fonts dependency.
const fraunces = localFont({
  variable: "--font-fraunces",
  display: "swap",
  src: [
    {
      path: "../../public/fonts/fraunces-var.woff2",
      style: "normal",
      weight: "100 900",
    },
    {
      path: "../../public/fonts/fraunces-italic-var.woff2",
      style: "italic",
      weight: "100 900",
    },
  ],
});

const interTight = localFont({
  variable: "--font-inter-tight",
  display: "swap",
  src: "../../public/fonts/inter-tight-var.woff2",
  weight: "100 900",
});

const notoSerifTe = localFont({
  variable: "--font-noto-serif-te",
  display: "swap",
  src: [
    {
      path: "../../public/fonts/noto-serif-te-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/noto-serif-te-600.woff2",
      weight: "600",
      style: "normal",
    },
  ],
});

const notoSansTe = localFont({
  variable: "--font-noto-sans-te",
  display: "swap",
  src: "../../public/fonts/noto-sans-te-400.woff2",
  weight: "100 900",
});

const SEO_TITLE = `${site.name} — Jewellery & Gift Shop in Cherial, Telangana`;
const SEO_DESC =
  "Vigneshwara Novelties, Cherial — a 20+ year family jewellery & gift showroom. " +
  "1 gram gold, CZ (American diamond), panchaloha & imitation jewellery, beads, men's " +
  "kadiyam, saree pins and gift items. Visit us in Cherial or message on WhatsApp.";

export const metadata: Metadata = {
  title: {
    default: SEO_TITLE,
    template: `%s — ${site.name}`,
  },
  description: SEO_DESC,
  metadataBase: new URL(site.url),
  alternates: { canonical: "/" },
  keywords: [
    "jewellery shop Cherial",
    "gift shop Cherial",
    "best jewellery shop in Cherial",
    "1 gram gold jewellery Cherial",
    "imitation jewellery Cherial",
    "CZ jewellery Cherial",
    "panchaloha jewellery",
    "gift articles Cherial Telangana",
    "Vigneshwara Novelties",
    "jewellery near me Cherial",
  ],
  openGraph: {
    title: SEO_TITLE,
    description: SEO_DESC,
    type: "website",
    siteName: site.name,
    locale: "en_IN",
    url: site.url,
    images: [{ url: "/brand/seal.png", width: 512, height: 512, alt: site.name }],
  },
  twitter: { card: "summary_large_image" },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: site.name,
  },
  icons: {
    icon: [{ url: "/brand/seal.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/brand/seal.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#F6EFE0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Dynamic public pages run on the edge runtime (fast cold starts, global).
// Supabase JS and next-intl work fine on edge.
//
// Note: `generateStaticParams` is intentionally NOT exported here because
// Next.js disallows combining it with edge runtime. Locale routing is still
// handled correctly by the next-intl middleware.
export const runtime = "edge";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const announcement = await getAnnouncement();

  const fontVars = `${fraunces.variable} ${interTight.variable} ${notoSerifTe.variable} ${notoSansTe.variable}`;

  return (
    <html lang={locale} className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ivory text-ink" data-locale={locale}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <PendingInquiryBanner />
          <Header announcement={announcement} />
          <main className="flex-1 pb-[60px] lg:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav />
          <RegisterSW />
        </NextIntlClientProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "JewelryStore",
              "@id": `${site.url}/#store`,
              name: site.name,
              description: site.description,
              url: site.url,
              image: `${site.url}/brand/seal.png`,
              telephone: site.ownerPhone,
              email: site.ownerEmail,
              slogan: site.experience,
              priceRange: "₹₹",
              currenciesAccepted: "INR",
              address: {
                "@type": "PostalAddress",
                streetAddress: `${site.address.line2}, ${site.address.line3}`,
                addressLocality: "Cherial",
                addressRegion: "Telangana",
                postalCode: site.address.pin,
                addressCountry: "IN",
              },
              // NOTE: town-level coordinates for Cherial — refine to the exact
              // shop pin from your Google Business Profile for best local ranking.
              geo: {
                "@type": "GeoCoordinates",
                latitude: 17.926,
                longitude: 78.972,
              },
              hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${site.name}, ${site.address.line2}, ${site.address.city}`
              )}`,
              areaServed: ["Cherial", "Siddipet", "Telangana"],
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                  opens: "10:00",
                  closes: "20:00",
                },
              ],
              sameAs: Object.values(site.socials).filter(Boolean),
            }),
          }}
        />
      </body>
    </html>
  );
}
