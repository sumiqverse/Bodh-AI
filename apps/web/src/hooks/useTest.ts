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
  isLoading: boolean;
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

export function useTest(options?: UseTestOptions): UseTestReturn {
  const queryClient = useQueryClient();
  const apiClient = getWebApiClient();
  const locale = useLocale();

  const [questions, setQuestions] = React.useState<TestQuestion[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);
  const [answers, setAnswers] = React.useState<Record<number, string>>({});
  const [evaluations, setEvaluations] = React.useState<AttemptResponse[]>([]);
  const [isCompleted, setIsCompleted] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const questionStartedAt = React.useRef(Date.now());
  React.useEffect(() => {
    questionStartedAt.current = Date.now();
  }, [currentIndex]);

  React.useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    void apiClient
      .listQuestions({
        skillId: options?.skillId,
        classId: localStorage.getItem('bodhai_selected_class_id') || undefined,
        language: locale,
        limit: 3,
      })
      .then((items) => {
        if (isCancelled) return;
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
        } else {
          setQuestions([]);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load test questions.');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      isCancelled = true;
    };
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
          class_id: localStorage.getItem('bodhai_selected_class_id') || undefined,
          question_id: payload.question.id,
          skill_id: options?.skillId ?? payload.question.skillId,
          selected_answer: payload.option,
          idempotency_key: idempotencyKey,
          time_spent_ms: Math.max(0, Date.now() - questionStartedAt.current),
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
        void queryClient.invalidateQueries({ queryKey: ['class-leaderboard'] });
        void queryClient.invalidateQueries({ queryKey: ['student-achievements'] });
        void queryClient.invalidateQueries({ queryKey: ['student-assignments'] });
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
      try {
        await submitMutation.mutateAsync({ question: currentQuestion, option: selectedOption });
      } catch {
        // Handled through submitMutation.error state and onError callback
      }
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
    isLoading,
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
