'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWebApiClient, getAuthToken, getCurrentUser } from '@/lib/api-client';
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

export function useSkillMap(curriculumCode = 'NCERT-MATH-C8'): UseSkillMapReturn {
  const apiClient = getWebApiClient();

  // Query 1: Curriculum topics & skills
  const topicsQuery = useQuery({
    queryKey: ['curriculum-topics', curriculumCode],
    queryFn: async () => apiClient.getCurriculumTopics(curriculumCode),
    staleTime: 5 * 60 * 1000,
  });

  // Query 2: Student mastery
  const masteryQuery = useQuery({
    queryKey: ['student-mastery'],
    queryFn: async () => {
      const token = getAuthToken() ?? undefined;
      const user = getCurrentUser();
      return apiClient.listMastery(user?.id, token);
    },
    staleTime: 30 * 1000,
  });

  // Query 3: Next recommended item
  const nextItemQuery = useQuery({
    queryKey: ['next-item', curriculumCode],
    queryFn: async () => {
      const token = getAuthToken() ?? undefined;
      try {
        return await apiClient.getNextItem(curriculumCode, token);
      } catch {
        return null;
      }
    },
    staleTime: 30 * 1000,
  });

  const { skills, skillsByTopic, summary, nextAction } = React.useMemo(() => {
    const rawTopics = topicsQuery.data ?? [];
    const rawMastery = masteryQuery.data ?? [];
    const nextItem: NextItemResponse | null = nextItemQuery.data ?? null;

    const masteryMap = new Map<string, MasteryResponse>();
    rawMastery.forEach((m) => {
      masteryMap.set(String(m.skill_id), m);
    });

    const allSkills: SkillItem[] = [];
    const grouped: Record<string, SkillItem[]> = {};

    let notLearned = 0;
    let partial = 0;
    let mastered = 0;

    rawTopics.forEach((topic) => {
      grouped[topic.code] = [];
      topic.skills.forEach((sk) => {
        const m = masteryMap.get(String(sk.id));
        const score = m ? m.p_mastery : 0;
        let state: MasteryState = 'not_learned';

        if (m?.state === 'mastered' || score >= 0.85) {
          state = 'mastered';
          mastered++;
        } else if (m?.state === 'partial' || score >= 0.35 || (m && m.attempts_count > 0)) {
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
          difficulty: sk.difficulty,
          bloomsLevel: sk.blooms_level,
          masteryScore: Math.round(score * 100) / 100,
          state,
          attemptsCount: m?.attempts_count ?? 0,
        };

        allSkills.push(item);
        grouped[topic.code]?.push(item);
      });
    });

    const totalCount = allSkills.length;
    const masteryPercentage = totalCount > 0 ? Math.round((mastered / totalCount) * 100) : 0;

    // Determine the single clear 'Next' action
    let next: NextActionData | null = null;
    if (nextItem) {
      const matchedSkill = allSkills.find((s) => s.id === String(nextItem.skill_id));
      const actionType = nextItem.is_test_gate
        ? 'test'
        : nextItem.hint_ladder > 1
          ? 'learn'
          : 'solve';
      next = {
        skillId: String(nextItem.skill_id),
        skillCode: nextItem.skill_code,
        skillName: matchedSkill?.name ?? nextItem.skill_code,
        actionType,
        rationale: nextItem.rationale || 'Next recommended concept based on your current mastery.',
        questionId: String(nextItem.question_id),
      };
    } else if (allSkills.length > 0) {
      // Fallback: First partial skill or first not-learned skill
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
      summary: {
        notLearnedCount: notLearned,
        partialCount: partial,
        masteredCount: mastered,
        totalCount,
        masteryPercentage,
      },
      nextAction: next,
    };
  }, [topicsQuery.data, masteryQuery.data, nextItemQuery.data]);

  return {
    topics: topicsQuery.data ?? [],
    skills,
    skillsByTopic,
    summary,
    nextAction,
    isLoading: topicsQuery.isLoading || masteryQuery.isLoading,
    error: (topicsQuery.error as Error) || (masteryQuery.error as Error) || null,
    refetch: () => {
      void topicsQuery.refetch();
      void masteryQuery.refetch();
      void nextItemQuery.refetch();
    },
  };
}
