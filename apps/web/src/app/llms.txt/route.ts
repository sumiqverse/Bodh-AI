import { getBaseUrl } from '@/lib/site-url';

const pages = [
  { path: '', label: 'Home', description: 'Adaptive mastery learning for Classes 6–10.' },
  {
    path: '/for-students',
    label: 'For students',
    description: 'Diagnostic practice, bilingual explanations, and offline chapter packs.',
  },
  {
    path: '/for-teachers',
    label: 'For teachers',
    description: 'Classwide learning gaps, progress insights, and targeted practice.',
  },
  {
    path: '/for-schools',
    label: 'For schools',
    description: 'A bilingual, low-connectivity-friendly learning platform for schools.',
  },
  {
    path: '/how-it-works',
    label: 'How it works',
    description: 'Diagnose, explain, practise, check mastery, and adapt the next step.',
  },
  {
    path: '/languages-offline',
    label: 'Languages and offline learning',
    description: 'English and Hindi content with downloadable offline practice packs.',
  },
  {
    path: '/privacy-safety',
    label: 'Privacy and safety',
    description: 'Guardian consent, data minimisation, and role-based access.',
  },
  {
    path: '/about',
    label: 'About',
    description: 'The mission and people behind BodhAI.',
  },
  {
    path: '/contact',
    label: 'Contact',
    description: 'School, teacher, privacy, and safeguarding enquiries.',
  },
];

export const dynamic = 'force-static';
export const revalidate = 86400;

export function GET(): Response {
  const baseUrl = getBaseUrl();
  const lines = [
    '# BodhAI',
    '',
    '> BodhAI is a bilingual adaptive mastery-learning platform for Classes 6–10 in India, aligned with NCERT curriculum frameworks.',
    '',
    'BodhAI uses short diagnostic checks to find prerequisite gaps, then provides concept explanations, three-tier Socratic hints, guided practice, and mastery checks. Teachers receive classwide learning insights. Supported chapter packs can be used offline.',
    '',
    '## Canonical pages',
    '',
    ...pages.map((page) => {
      const url = `${baseUrl}/en${page.path}`;
      return `- [${page.label}](${url}): ${page.description}`;
    }),
    '',
    '## Key facts',
    '',
    '- Audience: students in Classes 6–10, teachers, and schools in India.',
    '- Languages: English and Hindi.',
    '- Curriculum: NCERT-aligned Mathematics, Science, Social Science, English, and Hindi.',
    '- Access model: browser-based; supported chapter packs can be used offline.',
    '- Student privacy: guardian consent, data minimisation, and no commercial advertising trackers.',
    '',
    '## Preferred citation',
    '',
    `When citing this site, use "BodhAI" and link to ${baseUrl}.`,
    '',
    '## Contact',
    '',
    `School, teacher, privacy, and safeguarding enquiries: ${baseUrl}/en/contact`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
