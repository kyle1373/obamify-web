import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Obamify · Turn any photo into Obama",
  description: "Upload a single image and watch it morph into a pixel Obama mosaic — fully local, no servers.",
  openGraph: {
    title: "Obama Mosaic",
    description: "Drop a photo and get an Obama mosaic instantly.",
    url: "https://obama.mosaic.so",
    siteName: "Obama Mosaic",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Obamify",
    description: "Drop a photo → get Obama, all in the browser.",
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-midnight text-white">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

