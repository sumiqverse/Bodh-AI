'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWebApiClient, getAuthToken, getCurrentUser, clearAuthSession } from '@/lib/api-client';
import type { MasteryResponse, CurriculumGraphResponse } from '@bodhai/api-client';

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
      try {
        return await apiClient.listMastery(user.id, token);
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'status' in err &&
          (err as { status: number }).status === 401
        ) {
          clearAuthSession();
        }
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  const graphQuery = useQuery({
    queryKey: ['curriculum-graph', curriculumCode],
    queryFn: async (): Promise<CurriculumGraphResponse> => {
      return apiClient.getCurriculumGraph(curriculumCode);
    },
    staleTime: 5 * 60 * 1000,
  });

  const { historyItems, stats } = React.useMemo(() => {
    const rawMastery = masteryQuery.data ?? [];
    const graph = graphQuery.data;

    const skillMetadata = new Map<string, { name: string; topicName: string }>();
    let totalCurriculumSkills = 0;

    if (graph?.nodes && Array.isArray(graph.nodes)) {
      graph.nodes.forEach((node) => {
        if ((node as unknown as { type?: string }).type === 'topic') return;
        totalCurriculumSkills++;
        const meta = {
          name: node.name,
          topicName: node.topic_name || 'NCERT Curriculum',
        };
        skillMetadata.set(String(node.id).toLowerCase(), meta);
        if (node.code) {
          skillMetadata.set(String(node.code).toLowerCase(), meta);
        }
      });
    }

    // Merge any client-side diagnostic assessment states
    const combinedMastery = [...rawMastery];
    if (typeof window !== 'undefined') {
      try {
        const localDiag = localStorage.getItem('bodhai_last_diagnostic_summary');
        if (localDiag) {
          const parsed = JSON.parse(localDiag);
          if (Array.isArray(parsed.skill_states)) {
            const existingIds = new Set(
              combinedMastery.map((m) => String(m.skill_id).toLowerCase()),
            );
            parsed.skill_states.forEach(
              (sk: {
                skill_id?: string;
                code?: string;
                name?: string;
                p_mastery?: number;
                state?: string;
                attempts_count?: number;
              }) => {
                const sid = String(sk.skill_id || sk.code || '').toLowerCase();
                if (sid && !existingIds.has(sid)) {
                  existingIds.add(sid);
                  combinedMastery.push({
                    skill_id: sk.skill_id || sk.code,
                    p_mastery: sk.p_mastery ?? 0.85,
                    confidence: 0.8,
                    attempts_count: sk.attempts_count || 1,
                    correct_count: sk.state === 'mastered' ? 1 : 0,
                    state: sk.state || 'mastered',
                    last_attempted_at: new Date().toISOString(),
                    rationale: 'Calibrated from diagnostic assessment.',
                  } as unknown as MasteryResponse);
                }
              },
            );
          }
        }
      } catch {
        // ignore local parse errors
      }
    }

    let totalAttempts = 0;
    let totalCorrect = 0;
    let mastered = 0;
    let partial = 0;
    let notLearned = 0;

    const items: ProgressHistoryItem[] = combinedMastery.map((m) => {
      totalAttempts += m.attempts_count || 0;
      totalCorrect += m.correct_count || 0;

      let state: 'not_learned' | 'partial' | 'mastered' = 'not_learned';
      if (m.state === 'mastered' || (m.p_mastery ?? 0) >= 0.85) {
        state = 'mastered';
        mastered++;
      } else if (
        m.state === 'partial' ||
        (m.p_mastery ?? 0) >= 0.35 ||
        (m.attempts_count ?? 0) > 0
      ) {
        state = 'partial';
        partial++;
      } else {
        notLearned++;
      }

      const sid = String(m.skill_id).toLowerCase();
      const meta = skillMetadata.get(sid);
      const attempts = m.attempts_count || 0;
      const correct = m.correct_count || 0;
      const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

      return {
        skillId: String(m.skill_id),
        skillName: m.skill_name || meta?.name || 'Curriculum Competency',
        topicName: m.topic_name || meta?.topicName || 'NCERT Curriculum',
        pMastery: m.p_mastery ?? 0.5,
        confidence: m.confidence ?? 0.7,
        attemptsCount: attempts,
        correctCount: correct,
        accuracyPercentage: accuracy,
        state,
        lastAttemptedAt: m.last_attempted_at ?? null,
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
  }, [masteryQuery.data, graphQuery.data]);

  return {
    historyItems,
    stats,
    isLoading: masteryQuery.isLoading || graphQuery.isLoading,
    error: (masteryQuery.error as Error) || (graphQuery.error as Error) || null,
    refetch: () => {
      void masteryQuery.refetch();
      void graphQuery.refetch();
    },
  };
}
