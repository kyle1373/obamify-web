import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Obamify",
  description:
    "Fully local Next.js recreation of the Obamify image transformation experience."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-midnight text-white">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

