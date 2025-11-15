import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const title = 'obamify';
const description = 'Revolutionary new technology that turns any image into obama';

export const metadata: Metadata = {
  metadataBase: new URL('https://obamify.com'),
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://obamify.com',
    type: 'website',
    siteName: title,
    images: [
      {
        url: '/assets/android-chrome-512x512.png',
        width: 512,
        height: 512,
        alt: 'obamify icon'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/assets/android-chrome-512x512.png']
  },
  authors: [{ name: 'Spu7Nix', url: 'https://spu7nix.net' }],
  icons: {
    icon: [
      { url: '/assets/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    shortcut: ['/assets/favicon.ico'],
    apple: ['/assets/apple-touch-icon.png']
  },
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#404040' }
  ],
  keywords: ['image processing', 'image morphing', 'optimal transport', 'meme generator'],
  category: 'technology'
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
