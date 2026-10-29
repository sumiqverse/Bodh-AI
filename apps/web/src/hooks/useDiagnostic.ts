'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWebApiClient, getAuthToken } from '@/lib/api-client';
import type { DiagnosticItemResponse, DiagnosticResponse } from '@bodhai/api-client';

export interface UseDiagnosticOptions {
  curriculumCode?: string;
  totalTarget?: number;
}

export interface DiagnosticFeedback {
  isCorrect: boolean;
  correctAnswerId: string | null;
  isWeaknessReview: boolean;
  explanation?: string | null;
}

export interface UseDiagnosticReturn {
  sessionId: string | null;
  currentItem: DiagnosticItemResponse | null;
  questionNumber: number;
  totalQuestions: number;
  isCompleted: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  summary: Record<string, unknown> | null;
  startSession: () => Promise<void>;
  submitAnswer: (selectedOption: string, timeSpentMs: number) => Promise<DiagnosticResponse | undefined>;
  retry: () => void;
  feedback: DiagnosticFeedback | null;
  isWeaknessReview: boolean;
  advanceToNext: () => void;
  isPendingCompletion: boolean;
}

export function useDiagnostic(options?: UseDiagnosticOptions): UseDiagnosticReturn {
  const curriculumCode = options?.curriculumCode ?? 'NCERT-MATH-C8';
  const totalQuestions = options?.totalTarget ?? 15;

  const queryClient = useQueryClient();
  const apiClient = getWebApiClient();

  const [activeSession, setActiveSession] = React.useState<DiagnosticResponse | null>(null);
  const [pendingNextSession, setPendingNextSession] = React.useState<DiagnosticResponse | null>(null);
  const [feedback, setFeedback] = React.useState<DiagnosticFeedback | null>(null);
  const [sessionKey, setSessionKey] = React.useState<number>(() => Date.now());

  // TanStack Query for initial diagnostic session calibration
  const initialSessionQuery = useQuery({
    queryKey: ['diagnostic-session-init', curriculumCode, sessionKey],
    queryFn: async () => {
      const token = getAuthToken() ?? undefined;
      return apiClient.startDiagnostic({ curriculum_code: curriculumCode }, token);
    },
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });

  // Effective diagnostic session data (progress mutation overrides initial session)
  const currentSessionData = activeSession ?? initialSessionQuery.data ?? null;
  const sessionId = currentSessionData?.session_id ?? null;
  const currentItem = currentSessionData?.next_item ?? null;
  const questionsAnswered = currentSessionData?.questions_answered ?? 0;
  const isCompleted = currentSessionData?.is_completed ?? false;
  const summary = currentSessionData?.summary ?? null;
  const isWeaknessReview = Boolean(currentSessionData?.is_weakness_review);

  // TanStack Query mutation for progressing diagnostic
  const progressMutation = useMutation({
    mutationFn: async (payload: { selectedOption: string; timeSpentMs: number }) => {
      if (!sessionId || !currentItem) {
        throw new Error('No active diagnostic session.');
      }
      const token = getAuthToken() ?? undefined;
      try {
        return await apiClient.progressDiagnostic(
          {
            session_id: sessionId,
            question_id: currentItem.question_id,
            selected_answer: payload.selectedOption,
            time_spent_ms: payload.timeSpentMs,
          },
          token,
        );
      } catch (err: unknown) {
        // If session was lost on backend (404), seamlessly recover with a fresh session
        if (
          err &&
          typeof err === 'object' &&
          'status' in err &&
          (err as { status: number }).status === 404
        ) {
          return await apiClient.startDiagnostic({ curriculum_code: curriculumCode }, token);
        }
        throw err;
      }
    },
    onSuccess: (data: DiagnosticResponse) => {
      if (typeof data.last_is_correct === 'boolean') {
        setPendingNextSession(data);
        setFeedback({
          isCorrect: data.last_is_correct,
          correctAnswerId: data.correct_answer_id ?? null,
          isWeaknessReview: Boolean(data.is_weakness_review),
          explanation: data.explanation ?? null,
        });
      } else {
        setActiveSession(data);
        if (data.is_completed) {
          if (typeof window !== 'undefined' && data.summary) {
            try {
              localStorage.setItem('bodhai_last_diagnostic_summary', JSON.stringify(data.summary));
            } catch {
              // ignore storage error
            }
          }
          void queryClient.invalidateQueries({ queryKey: ['student-mastery'] });
          void queryClient.invalidateQueries({ queryKey: ['next-item'] });
        }
      }
    },
  });

  const advanceToNext = React.useCallback(() => {
    if (pendingNextSession) {
      const nextData = pendingNextSession;
      setActiveSession(nextData);
      setPendingNextSession(null);
      setFeedback(null);
      if (nextData.is_completed) {
        if (typeof window !== 'undefined' && nextData.summary) {
          try {
            localStorage.setItem('bodhai_last_diagnostic_summary', JSON.stringify(nextData.summary));
          } catch {
            // ignore storage error
          }
        }
        void queryClient.invalidateQueries({ queryKey: ['student-mastery'] });
        void queryClient.invalidateQueries({ queryKey: ['next-item'] });
      }
    }
  }, [pendingNextSession, queryClient]);

  const startSession = React.useCallback(async () => {
    setActiveSession(null);
    setPendingNextSession(null);
    setFeedback(null);
    setSessionKey(Date.now());
  }, []);

  const submitAnswer = React.useCallback(
    async (selectedOption: string, timeSpentMs: number) => {
      if (progressMutation.isPending || isCompleted) return undefined;
      try {
        return await progressMutation.mutateAsync({ selectedOption, timeSpentMs });
      } catch {
        // Handled through progressMutation.error
        return undefined;
      }
    },
    [isCompleted, progressMutation],
  );

  const retry = React.useCallback(() => {
    if (!sessionId) {
      void initialSessionQuery.refetch();
    } else {
      progressMutation.reset();
    }
  }, [initialSessionQuery, progressMutation, sessionId]);

  const errorMessage = initialSessionQuery.error
    ? initialSessionQuery.error instanceof Error
      ? initialSessionQuery.error.message
      : 'Failed to start diagnostic'
    : progressMutation.error
      ? progressMutation.error instanceof Error
        ? progressMutation.error.message
        : 'Failed to submit answer'
      : null;

  return {
    sessionId,
    currentItem,
    questionNumber: Math.min(questionsAnswered + 1, totalQuestions),
    totalQuestions,
    isCompleted,
    isLoading: initialSessionQuery.isLoading && !activeSession,
    isSubmitting: progressMutation.isPending,
    errorMessage,
    summary,
    startSession,
    submitAnswer,
    retry,
    feedback,
    isWeaknessReview,
    advanceToNext,
    isPendingCompletion: Boolean(pendingNextSession?.is_completed),
  };
}
