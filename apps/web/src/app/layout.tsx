import type * as React from 'react';
import 'katex/dist/katex.min.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  return children;
}
