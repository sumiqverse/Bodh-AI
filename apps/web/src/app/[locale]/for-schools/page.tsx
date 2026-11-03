import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { GraduationCap, LayoutDashboard, RefreshCw, Shield } from 'lucide-react';
import {
  MarketingActions,
  MarketingFeatureGrid,
  MarketingPageShell,
  type MarketingFeature,
} from '@/components/marketing-page';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'schools' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function ForSchoolsPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'schools' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  const features: MarketingFeature[] = [
    {
      title: t('feature1'),
      Icon: GraduationCap,
      surface: 'bg-surface-cream',
      iconSurface: 'bg-surface-yellow',
      marker: 'icon',
    },
    {
      title: t('feature2'),
      Icon: RefreshCw,
      surface: 'bg-surface-blue',
      iconSurface: 'bg-surface-white',
      marker: 'icon',
    },
    {
      title: t('feature3'),
      Icon: Shield,
      surface: 'bg-surface-peach',
      iconSurface: 'bg-surface-butter',
      marker: 'icon',
    },
    {
      title: t('feature4'),
      Icon: LayoutDashboard,
      surface: 'bg-surface-butter',
      iconSurface: 'bg-surface-cream',
      marker: 'icon',
    },
  ];

  return (
    <MarketingPageShell
      badge={t('badge')}
      title={t('title')}
      subtitle={t('subtitle')}
      locale={locale}
      dots={['bg-surface-yellow', 'bg-surface-blue', 'bg-surface-peach', 'bg-surface-pink']}
    >
      <MarketingFeatureGrid features={features} columns={2} />
      <MarketingActions actions={[{ href: '/contact', label: tCommon('contactUs') }]} />
    </MarketingPageShell>
  );
}
