import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import "../globals.css";

const fraunces = localFont({
  variable: "--font-fraunces",
  display: "swap",
  src: [
    { path: "../../public/fonts/fraunces-var.woff2", style: "normal", weight: "100 900" },
    { path: "../../public/fonts/fraunces-italic-var.woff2", style: "italic", weight: "100 900" },
  ],
});

const interTight = localFont({
  variable: "--font-inter-tight",
  display: "swap",
  src: "../../public/fonts/inter-tight-var.woff2",
  weight: "100 900",
});

// Edge runtime cascades to /admin/login, /admin/logout, and the (dashboard) group.
export const runtime = "edge";

export const metadata: Metadata = {
  title: "Admin · Vigneshwara Novelties",
  robots: { index: false, follow: false },
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Admin",
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

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${interTight.variable} h-full antialiased`}>
      <body className="min-h-full bg-ivory text-ink flex flex-col">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
