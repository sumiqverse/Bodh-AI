'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { z } from 'zod';
import { getWebApiClient, getAuthToken, getCurrentUser } from '@/lib/api-client';
import type { AttemptResponse } from '@bodhai/api-client';

export const solveSubmissionSchema = z.object({
  selectedAnswer: z.string().min(1, { message: 'validationAnswerRequired' }),
});

export type SolveSubmissionFormValues = z.infer<typeof solveSubmissionSchema>;

export interface SolveQuestionData {
  id: string;
  code: string;
  skillId: string;
  difficulty: number;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  hints: string[];
}

export interface UseSolveOptions {
  skillId?: string;
  questionId?: string;
}

export interface UseSolveReturn {
  question: SolveQuestionData | null;
  hintLevel: number; // 0 = none, 1 = clue, 2 = step guidance, 3 = worked scaffold
  activeHints: string[];
  maxHints: number;
  requestHint: () => void;
  isSubmitting: boolean;
  submissionResult: AttemptResponse | null;
  hasSubmitted: boolean;
  isPracticeCompleted: boolean;
  completedSkillId?: string;
  error: Error | null;
  submitAnswer: (selectedOption: string) => Promise<AttemptResponse | undefined>;
  resetForNextQuestion: () => void;
}

export function useSolve(options?: UseSolveOptions): UseSolveReturn {
  const queryClient = useQueryClient();
  const apiClient = getWebApiClient();
  const locale = useLocale();

  const [hintLevel, setHintLevel] = React.useState<number>(0);
  const [submissionResult, setSubmissionResult] = React.useState<AttemptResponse | null>(null);
  const [hasSubmitted, setHasSubmitted] = React.useState<boolean>(false);
  const [skipInitialQuestionId, setSkipInitialQuestionId] = React.useState<boolean>(false);
  const [questionCycle, setQuestionCycle] = React.useState<number>(0);
  const [isPracticeCompleted, setIsPracticeCompleted] = React.useState<boolean>(false);
  const [completedSkillId, setCompletedSkillId] = React.useState<string | undefined>(
    options?.skillId,
  );
  const attemptedIdsRef = React.useRef<Set<string>>(new Set());
  const startTime = React.useRef(Date.now());

  // Fetch authentic practice question by questionId or skillId
  const questionQuery = useQuery({
    queryKey: [
      'solve-question',
      options?.skillId ?? 'none',
      skipInitialQuestionId ? 'next' : (options?.questionId ?? 'next'),
      questionCycle,
      locale,
    ],
    queryFn: async (): Promise<SolveQuestionData | null> => {
      const isHindi = locale === 'hi';
      if (!skipInitialQuestionId && options?.questionId) {
        try {
          const token = getAuthToken() ?? undefined;
          const q = await apiClient.getQuestion(options.questionId, token, locale);
          if (q) {
            if (q.skill_id) {
              setCompletedSkillId(q.skill_id);
            }
            return {
              id: q.id,
              code: q.code ?? 'NCERT-PRACTICE',
              skillId: q.skill_id,
              difficulty: q.difficulty,
              prompt: q.prompt,
              options: (q.options as Array<{ id: string; text: string }>) ?? [],
              hints: q.hints ?? [],
            };
          }
        } catch {
          // continue to skillId search
        }
      }

      const targetSkillId =
        options?.skillId && options.skillId !== 'default' ? options.skillId : undefined;
      if (targetSkillId) {
        const recommendation = await apiClient.getNextItem(
          localStorage.getItem('bodhai_student_curriculum') || undefined,
          getAuthToken() || undefined,
          locale,
          localStorage.getItem('bodhai_selected_class_id') || undefined,
          targetSkillId,
        );

        if (recommendation.skill_id) {
          setCompletedSkillId(recommendation.skill_id);
        }

        // If backend marks all_completed OR if this question was already answered in this session,
        // then the student has completed all available practice questions!
        if (
          recommendation.all_completed ||
          attemptedIdsRef.current.has(recommendation.question_id)
        ) {
          setIsPracticeCompleted(true);
          return null;
        }

        return {
          id: recommendation.question_id,
          code: recommendation.code,
          skillId: recommendation.skill_id,
          difficulty: recommendation.difficulty,
          prompt: recommendation.prompt,
          options: (recommendation.options as Array<{ id: string; text: string }>) ?? [],
          hints: recommendation.hints ?? [],
        };
      }

      throw new Error(
        isHindi
          ? 'इस विषय के लिए अभ्यास प्रश्न उपलब्ध नहीं हैं।'
          : 'No practice questions currently available for this topic.',
      );
    },
    staleTime: 0,
  });

  const question = questionQuery.data ?? null;
  React.useEffect(() => {
    startTime.current = Date.now();
  }, [question?.id]);

  const submitMutation = useMutation({
    mutationFn: async (selectedOption: string): Promise<AttemptResponse> => {
      const token = getAuthToken() ?? undefined;
      const user = getCurrentUser();
      const timeSpent = Math.max(1000, Date.now() - startTime.current);
      // Strictly generate client-side idempotency key to prevent double submits
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      if (!question) throw new Error('No question is loaded.');
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Connect to the internet to submit your answer.');
      }
      return apiClient.submitAttempt(
        {
          class_id: localStorage.getItem('bodhai_selected_class_id') || undefined,
          question_id: question.id,
          skill_id: question.skillId,
          selected_answer: selectedOption,
          idempotency_key: idempotencyKey,
          time_spent_ms: timeSpent,
          client_timestamp: new Date().toISOString(),
        },
        token,
        user?.id,
      );
    },
    onSuccess: (data: AttemptResponse) => {
      setSubmissionResult(data);
      setHasSubmitted(true);
      if (question?.id) {
        attemptedIdsRef.current.add(question.id);
      }
      void queryClient.invalidateQueries({ queryKey: ['student-mastery'] });
      void queryClient.invalidateQueries({ queryKey: ['class-leaderboard'] });
      void queryClient.invalidateQueries({ queryKey: ['student-achievements'] });
      void queryClient.invalidateQueries({ queryKey: ['student-assignments'] });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('bodhai_attempt_submitted', {
            detail: { isCorrect: Boolean(data.is_correct) },
          }),
        );
      }
    },
  });

  const requestHint = React.useCallback(() => {
    setHintLevel((prev) => Math.min(prev + 1, 3));
  }, []);

  const submitAnswer = React.useCallback(
    async (selectedOption: string): Promise<AttemptResponse | undefined> => {
      if (submitMutation.isPending || hasSubmitted) return;
      return submitMutation.mutateAsync(selectedOption);
    },
    [hasSubmitted, submitMutation],
  );

  const resetForNextQuestion = React.useCallback(() => {
    setHintLevel(0);
    setSubmissionResult(null);
    setHasSubmitted(false);
    setSkipInitialQuestionId(true);
    setQuestionCycle((prev) => prev + 1);
    void queryClient.invalidateQueries({ queryKey: ['solve-question'] });
  }, [queryClient]);

  const activeHints = React.useMemo(() => {
    if (!question || hintLevel === 0) return [];
    return question.hints.slice(0, hintLevel);
  }, [hintLevel, question]);

  return {
    question,
    hintLevel,
    activeHints,
    maxHints: 3,
    requestHint,
    isSubmitting: submitMutation.isPending,
    submissionResult,
    hasSubmitted,
    isPracticeCompleted,
    completedSkillId,
    error: (questionQuery.error as Error) || (submitMutation.error as Error) || null,
    submitAnswer,
    resetForNextQuestion,
  };
}
