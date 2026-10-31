'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWebApiClient, getAuthToken } from '@/lib/api-client';
import type { QuestionResponse, SkillResponse } from '@bodhai/api-client';

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

export function useLearn(options: UseLearnOptions): UseLearnReturn {
  const [depth, setDepth] = React.useState<ExplanationDepth>(options.initialDepth ?? 'standard');
  const [language, setLanguage] = React.useState<'en' | 'hi'>(options.initialLanguage ?? 'en');

  const apiClient = getWebApiClient();

  // 1. Fetch skill metadata (authentic name, code, description, blooms_level)
  const skillQuery = useQuery<SkillResponse | null>({
    queryKey: ['skill-detail', options.skillId],
    queryFn: async () => {
      if (!options.skillId || options.skillId === 'default') return null;
      try {
        const token = getAuthToken() ?? undefined;
        return await apiClient.getSkill(options.skillId, token);
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch authentic calibrated questions for this skill to power the worked example and deep-dive
  const questionsQuery = useQuery<QuestionResponse[]>({
    queryKey: ['skill-learn-questions', options.skillId, language],
    queryFn: async () => {
      if (!options.skillId || options.skillId === 'default') return [];
      try {
        return await apiClient.listQuestions({
          skillId: options.skillId,
          language,
          limit: 2,
        });
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const lesson = React.useMemo<LearnLesson | null>(() => {
    const skill = skillQuery.data;
    if (!skill) {
      return null;
    }

    const isHindi = language === 'hi';
    const firstQ = questionsQuery.data?.[0];
    const hints = Array.isArray(firstQ?.hints) ? firstQ.hints : [];
    const explanation = firstQ?.explanation || '';

    // Dynamic Overview
    const overview = isHindi
      ? `यह पाठ **${skill.name}** की आवश्यक अवधारणाओं और समझ पर केंद्रित है। ${
          skill.description ||
          'एनसीईआरटी पाठ्यक्रम मानकों के अनुसार इस दक्षता के प्रमुख सिद्धांतों एवं व्यावहारिक अनुप्रयोगों को समझें।'
        }`
      : `This lesson focuses on **${skill.name}**. ${
          skill.description ||
          'Explore core pedagogical concepts, problem-solving methods, and contextual applications aligned with NCERT standards.'
        }`;

    // Dynamic Progressive Deep-Dive Steps
    const deepDive = isHindi
      ? [
          `मूलभूत संकल्पना: ${
            hints[0] || 'विषय की बुनियादी परिभाषाओं, संदर्भ और आवश्यक नियमों को ध्यानपूर्वक समझें।'
          }`,
          `विश्लेषण एवं विधि: ${
            hints[1] ||
            'समस्या समाधान के लिए चरणबद्ध तार्किक उपागम और उपयुक्त प्रक्रिया का पालन करें।'
          }`,
          `सत्यापन एवं सारांश: ${
            explanation ||
            hints[2] ||
            'परिणाम की शुद्धता जांचें और सीखे गए मुख्य बिंदुओं को सुदृढ़ करें।'
          }`,
        ]
      : [
          `Foundational Principles: ${
            hints[0] ||
            'Understand the fundamental concepts, terminology, and contextual frameworks.'
          }`,
          `Analytical Approach: ${
            hints[1] ||
            'Apply structured reasoning, standard procedures, and systematic problem-solving methods.'
          }`,
          `Evaluation & Verification: ${
            explanation ||
            hints[2] ||
            'Verify accuracy against core rules and summarize the key takeaways.'
          }`,
        ];

    // Core Competency Highlights
    const keyFormulas = isHindi
      ? [
          `दक्षता कोड: ${skill.code}`,
          `ज्ञानात्मक स्तर (Bloom's Taxonomy): ${
            skill.blooms_level ? skill.blooms_level.toUpperCase() : 'UNDERSTAND & APPLY'
          }`,
          `कठिनाई स्तर: ${Math.round((skill.difficulty ?? 0.5) * 100)}% (कैलिब्रेटेड एनसीईआरटी अधिगम स्तर)`,
        ]
      : [
          `Competency Code: ${skill.code}`,
          `Cognitive Domain (Bloom's): ${
            skill.blooms_level ? skill.blooms_level.toUpperCase() : 'UNDERSTAND & APPLY'
          }`,
          `Curriculum Benchmark: ${Math.round((skill.difficulty ?? 0.5) * 100)}% calibrated difficulty`,
        ];

    // Dynamic Worked Example from real question bank
    const workedExample: WorkedExample = firstQ
      ? {
          title: isHindi ? 'एनसीईआरटी व्यावहारिक अनुप्रयोग' : 'NCERT Application Example',
          problem: firstQ.prompt,
          steps: [
            {
              stepNumber: 1,
              explanation:
                hints[0] ||
                (isHindi
                  ? 'प्रश्न में दी गई जानकारी और मुख्य संकल्पना को पहचानें।'
                  : 'Identify the given context and primary concept required.'),
              math: '',
            },
            {
              stepNumber: 2,
              explanation:
                hints[1] ||
                (isHindi
                  ? 'उचित नियम या विश्लेषणात्मक विधि लागू करें।'
                  : 'Apply the relevant rule or analytical method.'),
              math: '',
            },
            {
              stepNumber: 3,
              explanation:
                explanation ||
                hints[2] ||
                (isHindi
                  ? 'सही समाधान पर पहुंचें और निष्कर्ष निकालें।'
                  : 'Reach the valid conclusion through systematic deduction.'),
              math: '',
            },
          ],
          solution:
            explanation ||
            (isHindi
              ? 'उपरोक्त तार्किक विश्लेषण के आधार पर सही उत्तर निर्धारित होता है।'
              : 'The solution is verified through the conceptual deduction above.'),
          keyTakeaway: isHindi
            ? 'अवधारणात्मक स्पष्टता और चरणबद्ध विश्लेषण से दक्षता में निपुणता प्राप्त होती है।'
            : 'Structured analysis and conceptual understanding guarantee subject mastery.',
        }
      : {
          title: isHindi ? 'अधिगम संक्षेप' : 'Concept Summary',
          problem: isHindi
            ? `${skill.name} के प्रमुख अनुप्रयोगों का अभ्यास करें।`
            : `Review and practice core applications of ${skill.name}.`,
          steps: [
            {
              stepNumber: 1,
              explanation: isHindi
                ? 'सिद्धांतों को ध्यानपूर्वक पढ़ें।'
                : 'Review the foundational principles thoroughly.',
              math: '',
            },
            {
              stepNumber: 2,
              explanation: isHindi
                ? 'अभ्यास प्रश्नों में इन नियमों को लागू करें।'
                : 'Apply these concepts across practice questions.',
              math: '',
            },
          ],
          solution: isHindi
            ? 'नियमित अभ्यास से आत्मविश्वास बढ़ता है।'
            : 'Regular practice builds mastery.',
          keyTakeaway: isHindi
            ? 'दक्षता सुदृढ़ीकरण के लिए अगले चरण पर अभ्यास प्रश्न हल करें।'
            : 'Proceed to practice problems to reinforce this competency.',
        };

    return {
      skillId: skill.id,
      skillCode: skill.code,
      skillName: skill.name,
      topicName: skill.name,
      overview,
      deepDive,
      keyFormulas,
      workedExample,
    };
  }, [skillQuery.data, questionsQuery.data, language]);

  return {
    lesson,
    depth,
    language,
    setDepth,
    setLanguage,
    isLoading: skillQuery.isLoading || (options.skillId !== 'default' && !lesson),
    error: (skillQuery.error as Error) || null,
  };
}
