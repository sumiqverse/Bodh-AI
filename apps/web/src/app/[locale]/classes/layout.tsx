import type { Metadata } from 'next';
import { getBaseUrl } from '@/lib/site-url';
import { publicPageMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/json-ld';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isHindi = locale === 'hi';
  const title = isHindi
    ? 'शिक्षक कक्षा डैशबोर्ड एवं योग्यता विश्लेषण | बोधAI'
    : 'Teacher Classroom Dashboard & Competency Analytics | BodhAI';
  const description = isHindi
    ? 'कक्षावार अधिगम विश्लेषण, एनसीईआरटी क्षमता हीटमैप, उपचारात्मक समूह और शिक्षण हस्तक्षेप योजना।'
    : 'Educator analytics dashboard for classroom competency heatmaps, conceptual gap clustering, adaptive remediation, and NEP 2020 progress monitoring.';

  return publicPageMetadata({
    locale,
    path: 'classes',
    title,
    description,
  });
}

export default async function ClassesLayout({
  children,
  params,
}: LayoutProps): Promise<React.JSX.Element> {
  const { locale } = await params;
  const baseUrl = getBaseUrl();
  const isHindi = locale === 'hi';
  const pageUrl = `${baseUrl}/${locale}/classes`;

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: isHindi
      ? 'शिक्षक कक्षा डैशबोर्ड एवं योग्यता विश्लेषण'
      : 'Teacher Classroom Dashboard & Competency Analytics',
    description: isHindi
      ? 'कक्षावार अधिगम विश्लेषण, एनसीईआरटी क्षमता हीटमैप, उपचारात्मक समूह और शिक्षण हस्तक्षेप योजना।'
      : 'Educator analytics dashboard for classroom competency heatmaps, conceptual gap clustering, adaptive remediation, and NEP 2020 progress monitoring.',
    inLanguage: isHindi ? 'hi-IN' : 'en-IN',
    isPartOf: { '@id': `${baseUrl}/#website` },
    about: { '@id': `${baseUrl}/#organization` },
  };

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: isHindi ? 'होम' : 'Home',
        item: `${baseUrl}/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: isHindi ? 'कक्षाएं' : 'Classes',
        item: pageUrl,
      },
    ],
  };

  return (
    <>
      <JsonLd data={[webPageJsonLd, breadcrumbsJsonLd]} />
      {children}
    </>
  );
}
