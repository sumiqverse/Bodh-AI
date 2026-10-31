'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { getWebApiClient, getAuthToken, getCurrentUser } from '@/lib/api-client';
import type { AttemptResponse } from '@bodhai/api-client';

export interface TestQuestion {
  id: string;
  code: string;
  skillId: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
}

export interface TestEvaluationResult {
  totalQuestions: number;
  correctAnswers: number;
  isMastered: boolean;
  scorePercentage: number;
}

export interface UseTestOptions {
  skillId?: string;
}

export interface UseTestReturn {
  questions: TestQuestion[];
  currentIndex: number;
  currentQuestion: TestQuestion | null;
  totalQuestions: number;
  answers: Record<number, string>;
  isCompleted: boolean;
  isSubmitting: boolean;
  result: TestEvaluationResult | null;
  submitAnswer: (selectedOption: string) => Promise<void>;
  resetTest: () => void;
  error: string | null;
}

// Curated 3-item hint-free mastery check test
const DEFAULT_TEST_QUESTIONS: TestQuestion[] = [
  {
    id: 'test-q-001',
    code: 'NCERT-MATH-C8-TEST-01',
    skillId: '10000000-0000-0000-0000-000000000001',
    prompt: 'Solve for $y$ in the equation:\n$$4y - 12 = 20$$',
    options: [
      { id: 'A', text: '$y = 2$' },
      { id: 'B', text: '$y = 6$' },
      { id: 'C', text: '$y = 8$' },
      { id: 'D', text: '$y = 32$' },
    ],
  },
  {
    id: 'test-q-002',
    code: 'NCERT-MATH-C8-TEST-02',
    skillId: '10000000-0000-0000-0000-000000000001',
    prompt: 'If $3(x - 2) = 15$, find the value of $x$:\n$$3(x - 2) = 15$$',
    options: [
      { id: 'A', text: '$x = 5$' },
      { id: 'B', text: '$x = 7$' },
      { id: 'C', text: '$x = 9$' },
      { id: 'D', text: '$x = 3$' },
    ],
  },
  {
    id: 'test-q-003',
    code: 'NCERT-MATH-C8-TEST-03',
    skillId: '10000000-0000-0000-0000-000000000001',
    prompt: 'Solve the equation with variables on both sides:\n$$7x - 5 = 3x + 11$$',
    options: [
      { id: 'A', text: '$x = 4$' },
      { id: 'B', text: '$x = 2$' },
      { id: 'C', text: '$x = 6$' },
      { id: 'D', text: '$x = -4$' },
    ],
  },
];

export function useTest(options?: UseTestOptions): UseTestReturn {
  const queryClient = useQueryClient();
  const apiClient = getWebApiClient();
  const locale = useLocale();

  const [questions, setQuestions] = React.useState<TestQuestion[]>(DEFAULT_TEST_QUESTIONS);
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);
  const [answers, setAnswers] = React.useState<Record<number, string>>({});
  const [evaluations, setEvaluations] = React.useState<AttemptResponse[]>([]);
  const [isCompleted, setIsCompleted] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (options?.skillId) {
      void apiClient
        .listQuestions({ skillId: options.skillId, language: locale, limit: 3 })
        .then((items) => {
          if (items && items.length > 0) {
            setQuestions(
              items.map((q) => ({
                id: q.id,
                code: q.code || 'NCERT-TEST-Q',
                skillId: q.skill_id,
                prompt: q.prompt,
                options: (q.options as Array<{ id: string; text: string }>) || [],
              })),
            );
          }
        })
        .catch(() => {
          // fallback
        });
    }
  }, [options?.skillId, locale, apiClient]);

  const currentQuestion = questions[currentIndex] ?? null;

  const submitMutation = useMutation({
    mutationFn: async (payload: { question: TestQuestion; option: string }) => {
      const token = getAuthToken() ?? undefined;
      const user = getCurrentUser();
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idem-test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      return apiClient.submitAttempt(
        {
          question_id: payload.question.id,
          skill_id: options?.skillId ?? payload.question.skillId,
          selected_answer: payload.option,
          idempotency_key: idempotencyKey,
          time_spent_ms: 12000,
          client_timestamp: new Date().toISOString(),
        },
        token,
        user?.id,
      );
    },
    onSuccess: (data: AttemptResponse, vars) => {
      const nextAnswers = { ...answers, [currentIndex]: vars.option };
      const nextEvaluations = [...evaluations, data];

      setAnswers(nextAnswers);
      setEvaluations(nextEvaluations);

      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsCompleted(true);
        void queryClient.invalidateQueries({ queryKey: ['student-mastery'] });
      }
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'Failed to submit test answer.');
    },
  });

  const submitAnswer = React.useCallback(
    async (selectedOption: string) => {
      if (!currentQuestion || submitMutation.isPending || isCompleted) return;
      setErrorMessage(null);
      await submitMutation.mutateAsync({ question: currentQuestion, option: selectedOption });
    },
    [currentQuestion, isCompleted, submitMutation],
  );

  const resetTest = React.useCallback(() => {
    setCurrentIndex(0);
    setAnswers({});
    setEvaluations([]);
    setIsCompleted(false);
    setErrorMessage(null);
  }, []);

  const result = React.useMemo<TestEvaluationResult | null>(() => {
    if (!isCompleted) return null;
    const correctCount = evaluations.filter((e) => e.is_correct).length;
    const isMastered = correctCount >= 2; // 2 out of 3 or 3 out of 3 = Mastered
    return {
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      isMastered,
      scorePercentage: Math.round((correctCount / questions.length) * 100),
    };
  }, [evaluations, isCompleted, questions.length]);

  return {
    questions,
    currentIndex,
    currentQuestion,
    totalQuestions: questions.length,
    answers,
    isCompleted,
    isSubmitting: submitMutation.isPending,
    result,
    submitAnswer,
    resetTest,
    error: errorMessage,
  };
}
