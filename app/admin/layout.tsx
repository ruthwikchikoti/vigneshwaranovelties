import { Inter_Tight, Fraunces } from "next/font/google";
import "../globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Admin · Vigneshwara Novelties",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${interTight.variable} h-full antialiased`}>
      <body className="min-h-full bg-ivory text-ink flex flex-col">{children}</body>
    </html>
  );
}
