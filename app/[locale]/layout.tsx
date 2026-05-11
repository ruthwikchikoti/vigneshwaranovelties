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

export const metadata: Metadata = {
  title: {
    default: site.name,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  metadataBase: new URL(site.url),
  openGraph: {
    title: site.name,
    description: site.description,
    type: "website",
    siteName: site.name,
  },
  twitter: { card: "summary_large_image" },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: site.name,
  },
  icons: {
    icon: "/favicon.svg",
    apple: [
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#F6EFE0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Required for Cloudflare Pages — every dynamic public page runs on the
// Workers edge runtime. Supabase JS and next-intl work fine on edge.
export const runtime = "edge";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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
              name: site.name,
              description: site.description,
              url: site.url,
              telephone: site.ownerPhone,
              email: site.ownerEmail,
              slogan: site.experience,
              address: {
                "@type": "PostalAddress",
                streetAddress: site.address.line2,
                addressLocality: site.address.city,
                addressCountry: "IN",
              },
              sameAs: Object.values(site.socials).filter(Boolean),
            }),
          }}
        />
      </body>
    </html>
  );
}
