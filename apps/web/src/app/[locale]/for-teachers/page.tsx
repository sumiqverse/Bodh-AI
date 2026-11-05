import type { Metadata } from 'next';
import { MarketingAnswer } from '@/components/marketing-answer';
import { PublicPageFaq } from '@/components/public-page-faq';
import { publicPageMetadata } from '@/lib/seo';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookOpen, LayoutDashboard, Users } from 'lucide-react';
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
  const t = await getTranslations({ locale, namespace: 'teachers' });

  return publicPageMetadata({
    locale,
    path: 'for-teachers',
    title: t('title'),
    description: t('subtitle'),
  });
}

export default async function ForTeachersPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'teachers' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  const features: MarketingFeature[] = [
    {
      title: t('card1Title'),
      description: t('card1Desc'),
      Icon: Users,
      surface: 'bg-surface-blue',
      iconSurface: 'bg-surface-white',
    },
    {
      title: t('card2Title'),
      description: t('card2Desc'),
      Icon: BookOpen,
      surface: 'bg-surface-butter',
      iconSurface: 'bg-surface-cream',
    },
    {
      title: t('card3Title'),
      description: t('card3Desc'),
      Icon: LayoutDashboard,
      surface: 'bg-surface-pink',
      iconSurface: 'bg-surface-white',
    },
  ];

  return (
    <MarketingPageShell
      badge={t('badge')}
      title={t('title')}
      subtitle={t('subtitle')}
      locale={locale}
      dots={['bg-surface-white', 'bg-surface-cream', 'bg-surface-pink']}
    >
      <div className="mb-8">
        <MarketingAnswer question={t('answerQuestion')} answer={t('answerText')} />
      </div>
      <MarketingFeatureGrid features={features} />
      <MarketingActions
        actions={[
          { href: '/contact', label: tCommon('contactUs') },
          { href: '/profile', label: tNav('myProfile') },
        ]}
      />
      <PublicPageFaq
        locale={locale}
        path="for-teachers"
        pageName={t('title')}
        pageDescription={t('subtitle')}
      />
    </MarketingPageShell>
  );
}
