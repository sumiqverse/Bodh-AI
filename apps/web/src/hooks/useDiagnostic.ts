'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWebApiClient, getAuthToken } from '@/lib/api-client';
import type { DiagnosticItemResponse, DiagnosticResponse } from '@bodhai/api-client';

export interface UseDiagnosticOptions {
  curriculumCode?: string;
  totalTarget?: number;
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
  submitAnswer: (selectedOption: string, timeSpentMs: number) => Promise<void>;
  retry: () => void;
}

export function useDiagnostic(options?: UseDiagnosticOptions): UseDiagnosticReturn {
  const curriculumCode = options?.curriculumCode ?? 'NCERT-MATH-C8';
  const totalQuestions = options?.totalTarget ?? 15;

  const queryClient = useQueryClient();
  const apiClient = getWebApiClient();

  const [activeSession, setActiveSession] = React.useState<DiagnosticResponse | null>(null);

  // TanStack Query for initial diagnostic session calibration
  const initialSessionQuery = useQuery({
    queryKey: ['diagnostic-session-init', curriculumCode],
    queryFn: async () => {
      const token = getAuthToken() ?? undefined;
      return apiClient.startDiagnostic({ curriculum_code: curriculumCode }, token);
    },
    staleTime: 0,
    retry: 2,
  });

  // Effective diagnostic session data (progress mutation overrides initial session)
  const currentSessionData = activeSession ?? initialSessionQuery.data ?? null;
  const sessionId = currentSessionData?.session_id ?? null;
  const currentItem = currentSessionData?.next_item ?? null;
  const questionsAnswered = currentSessionData?.questions_answered ?? 0;
  const isCompleted = currentSessionData?.is_completed ?? false;
  const summary = currentSessionData?.summary ?? null;

  // TanStack Query mutation for progressing diagnostic
  const progressMutation = useMutation({
    mutationFn: async (payload: { selectedOption: string; timeSpentMs: number }) => {
      if (!sessionId || !currentItem) {
        throw new Error('No active diagnostic session.');
      }
      const token = getAuthToken() ?? undefined;
      return apiClient.progressDiagnostic(
        {
          session_id: sessionId,
          question_id: currentItem.question_id,
          selected_answer: payload.selectedOption,
          time_spent_ms: payload.timeSpentMs,
        },
        token,
      );
    },
    onSuccess: (data: DiagnosticResponse) => {
      setActiveSession(data);
      // Invalidate student mastery query cache so fresh skills are fetched upon finishing
      if (data.is_completed) {
        void queryClient.invalidateQueries({ queryKey: ['student-mastery'] });
      }
    },
  });

  const startSession = React.useCallback(async () => {
    setActiveSession(null);
    await initialSessionQuery.refetch();
  }, [initialSessionQuery]);

  const submitAnswer = React.useCallback(
    async (selectedOption: string, timeSpentMs: number) => {
      if (progressMutation.isPending || isCompleted) return;
      await progressMutation.mutateAsync({ selectedOption, timeSpentMs });
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
  };
}
