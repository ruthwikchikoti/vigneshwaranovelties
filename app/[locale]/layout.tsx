import type { Metadata, Viewport } from "next";
import { Fraunces, Inter_Tight, Noto_Serif_Telugu, Noto_Sans_Telugu } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { site } from "@/lib/site";
import "../globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
  preload: true,
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const notoSerifTe = Noto_Serif_Telugu({
  variable: "--font-noto-serif-te",
  subsets: ["telugu"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const notoSansTe = Noto_Sans_Telugu({
  variable: "--font-noto-sans-te",
  subsets: ["telugu"],
  display: "swap",
  weight: ["400", "500", "600"],
  preload: false,
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
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#F6F1E7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

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

  const fontVars = `${fraunces.variable} ${interTight.variable} ${notoSerifTe.variable} ${notoSansTe.variable}`;

  return (
    <html lang={locale} className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ivory text-ink" data-locale={locale}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Header />
          <main className="flex-1 pt-16 lg:pt-20 pb-[60px] lg:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav />
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
              foundingDate: String(site.established),
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
