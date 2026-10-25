import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Badge } from '@bodhai/ui';
import { ContactForm } from '@/components/contact-form';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function ContactPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'contact' });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 text-center">
      <Badge variant="default" size="sm" className="mb-3 font-semibold">
        Partnerships & Inquiries
      </Badge>
      <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
        {t('title')}
      </h1>
      <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
        {t('subtitle')}
      </p>

      <ContactForm />
    </div>
  );
}
