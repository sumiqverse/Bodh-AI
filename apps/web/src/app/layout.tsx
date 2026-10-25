import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BodhAI - Adaptive Learning for Classes 6-10',
  description: 'Adaptive learning and diagnostic assessment platform for Classes 6 to 10 in India.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
