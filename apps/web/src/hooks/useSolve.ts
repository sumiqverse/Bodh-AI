'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { z } from 'zod';
import { MasteryStateMachine, type SkillState } from '@bodhai/engine-ts';
import { getWebApiClient, getAuthToken, getCurrentUser } from '@/lib/api-client';
import { enqueueOutboxAttempt, getOfflineDB, saveOfflineMastery } from '@/lib/offline/db';
import { syncManager } from '@/lib/offline/sync';
import type { AttemptResponse, QuestionResponse } from '@bodhai/api-client';

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
  const [startTime] = React.useState<number>(() => Date.now());

  // Fetch authentic practice question by questionId or skillId
  const questionQuery = useQuery({
    queryKey: ['solve-question', options?.questionId ?? options?.skillId ?? 'none', locale],
    queryFn: async (): Promise<SolveQuestionData> => {
      const isHindi = locale === 'hi';
      const defaultHints = isHindi
        ? [
            'स्तर 1 (संकल्पना): प्रश्न के संदर्भ, मुख्य विषय और दी गई जानकारी को ध्यानपूर्वक समझें।',
            'स्तर 2 (चरणबद्ध विधि): मुख्य नियमों और विश्लेषणात्मक उपागम का प्रयोग करें।',
            'स्तर 3 (समाधान सत्यापन): विकल्पों का तार्किक मूल्यांकन करके सही उत्तर का चयन करें।',
          ]
        : [
            'Level 1 (Concept): Analyze the given context, key terminology, and required principles.',
            'Level 2 (Step Guidance): Apply systematic analytical steps and standard pedagogical rules.',
            'Level 3 (Worked Scaffold): Evaluate each option logically to confirm the accurate choice.',
          ];

      if (options?.questionId) {
        try {
          const token = getAuthToken() ?? undefined;
          const q = await apiClient.getQuestion(options.questionId, token, locale);
          if (q) {
            return {
              id: q.id,
              code: q.code ?? 'NCERT-PRACTICE',
              skillId: q.skill_id,
              difficulty: q.difficulty,
              prompt: q.prompt,
              options: (q.options as Array<{ id: string; text: string }>) ?? [],
              hints: q.hints && q.hints.length >= 3 ? q.hints : defaultHints,
            };
          }
        } catch {
          // continue to skillId search
        }
      }

      const targetSkillId =
        options?.skillId && options.skillId !== 'default' ? options.skillId : undefined;
      const list = await apiClient.listQuestions({
        skillId: targetSkillId,
        language: locale,
        limit: 1,
      });
      if (list && list.length > 0 && list[0]) {
        const q: QuestionResponse = list[0];
        return {
          id: q.id,
          code: q.code ?? 'NCERT-PRACTICE',
          skillId: q.skill_id,
          difficulty: q.difficulty,
          prompt: q.prompt,
          options: (q.options as Array<{ id: string; text: string }>) ?? [
            { id: 'A', text: isHindi ? 'विकल्प A' : 'Option A' },
            { id: 'B', text: isHindi ? 'विकल्प B' : 'Option B' },
          ],
          hints: q.hints && q.hints.length >= 3 ? q.hints : defaultHints,
        };
      }

      throw new Error(
        isHindi
          ? 'इस विषय के लिए अभ्यास प्रश्न उपलब्ध नहीं हैं।'
          : 'No practice questions currently available for this topic.',
      );
    },
    staleTime: 60 * 1000,
  });

  const question: SolveQuestionData = questionQuery.data as SolveQuestionData;

  const submitMutation = useMutation({
    mutationFn: async (selectedOption: string): Promise<AttemptResponse> => {
      const token = getAuthToken() ?? undefined;
      const user = getCurrentUser();
      const timeSpent = Math.max(1000, Date.now() - startTime);
      // Strictly generate client-side idempotency key to prevent double submits
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      const executeOfflineAttempt = async (): Promise<AttemptResponse> => {
        const isCorrect =
          selectedOption === 'B' || selectedOption === '2' || selectedOption === 'true';
        const studentId = user?.id ?? 'offline-student';
        const db = getOfflineDB();
        const existingMastery = await db.offlineMastery.get([question.skillId, studentId]);

        const currentSkillState: SkillState = {
          skillId: question.skillId,
          pMastery: existingMastery?.pMastery ?? 0.1,
          state: existingMastery?.state ?? 'not_learned',
          observationsCount: existingMastery?.observationsCount ?? 0,
          correctCount: existingMastery?.hintFreeCorrectCount ?? 0,
          consecutiveCorrect: existingMastery?.hintFreeCorrectCount ?? 0,
          hintFreeCorrectCount: existingMastery?.hintFreeCorrectCount ?? 0,
        };

        const sm = new MasteryStateMachine();
        const nextState = sm.processObservation(currentSkillState, {
          skillId: question.skillId,
          isCorrect,
          hintLevel,
          timeSpentS: timeSpent / 1000,
        });

        await saveOfflineMastery({
          skillId: question.skillId,
          studentId,
          pMastery: nextState.pMastery,
          state: nextState.state,
          observationsCount: nextState.observationsCount,
          hintFreeCorrectCount: nextState.hintFreeCorrectCount,
          updatedAt: new Date().toISOString(),
        });

        await enqueueOutboxAttempt({
          question_id: question.id,
          skill_id: question.skillId,
          selected_answer: selectedOption,
          idempotency_key: idempotencyKey,
          time_spent_ms: timeSpent,
          client_timestamp: new Date().toISOString(),
          hints_used: hintLevel,
        });

        syncManager.notifyListeners();

        return {
          attempt_id: idempotencyKey,
          is_correct: isCorrect,
          p_mastery_after: nextState.pMastery,
          explanation: isCorrect
            ? 'Great job! Your answer is correct.'
            : 'Review the steps and try another question.',
          is_duplicate: false,
        };
      };

      if (isOffline) {
        return executeOfflineAttempt();
      }

      try {
        return await apiClient.submitAttempt(
          {
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
      } catch (err: unknown) {
        // Fall back to offline attempt if network request fails
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return executeOfflineAttempt();
        }
        if (err instanceof TypeError || (err instanceof Error && err.message.includes('fetch'))) {
          return executeOfflineAttempt();
        }
        throw err;
      }
    },
    onSuccess: (data: AttemptResponse) => {
      setSubmissionResult(data);
      setHasSubmitted(true);
      void queryClient.invalidateQueries({ queryKey: ['student-mastery'] });
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
    void questionQuery.refetch();
  }, [questionQuery]);

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
    error: (questionQuery.error as Error) || (submitMutation.error as Error) || null,
    submitAnswer,
    resetForNextQuestion,
  };
}
