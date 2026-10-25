import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { DesignShowcase } from '@/components/design-showcase';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const metadata: Metadata = {
  title: 'Design System & Component Showcase (Dev)',
  description: 'Design system tokens and components for BodhAI.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DesignPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DesignShowcase />;
}
