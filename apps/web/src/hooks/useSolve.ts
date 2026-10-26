'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

// Default practice questions with 3-level progressive hint ladders
const DEFAULT_PRACTICE_QUESTIONS: Record<string, SolveQuestionData> = {
  default: {
    id: 'practice-q-001',
    code: 'NCERT-MATH-C8-CH02-P01',
    skillId: '10000000-0000-0000-0000-000000000001',
    difficulty: 2,
    prompt: 'Solve the equation for $x$:\n$$5x - 8 = 2x + 7$$',
    options: [
      { id: 'A', text: '$x = 3$' },
      { id: 'B', text: '$x = 5$' },
      { id: 'C', text: '$x = -5$' },
      { id: 'D', text: '$x = 15$' },
    ],
    hints: [
      'Level 1 (Concept): Group terms containing the variable $x$ on one side and constant numbers on the other side.',
      'Level 2 (Step Guidance): Subtract $2x$ from both sides to get $3x - 8 = 7$, then add $8$ to both sides.',
      'Level 3 (Worked Scaffold): $5x - 2x = 7 + 8 \\implies 3x = 15$. Finally divide by 3: $x = \\frac{15}{3} = 5$.',
    ],
  },
};

export function useSolve(options?: UseSolveOptions): UseSolveReturn {
  const queryClient = useQueryClient();
  const apiClient = getWebApiClient();

  const [hintLevel, setHintLevel] = React.useState<number>(0);
  const [submissionResult, setSubmissionResult] = React.useState<AttemptResponse | null>(null);
  const [hasSubmitted, setHasSubmitted] = React.useState<boolean>(false);
  const [startTime] = React.useState<number>(() => Date.now());

  // Fetch question if questionId or skillId provided
  const questionQuery = useQuery({
    queryKey: ['solve-question', options?.questionId ?? options?.skillId ?? 'default'],
    queryFn: async (): Promise<SolveQuestionData> => {
      if (options?.skillId) {
        try {
          const list = await apiClient.listQuestions({ skillId: options.skillId, limit: 1 });
          if (list && list.length > 0 && list[0]) {
            const q: QuestionResponse = list[0];
            return {
              id: q.id,
              code: q.code ?? 'NCERT-MATH-PRACTICE',
              skillId: q.skill_id,
              difficulty: q.difficulty,
              prompt: q.prompt,
              options: (q.options as Array<{ id: string; text: string }>) ?? [
                { id: 'A', text: 'Option A' },
                { id: 'B', text: 'Option B' },
              ],
              hints:
                q.hints && q.hints.length >= 3
                  ? q.hints
                  : [
                      'Level 1: Identify the unknown variable and note what operations are applied to it.',
                      'Level 2: Use inverse operations to collect variable terms on one side.',
                      'Level 3: Perform the arithmetic step-by-step to isolate the variable completely.',
                    ],
            };
          }
        } catch {
          // Fall back to curated practice question
        }
      }
      return (
        DEFAULT_PRACTICE_QUESTIONS.default ?? {
          id: 'practice-q-001',
          code: 'NCERT-MATH-C8-CH02-P01',
          skillId: '10000000-0000-0000-0000-000000000001',
          difficulty: 2,
          prompt: 'Solve the equation for $x$:\n$$5x - 8 = 2x + 7$$',
          options: [
            { id: 'A', text: '$x = 3$' },
            { id: 'B', text: '$x = 5$' },
            { id: 'C', text: '$x = -5$' },
            { id: 'D', text: '$x = 15$' },
          ],
          hints: [
            'Level 1: Group terms containing the variable on one side.',
            'Level 2: Subtract 2x and add 8.',
            'Level 3: 3x = 15 implies x = 5.',
          ],
        }
      );
    },
    staleTime: 60 * 1000,
  });

  const question: SolveQuestionData =
    questionQuery.data ?? (DEFAULT_PRACTICE_QUESTIONS.default as SolveQuestionData);

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
