import { MarketingFaq } from './marketing-faq';
import { JsonLd } from './json-ld';
import { getPublicPageFaqs } from '@/lib/public-page-faqs';
import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  howToJsonLd,
  webPageJsonLd,
  type HowToStep,
  type PublicPageType,
} from '@/lib/seo';

export function PublicPageFaq({
  locale,
  path,
  pageName,
  pageDescription,
  type = 'WebPage',
  howTo,
}: {
  locale: string;
  path: string;
  pageName: string;
  pageDescription: string;
  type?: PublicPageType;
  howTo?: {
    name: string;
    description: string;
    steps: readonly HowToStep[];
    totalTime?: string;
  };
}): React.JSX.Element {
  const faqs = getPublicPageFaqs(locale, path);
  const jsonLdData: Record<string, unknown>[] = [
    webPageJsonLd({ locale, path, name: pageName, description: pageDescription, type }),
    breadcrumbJsonLd({ locale, path, name: pageName }),
  ];

  if (faqs.length > 0) {
    jsonLdData.push(faqPageJsonLd(faqs));
  }

  if (howTo) {
    jsonLdData.push(
      howToJsonLd({
        locale,
        path,
        name: howTo.name,
        description: howTo.description,
        steps: howTo.steps,
        totalTime: howTo.totalTime,
      }),
    );
  }

  return (
    <>
      <JsonLd data={jsonLdData} />
      <MarketingFaq locale={locale} items={faqs} id={`faq-${path.replace(/[^a-z0-9]+/gi, '-')}`} />
    </>
  );
}
