'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWebApiClient, getAuthToken, getCurrentUser } from '@/lib/api-client';
import type { MasteryResponse, TopicResponse } from '@bodhai/api-client';

export interface ProgressHistoryItem {
  skillId: string;
  skillName: string;
  topicName: string;
  pMastery: number;
  confidence: number;
  attemptsCount: number;
  correctCount: number;
  accuracyPercentage: number;
  state: 'not_learned' | 'partial' | 'mastered';
  lastAttemptedAt: string | null;
  rationale: string;
}

export interface ProgressStats {
  totalAttempts: number;
  totalCorrect: number;
  overallAccuracy: number;
  masteredSkills: number;
  partialSkills: number;
  notLearnedSkills: number;
  totalSkills: number;
}

export interface UseProgressHistoryReturn {
  historyItems: ProgressHistoryItem[];
  stats: ProgressStats;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useProgressHistory(curriculumCode = 'NCERT-MATH-C8'): UseProgressHistoryReturn {
  const apiClient = getWebApiClient();

  const masteryQuery = useQuery({
    queryKey: ['progress-history-mastery'],
    queryFn: async (): Promise<MasteryResponse[]> => {
      const token = getAuthToken();
      const user = getCurrentUser();
      if (!token || !user) return [];
      return apiClient.listMastery(user.id, token);
    },
    staleTime: 30 * 1000,
  });

  const topicsQuery = useQuery({
    queryKey: ['curriculum-topics', curriculumCode],
    queryFn: async (): Promise<TopicResponse[]> => {
      return apiClient.getCurriculumTopics(curriculumCode);
    },
    staleTime: 5 * 60 * 1000,
  });

  const { historyItems, stats } = React.useMemo(() => {
    const rawMastery = masteryQuery.data ?? [];
    const topics = topicsQuery.data ?? [];

    const skillMetadata = new Map<string, { name: string; topicName: string }>();
    let totalCurriculumSkills = 0;

    topics.forEach((t) => {
      t.skills.forEach((s) => {
        totalCurriculumSkills++;
        skillMetadata.set(String(s.id), {
          name: s.name,
          topicName: t.name,
        });
      });
    });

    let totalAttempts = 0;
    let totalCorrect = 0;
    let mastered = 0;
    let partial = 0;
    let notLearned = 0;

    const items: ProgressHistoryItem[] = rawMastery.map((m) => {
      totalAttempts += m.attempts_count;
      totalCorrect += m.correct_count;

      let state: 'not_learned' | 'partial' | 'mastered' = 'not_learned';
      if (m.state === 'mastered' || m.p_mastery >= 0.85) {
        state = 'mastered';
        mastered++;
      } else if (m.state === 'partial' || m.p_mastery >= 0.35 || m.attempts_count > 0) {
        state = 'partial';
        partial++;
      } else {
        notLearned++;
      }

      const meta = skillMetadata.get(String(m.skill_id));
      const accuracy =
        m.attempts_count > 0 ? Math.round((m.correct_count / m.attempts_count) * 100) : 0;

      return {
        skillId: String(m.skill_id),
        skillName: meta?.name ?? 'Linear Equations in One Variable',
        topicName: meta?.topicName ?? 'Algebra',
        pMastery: m.p_mastery,
        confidence: m.confidence,
        attemptsCount: m.attempts_count,
        correctCount: m.correct_count,
        accuracyPercentage: accuracy,
        state,
        lastAttemptedAt: m.last_attempted_at ?? new Date().toISOString(),
        rationale: m.rationale || 'Demonstrated consistent problem solving.',
      };
    });

    const totalTracked = Math.max(totalCurriculumSkills, items.length);
    if (items.length < totalTracked) {
      notLearned += totalTracked - items.length;
    }

    const overallAccuracy =
      totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    return {
      historyItems: items,
      stats: {
        totalAttempts,
        totalCorrect,
        overallAccuracy,
        masteredSkills: mastered,
        partialSkills: partial,
        notLearnedSkills: notLearned,
        totalSkills: totalTracked,
      },
    };
  }, [masteryQuery.data, topicsQuery.data]);

  return {
    historyItems,
    stats,
    isLoading: masteryQuery.isLoading || topicsQuery.isLoading,
    error: (masteryQuery.error as Error) || (topicsQuery.error as Error) || null,
    refetch: () => {
      void masteryQuery.refetch();
      void topicsQuery.refetch();
    },
  };
}
