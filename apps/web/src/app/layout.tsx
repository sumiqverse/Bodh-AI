import type * as React from 'react';
import type { Metadata } from 'next';
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/image.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/image.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  return children;
}
