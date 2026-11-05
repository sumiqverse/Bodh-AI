import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/seo';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContactForm } from '@/components/contact-form';
import { PublicPageFaq } from '@/components/public-page-faq';
import { MarketingPageShell } from '@/components/marketing-page';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });

  return publicPageMetadata({
    locale,
    path: 'contact',
    title: t('title'),
    description: t('subtitle'),
  });
}

export default async function ContactPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'contact' });

  return (
    <MarketingPageShell
      badge={t('badge')}
      title={t('title')}
      subtitle={t('subtitle')}
      locale={locale}
      maxWidth="max-w-4xl"
    >
      <ContactForm />
      <PublicPageFaq
        locale={locale}
        path="contact"
        pageName={t('title')}
        pageDescription={t('subtitle')}
      />
    </MarketingPageShell>
  );
}
