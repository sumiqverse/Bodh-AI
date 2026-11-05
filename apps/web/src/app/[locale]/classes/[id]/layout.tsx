import type { Metadata } from 'next';
import { getBaseUrl } from '@/lib/site-url';
import { publicPageMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/json-ld';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const isHindi = locale === 'hi';
  const title = isHindi
    ? 'कक्षा क्षमता हीटमैप एवं अधिगम विश्लेषण | बोधAI शिक्षक पोर्टल'
    : 'Classroom Competency Heatmap & Mastery Analytics | BodhAI Educator Portal';
  const description = isHindi
    ? 'एनसीईआरटी पाठ्यक्रम आधारित छात्र-वार क्षमता मैट्रिक्स, ग्रुप गैप क्लस्टरिंग, अनुकूली उपचारात्मक शिक्षण और राष्ट्रीय शिक्षा नीति 2020 अनुरूप शैक्षणिक रिपोर्ट।'
    : 'Real-time NCERT-aligned student competency matrix, group gap clustering, adaptive formative interventions, and NEP 2020 pedagogical analytics for educators.';

  return publicPageMetadata({
    locale,
    path: `classes/${id}`,
    title,
    description,
  });
}

export default async function ClassDetailLayout({
  children,
  params,
}: LayoutProps): Promise<React.JSX.Element> {
  const { id, locale } = await params;
  const baseUrl = getBaseUrl();
  const isHindi = locale === 'hi';
  const pageUrl = `${baseUrl}/${locale}/classes/${id}`;

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: isHindi
      ? 'कक्षा क्षमता हीटमैप एवं अधिगम विश्लेषण'
      : 'Classroom Competency Heatmap & Mastery Analytics',
    description: isHindi
      ? 'एनसीईआरटी कक्षा 9 विज्ञान और गणित के लिए वास्तविक समय छात्र प्रवीणता मैट्रिक्स।'
      : 'Real-time student mastery matrix across NCERT Grade 9 competencies.',
    inLanguage: isHindi ? 'hi-IN' : 'en-IN',
    isPartOf: { '@id': `${baseUrl}/#website` },
    about: { '@id': `${baseUrl}/#organization` },
    author: {
      '@type': 'Organization',
      name: 'BodhAI Foundation',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'BodhAI Foundation',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/icons/image.webp`,
      },
    },
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
        item: `${baseUrl}/${locale}/classes`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: isHindi ? 'कक्षा विवरण' : 'Classroom Details',
        item: pageUrl,
      },
    ],
  };

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${pageUrl}#course`,
    name: isHindi
      ? 'एनसीईआरटी कक्षा 9 विज्ञान योग्यता ढांचा'
      : 'NCERT Class 9 Science Competency Framework',
    description: isHindi
      ? 'एनसीईआरटी एवं सीबीएसई दिशा-निर्देशों के अनुरूप कक्षा 9 विज्ञान के 12 अध्यायों और 24 मूल योग्यताओं का अनुकूली अधिगम ढांचा।'
      : 'Adaptive mastery curriculum covering 12 rationalized NCERT chapters and 24 competencies for Secondary Class 9 Science.',
    provider: {
      '@type': 'Organization',
      name: 'BodhAI Foundation',
      sameAs: 'https://bodhai.org.in',
    },
    educationalCredentialAwarded: 'NCERT Grade 9 Competency Verified',
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: ['Blended', 'Offline-First', 'Interactive'],
      inLanguage: ['en-IN', 'hi-IN'],
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: isHindi
          ? 'बोधAI कक्षा क्षमता हीटमैप क्या है और यह प्रवीणता कैसे मापता है?'
          : 'What is the BodhAI Classroom Competency Heatmap and how does it measure mastery?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: isHindi
            ? 'संक्षेप में, सीधा उत्तर यह है कि बोधAI कक्षा क्षमता हीटमैप एक वास्तविक समय अधिगम विश्लेषण मैट्रिक्स है जो एनसीईआरटी पाठ्यक्रम के अनुरूप प्रत्येक छात्र की अवधारणात्मक प्रवीणता को ट्रैक करता है। जब कोई छात्र लगातार 3 स्वतंत्र प्रयासों में 95% या उससे अधिक सटीकता प्राप्त करता है, तब उसे मास्टर्ड (ग्रीन) के रूप में सत्यापित किया जाता है।'
            : 'In short, the direct answer is that the BodhAI Classroom Competency Heatmap is a real-time mastery analytics matrix evaluating student progress across official NCERT curriculum standards. It verifies mastery when a learner achieves 95% or higher accuracy across 3 independent attempts without hints.',
        },
      },
      {
        '@type': 'Question',
        name: isHindi
          ? 'एनईपी 2020 और डीपीडीपी अधिनियम 2023 का पालन कैसे किया जाता है?'
          : 'How does BodhAI ensure NEP 2020 and DPDP Act 2023 compliance?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: isHindi
            ? 'बोधAI राष्ट्रीय शिक्षा नीति 2020 के योग्यता-आधारित शिक्षा (CBE) सिद्धांतों का पालन करता है और भारतीय डिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) अधिनियम 2023 के तहत केवल अभिभावक सहमति के साथ सुरक्षित डेटा विश्लेषण प्रदान करता है।'
            : 'BodhAI strictly adheres to the National Education Policy (NEP 2020) competency-based education framework and protects minor student learning data under India’s Digital Personal Data Protection (DPDP) Act 2023 with verified guardian consent.',
        },
      },
    ],
  };

  return (
    <>
      <JsonLd data={[webPageJsonLd, breadcrumbsJsonLd, courseJsonLd, faqJsonLd]} />
      {children}
    </>
  );
}
