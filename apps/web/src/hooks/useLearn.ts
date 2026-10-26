'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWebApiClient } from '@/lib/api-client';

export type ExplanationDepth = 'standard' | 'deep';

export interface WorkedExample {
  title: string;
  problem: string;
  steps: Array<{
    stepNumber: number;
    explanation: string;
    math: string;
  }>;
  solution: string;
  keyTakeaway: string;
}

export interface LearnLesson {
  skillId: string;
  skillCode: string;
  skillName: string;
  topicName: string;
  overview: string;
  deepDive: string[];
  keyFormulas: string[];
  workedExample: WorkedExample;
}

export interface UseLearnOptions {
  skillId: string;
  initialDepth?: ExplanationDepth;
  initialLanguage?: 'en' | 'hi';
}

export interface UseLearnReturn {
  lesson: LearnLesson | null;
  depth: ExplanationDepth;
  language: 'en' | 'hi';
  setDepth: (depth: ExplanationDepth) => void;
  setLanguage: (lang: 'en' | 'hi') => void;
  isLoading: boolean;
  error: Error | null;
}

// Fallback curated NCERT lessons in both languages for rich learning experiences
export const FALLBACK_LESSON: LearnLesson = {
  skillId: 'default',
  skillCode: 'NCERT-MATH-C8-SK01',
  skillName: 'Linear Equations in One Variable',
  topicName: 'Algebraic Expressions & Equations',
  overview:
    'A linear equation in one variable is an equality involving only one variable with maximum power 1. For example, in $2x + 5 = 15$, $x$ is the unknown variable, and the equation balances two algebraic sides.',
  deepDive: [
    'Inverse Operations: Whatever operation is applied to one side must be performed symmetrically to the opposite side to preserve mathematical balance.',
    'Transposition Method: Moving a term across the equals sign changes its sign (+ becomes -, × becomes ÷).',
    'Verification: Always substitute the calculated solution back into the original equation to ensure LHS = RHS.',
  ],
  keyFormulas: [
    'General Standard Form: $ax + b = 0 \\quad (a \\neq 0)$',
    'Direct Solution: $x = -\\frac{b}{a}$',
    'Balanced Property: If $A = B$, then $A + c = B + c$ and $A \\cdot c = B \\cdot c$',
  ],
  workedExample: {
    title: 'Solving a Balanced Linear Equation',
    problem: 'Solve the equation: $3x - 7 = 14$',
    steps: [
      {
        stepNumber: 1,
        explanation: 'Isolate the variable term by adding 7 to both sides of the equation.',
        math: '3x - 7 + 7 = 14 + 7 \\implies 3x = 21',
      },
      {
        stepNumber: 2,
        explanation: 'Divide both sides by 3 to isolate $x$.',
        math: '\\frac{3x}{3} = \\frac{21}{3} \\implies x = 7',
      },
      {
        stepNumber: 3,
        explanation: 'Check the result by plugging $x = 7$ back into the original equation.',
        math: '3(7) - 7 = 21 - 7 = 14 \\quad (\\text{LHS} = \\text{RHS} \\,\\checkmark)',
      },
    ],
    solution: 'The unique root of the equation is $x = 7$.',
    keyTakeaway: 'Always keep equations balanced by performing inverse operations symmetrically.',
  },
};

const LESSON_DATABASE: Record<'en' | 'hi', Record<string, LearnLesson>> = {
  en: {
    default: FALLBACK_LESSON,
  },
  hi: {
    default: {
      skillId: 'default',
      skillCode: 'NCERT-MATH-C8-SK01',
      skillName: 'एक चर वाले रैखिक समीकरण',
      topicName: 'बीजीय व्यंजक एवं समीकरण',
      overview:
        'एक चर वाला रैखिक समीकरण ऐसा समीकरण होता है जिसमें केवल एक चर होता है और चर की अधिकतम घात 1 होती है। उदाहरण के लिए, $2x + 5 = 15$ में $x$ अज्ञात चर है, और यह समीकरण दोनों पक्षों के बीच संतुलन दर्शाता है।',
      deepDive: [
        'विपरीत संक्रियाएं: समीकरण के एक पक्ष पर जो भी संक्रिया की जाए, वही दूसरे पक्ष पर भी की जानी चाहिए ताकि संतुलन बना रहे।',
        'पक्षांतरण विधि: किसी पद को बराबर के दूसरी ओर ले जाने पर उसका चिन्ह बदल जाता है (+ का -, × का ÷)।',
        'सत्यापन: प्राप्त मान को मूल समीकरण में रखकर हमेशा जांचें कि बायाँ पक्ष = दायाँ पक्ष है या नहीं।',
      ],
      keyFormulas: [
        'मानक रूप: $ax + b = 0 \\quad (a \\neq 0)$',
        'सीधा हल: $x = -\\frac{b}{a}$',
        'समीकरण नियम: यदि $A = B$, तो $A + c = B + c$ एवं $A \\cdot c = B \\cdot c$',
      ],
      workedExample: {
        title: 'रैखिक समीकरण का चरणबद्ध हल',
        problem: 'समीकरण हल कीजिए: $3x - 7 = 14$',
        steps: [
          {
            stepNumber: 1,
            explanation: 'चर वाले पद को अलग करने के लिए दोनों पक्षों में 7 जोड़ें।',
            math: '3x - 7 + 7 = 14 + 7 \\implies 3x = 21',
          },
          {
            stepNumber: 2,
            explanation: '$x$ का मान ज्ञात करने के लिए दोनों पक्षों को 3 से विभाजित करें।',
            math: '\\frac{3x}{3} = \\frac{21}{3} \\implies x = 7',
          },
          {
            stepNumber: 3,
            explanation: 'मूल समीकरण में $x = 7$ रखकर परिणाम की पुष्टि करें।',
            math: '3(7) - 7 = 21 - 7 = 14 \\quad (\\text{बायाँ पक्ष} = \\text{दायाँ पक्ष} \\,\\checkmark)',
          },
        ],
        solution: 'समीकरण का हल $x = 7$ है।',
        keyTakeaway: 'समीकरण हल करते समय दोनों पक्षों पर समान संक्रियाएं करके संतुलन बनाए रखें।',
      },
    },
  },
};

export function useLearn(options: UseLearnOptions): UseLearnReturn {
  const [depth, setDepth] = React.useState<ExplanationDepth>(options.initialDepth ?? 'standard');
  const [language, setLanguage] = React.useState<'en' | 'hi'>(options.initialLanguage ?? 'en');

  const apiClient = getWebApiClient();

  const skillQuery = useQuery({
    queryKey: ['skill-detail', options.skillId],
    queryFn: async () => {
      if (!options.skillId || options.skillId === 'default') return null;
      try {
        return await apiClient.getSkill(options.skillId);
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const lesson = React.useMemo<LearnLesson>(() => {
    const base: LearnLesson = LESSON_DATABASE[language]?.default ?? FALLBACK_LESSON;
    if (skillQuery.data) {
      return {
        ...base,
        skillId: skillQuery.data.id,
        skillCode: skillQuery.data.code,
        skillName: skillQuery.data.name,
      };
    }
    return base;
  }, [language, skillQuery.data]);

  return {
    lesson,
    depth,
    language,
    setDepth,
    setLanguage,
    isLoading: skillQuery.isLoading,
    error: (skillQuery.error as Error) || null,
  };
}
