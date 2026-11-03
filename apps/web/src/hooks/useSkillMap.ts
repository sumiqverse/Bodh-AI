'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { getWebApiClient, getAuthToken, getCurrentUser, clearAuthSession } from '@/lib/api-client';
import type { MasteryResponse, NextItemResponse, TopicResponse } from '@bodhai/api-client';

export type MasteryState = 'not_learned' | 'partial' | 'mastered';

export interface SkillItem {
  id: string;
  code: string;
  name: string;
  topicCode: string;
  topicName: string;
  difficulty: number;
  bloomsLevel?: string | null;
  masteryScore: number;
  state: MasteryState;
  attemptsCount: number;
}

export interface NextActionData {
  skillId: string;
  skillCode: string;
  skillName: string;
  actionType: 'learn' | 'solve' | 'test';
  rationale: string;
  questionId?: string;
}

export interface SkillMapSummary {
  notLearnedCount: number;
  partialCount: number;
  masteredCount: number;
  totalCount: number;
  masteryPercentage: number;
}

export interface UseSkillMapReturn {
  topics: TopicResponse[];
  skills: SkillItem[];
  skillsByTopic: Record<string, SkillItem[]>;
  summary: SkillMapSummary;
  nextAction: NextActionData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSkillMap(curriculumCode?: string, classId?: string): UseSkillMapReturn {
  const apiClient = getWebApiClient();
  const locale = useLocale();

  const isEnabled = Boolean(curriculumCode);

  // Query 1: Full curriculum competency graph (nodes = topics + atomic skills)
  const graphQuery = useQuery({
    queryKey: ['curriculum-graph', curriculumCode],
    queryFn: async () => apiClient.getCurriculumGraph(curriculumCode!),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });

  // Query 1b: Optional ordered topics list
  const topicsQuery = useQuery({
    queryKey: ['curriculum-topics', curriculumCode],
    queryFn: async () => apiClient.getCurriculumTopics(curriculumCode!),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
  });

  // Query 2: Student mastery (gracefully defaults to [] for guests or expired tokens)
  const masteryQuery = useQuery({
    queryKey: ['student-mastery', classId],
    queryFn: async () => {
      const token = getAuthToken() ?? undefined;
      const user = getCurrentUser();
      if (!token || !user?.id) {
        return [];
      }
      try {
        return await apiClient.listMastery(user.id, token, classId);
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

  // Query 3: Next recommended item
  const nextItemQuery = useQuery({
    queryKey: ['next-item', curriculumCode, classId, locale],
    queryFn: async () => {
      const token = getAuthToken() ?? undefined;
      try {
        return await apiClient.getNextItem(curriculumCode!, token, locale, classId);
      } catch {
        return null;
      }
    },
    enabled: isEnabled,
    staleTime: 30 * 1000,
  });

  const { skills, skillsByTopic, computedTopics, summary, nextAction } = React.useMemo(() => {
    const graphData = graphQuery.data;
    const rawTopics = topicsQuery.data ?? [];
    const rawMastery = masteryQuery.data ?? [];
    const nextItem: NextItemResponse | null = nextItemQuery.data ?? null;

    const topicNodes =
      graphData?.nodes?.filter((n) => (n as unknown as { type?: string }).type === 'topic') ?? [];
    const skillNodes =
      graphData?.nodes?.filter((n) => (n as unknown as { type?: string }).type !== 'topic') ?? [];

    const computedTopics: TopicResponse[] =
      rawTopics.length > 0
        ? rawTopics
        : topicNodes.map((t, idx) => ({
            id: t.id,
            code: t.code,
            name: t.name,
            description: null,
            sequence_order: idx + 1,
            skills: [],
          }));

    const masteryMap = new Map<string, MasteryResponse>();
    rawMastery.forEach((m) => {
      masteryMap.set(String(m.skill_id).toLowerCase(), m);
    });

    // Merge any calibrated diagnostic assessment mastery from localStorage (guest & immediate sync)
    if (typeof window !== 'undefined' && !getAuthToken()) {
      try {
        const localDiag = localStorage.getItem('bodhai_last_diagnostic_summary');
        if (localDiag) {
          const parsed = JSON.parse(localDiag);
          if (Array.isArray(parsed.skill_states)) {
            parsed.skill_states.forEach(
              (sk: {
                skill_id: string;
                code?: string;
                name?: string;
                p_mastery: number;
                state: string;
                attempts_count: number;
              }) => {
                const sid = String(sk.skill_id).toLowerCase();
                if (!masteryMap.has(sid)) {
                  masteryMap.set(sid, {
                    skill_id: sk.skill_id,
                    p_mastery: sk.p_mastery,
                    confidence: 0.8,
                    attempts_count: sk.attempts_count || 1,
                    correct_count: sk.state === 'mastered' ? 1 : 0,
                    state: sk.state,
                    rationale: 'Calibrated from CAT diagnostic assessment.',
                  } as unknown as MasteryResponse);
                }
                if (sk.code && !masteryMap.has(sk.code.toLowerCase())) {
                  masteryMap.set(sk.code.toLowerCase(), {
                    skill_id: sk.skill_id,
                    p_mastery: sk.p_mastery,
                    confidence: 0.8,
                    attempts_count: sk.attempts_count || 1,
                    correct_count: sk.state === 'mastered' ? 1 : 0,
                    state: sk.state,
                    rationale: 'Calibrated from CAT diagnostic assessment.',
                  } as unknown as MasteryResponse);
                }
              },
            );
          }
        }
      } catch {
        // ignore diagnostic parsing error
      }
    }

    const allSkills: SkillItem[] = [];
    const grouped: Record<string, SkillItem[]> = {};

    computedTopics.forEach((t) => {
      grouped[t.code] = [];
    });

    let notLearned = 0;
    let partial = 0;
    let mastered = 0;

    if (skillNodes.length > 0) {
      skillNodes.forEach((sk) => {
        const topicCode = sk.topic_code || 'general';
        const topicName = sk.topic_name || topicCode;

        if (!grouped[topicCode]) {
          grouped[topicCode] = [];
        }

        const m =
          masteryMap.get(String(sk.id).toLowerCase()) ||
          masteryMap.get(String(sk.code).toLowerCase());
        const score = m ? m.p_mastery : 0;
        let state: MasteryState = 'not_learned';

        if (m?.state === 'mastered' || (score >= 0.95 && (m?.attempts_count ?? 0) >= 3)) {
          state = 'mastered';
          mastered++;
        } else if (m?.state === 'partial' || score >= 0.4) {
          state = 'partial';
          partial++;
        } else {
          state = 'not_learned';
          notLearned++;
        }

        const item: SkillItem = {
          id: sk.id,
          code: sk.code,
          name: sk.name,
          topicCode,
          topicName,
          difficulty: sk.difficulty ?? 1,
          bloomsLevel: sk.blooms_level,
          masteryScore: Math.round(score * 100) / 100,
          state,
          attemptsCount: m?.attempts_count ?? 0,
        };

        allSkills.push(item);
        grouped[topicCode]?.push(item);
      });
    } else {
      // Fallback for mock/test data with embedded skills array on topics
      rawTopics.forEach((topic) => {
        if (!grouped[topic.code]) grouped[topic.code] = [];
        const skillsList = Array.isArray((topic as unknown as { skills?: unknown[] }).skills)
          ? (topic as unknown as { skills: SkillItem[] }).skills
          : [];
        skillsList.forEach((sk) => {
          const m = masteryMap.get(String(sk.id));
          const score = m ? m.p_mastery : 0;
          let state: MasteryState = 'not_learned';

          if (m?.state === 'mastered' || (score >= 0.95 && (m?.attempts_count ?? 0) >= 3)) {
            state = 'mastered';
            mastered++;
          } else if (m?.state === 'partial' || score >= 0.4) {
            state = 'partial';
            partial++;
          } else {
            state = 'not_learned';
            notLearned++;
          }

          const item: SkillItem = {
            id: sk.id,
            code: sk.code,
            name: sk.name,
            topicCode: topic.code,
            topicName: topic.name,
            difficulty: sk.difficulty ?? 1,
            bloomsLevel: sk.bloomsLevel ?? null,
            masteryScore: Math.round(score * 100) / 100,
            state,
            attemptsCount: m?.attempts_count ?? 0,
          };

          allSkills.push(item);
          grouped[topic.code]?.push(item);
        });
      });
    }

    const totalCount = allSkills.length;
    const masteryPercentage = totalCount > 0 ? Math.round((mastered / totalCount) * 100) : 0;

    // Determine the single clear 'Next' action strictly scoped to the active curriculum
    let next: NextActionData | null = null;
    const matchedSkill = nextItem
      ? allSkills.find((s) => s.id === String(nextItem.skill_id))
      : null;

    if (nextItem && matchedSkill) {
      const actionType = nextItem.is_test_gate
        ? 'test'
        : nextItem.hint_ladder > 1
          ? 'learn'
          : 'solve';
      next = {
        skillId: matchedSkill.id,
        skillCode: matchedSkill.code,
        skillName: matchedSkill.name,
        actionType,
        rationale: nextItem.rationale || 'Next recommended concept based on your current mastery.',
        questionId: String(nextItem.question_id),
      };
    } else if (allSkills.length > 0) {
      const candidate =
        allSkills.find((s) => s.state === 'partial') ??
        allSkills.find((s) => s.state === 'not_learned') ??
        allSkills[0];
      if (candidate) {
        next = {
          skillId: candidate.id,
          skillCode: candidate.code,
          skillName: candidate.name,
          actionType: candidate.state === 'not_learned' ? 'learn' : 'solve',
          rationale: 'Continue advancing your competency on this foundational skill.',
        };
      }
    }

    return {
      skills: allSkills,
      skillsByTopic: grouped,
      computedTopics,
      summary: {
        notLearnedCount: notLearned,
        partialCount: partial,
        masteredCount: mastered,
        totalCount,
        masteryPercentage,
      },
      nextAction: next,
    };
  }, [graphQuery.data, topicsQuery.data, masteryQuery.data, nextItemQuery.data]);

  return {
    topics: computedTopics,
    skills,
    skillsByTopic,
    summary,
    nextAction,
    isLoading: isEnabled
      ? (graphQuery.isLoading && topicsQuery.isLoading) || masteryQuery.isLoading
      : false,
    error: isEnabled ? (graphQuery.error as Error) || (topicsQuery.error as Error) || null : null,
    refetch: () => {
      if (isEnabled) {
        void graphQuery.refetch();
        void topicsQuery.refetch();
        void masteryQuery.refetch();
        void nextItemQuery.refetch();
      }
    },
  };
}
