'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { Badge, Skeleton, buttonVariants } from '@bodhai/ui';
import { Clock, ArrowRight, Plus, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAuthToken, getWebApiClient } from '@/lib/api-client';
import { useSkillMap, type MasteryState, type SkillItem } from '@/hooks/useSkillMap';

// Gamified Dashboard Components from design.md
import {
  StudentSidebar,
  StudentTopBar,
  GreetingBanner,
  StatTiles,
  CourseProgressCard,
  TodayChallengeCard,
  LearningEfficiencyCard,
  MonthlyCalendarCard,
  LeaderboardCard,
} from '@/components/gamified';

export interface EnrolledClassroom {
  classId: string;
  name: string;
  grade: number;
  section: string;
  academicYear?: string;
  curriculumCode: string;
  status: 'active' | 'pending';
  teacherName?: string;
  joinCode?: string;
}

function StudentDashboardSkeleton(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-canvas-gradient py-6 px-3 sm:px-6 flex justify-center">
      <div className="w-full max-w-[1320px] rounded-[28px] border-2 border-ink bg-white dark:bg-card p-6 shadow-shell space-y-6">
        <div className="flex items-center justify-between border-b border-divider pb-4">
          <Skeleton className="h-8 w-48 rounded-full" />
          <Skeleton className="h-10 w-64 rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="hidden lg:block lg:col-span-2">
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-7 space-y-6">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Skeleton className="h-28 rounded-tile" />
              <Skeleton className="h-28 rounded-tile" />
              <Skeleton className="h-28 rounded-tile" />
              <Skeleton className="h-28 rounded-tile" />
            </div>
            <Skeleton className="h-48 rounded-card" />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-64 rounded-card" />
            <Skeleton className="h-64 rounded-card" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentHomeContent(): React.JSX.Element {
  const t = useTranslations('skillMap');
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiClient = getWebApiClient();

  const classIdParam = searchParams.get('classId');
  const [activeTab, setActiveTab] = React.useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedTopic, setSelectedTopic] = React.useState<string>('all');

  const token = typeof window !== 'undefined' ? getAuthToken() : null;
  const profileQuery = useQuery({
    queryKey: ['student-profile-me'],
    queryFn: () => apiClient.getMyProfile(token || undefined),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const enrolledClasses: EnrolledClassroom[] = React.useMemo(() => {
    const raw = profileQuery.data?.profile as Record<string, unknown> | undefined;
    if (!raw) return [];
    const rawClasses = raw.classes as EnrolledClassroom[] | undefined;
    if (Array.isArray(rawClasses) && rawClasses.length > 0) {
      return rawClasses;
    }
    if (raw.className) {
      return [
        {
          classId: String(raw.classId || 'default-class'),
          name: String(raw.className),
          grade: Number(raw.grade) || 8,
          section: String(raw.section || 'A'),
          academicYear: '2024-2025',
          curriculumCode: String(raw.curriculumCode || 'NCERT-MATH-C8'),
          status: 'active' as const,
          teacherName: String(raw.assignedTeacherName || 'Educator'),
        },
      ];
    }
    return [];
  }, [profileQuery.data?.profile]);

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeClasses = enrolledClasses.filter((c) => c.status === 'active');
  const pendingClasses = enrolledClasses.filter((c) => c.status === 'pending');

  // Currently focused classroom (from URL or first active class)
  const activeClass = React.useMemo(() => {
    if (classIdParam && enrolledClasses.length) {
      const match = enrolledClasses.find((c) => c.classId === classIdParam);
      if (match) return match;
    }
    return activeClasses[0] || enrolledClasses[0] || null;
  }, [classIdParam, enrolledClasses, activeClasses]);

  const rawProfile = profileQuery.data?.profile as Record<string, unknown> | undefined;
  const studentName = String(rawProfile?.name || rawProfile?.username || 'Karan Mehra');
  const firstName = studentName.split(' ')[0] || 'Karan';
  const rollNumber = rawProfile?.rollNumber ? String(rawProfile.rollNumber) : undefined;

  // Sync active classroom's curriculum to localStorage
  React.useEffect(() => {
    if (activeClass && typeof window !== 'undefined') {
      localStorage.setItem('bodhai_student_curriculum', activeClass.curriculumCode);
      localStorage.setItem('bodhai_selected_class_id', activeClass.classId);
    }
  }, [activeClass]);

  const handleSelectClass = (classId: string) => {
    const target = enrolledClasses.find((c) => c.classId === classId);
    if (target && typeof window !== 'undefined') {
      localStorage.setItem('bodhai_selected_class_id', target.classId);
      localStorage.setItem('bodhai_student_curriculum', target.curriculumCode);
    }
    router.push(`/student?classId=${classId}`);
  };

  // Curriculum data for active class
  const isClassActive = activeClass?.status === 'active';
  const { topics, skills, skillsByTopic, nextAction } = useSkillMap(
    isClassActive ? activeClass?.curriculumCode : undefined,
  );

  // Filter skills by search query or selected topic
  const filteredSkills = React.useMemo(() => {
    let list = selectedTopic === 'all' ? skills : (skillsByTopic[selectedTopic] ?? []);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.topicName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [selectedTopic, skills, skillsByTopic, searchQuery]);

  const getMasteryBadge = (state: MasteryState) => {
    switch (state) {
      case 'mastered':
        return (
          <Badge
            variant="default"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-0.5 px-2.5 border border-ink/40"
          >
            {t('stateMastered')}
          </Badge>
        );
      case 'partial':
        return (
          <Badge
            variant="warning"
            size="sm"
            className="bg-surface-yellow text-ink border-2 border-ink font-bold text-xs py-0.5 px-2"
          >
            {t('statePartial')}
          </Badge>
        );
      case 'not_learned':
      default:
        return (
          <Badge
            variant="outline"
            size="sm"
            className="text-text-secondary border-2 border-ink/30 font-medium text-xs py-0.5 px-2"
          >
            {t('stateNotLearned')}
          </Badge>
        );
    }
  };

  // Continue action handler
  const handleContinueCourse = () => {
    if (nextAction) {
      if (nextAction.actionType === 'test') {
        router.push(`/test?skillId=${nextAction.skillId}`);
      } else if (nextAction.actionType === 'solve') {
        router.push(`/solve?skillId=${nextAction.skillId}`);
      } else {
        router.push(`/learn?skillId=${nextAction.skillId}`);
      }
    } else if (activeClass) {
      router.push(`/diagnostic?curriculum=${activeClass.curriculumCode}`);
    }
  };

  const handleStartDailyChallenge = () => {
    if (nextAction) {
      router.push(`/solve?skillId=${nextAction.skillId}`);
    } else {
      router.push('/diagnostic');
    }
  };

  if (!isMounted || profileQuery.isLoading) {
    return <StudentDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-canvas-gradient py-4 sm:py-8 px-2 sm:px-4 flex justify-center text-ink selection:bg-surface-cream selection:text-ink">
      {/* APP SHELL: ~1320px container, 28px radius, 2px border, soft diffuse shadow */}
      <div className="w-full max-w-[1320px] rounded-[28px] border-2 border-ink bg-surface-white dark:bg-[#15171C] shadow-shell overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[850px]">
          {/* ============================================================= */}
          {/* 1. LEFT SIDEBAR (~230px, separated by dashed vertical border) */}
          {/* ============================================================= */}
          <div className="lg:w-[230px] shrink-0 border-b-2 lg:border-b-0 lg:border-r-2 border-dashed border-ink/40 bg-surface-white dark:bg-[#15171C]">
            <StudentSidebar
              studentName={studentName}
              roleCaption={rollNumber ? `Roll #${rollNumber} • Trainee` : 'Student • Trainee'}
              activeTab={activeTab}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                if (tab === 'quizzes') {
                  router.push('/diagnostic');
                }
              }}
            />
          </div>

          {/* ============================================================= */}
          {/* 2. MAIN CONTENT COLUMN (~630px desktop)                        */}
          {/* ============================================================= */}
          <div className="flex-1 lg:max-w-[700px] xl:max-w-[720px] p-4 sm:p-6 lg:p-7 space-y-6 border-b-2 lg:border-b-0 lg:border-r-2 border-dashed border-ink/40 overflow-y-auto">
            {/* Top Bar */}
            <StudentTopBar
              pageTitle={activeTab === 'learning' ? 'My Learning' : 'Dashboard'}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedClass={activeClass}
              enrolledClasses={activeClasses}
              onSelectClass={handleSelectClass}
            />

            {/* Pending Teacher Approval Alert Banner */}
            {pendingClasses.length > 0 && (
              <div className="rounded-2xl border-2 border-ink bg-surface-cream p-3.5 flex items-start gap-3 shadow-xs">
                <Clock className="h-5 w-5 shrink-0 text-primary-orange mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-ink">
                    {t('pendingApprovalBanner', { count: pendingClasses.length })}
                  </p>
                  <p className="text-text-secondary leading-relaxed">
                    {t('pendingApprovalBannerDesc')}
                  </p>
                </div>
              </div>
            )}

            {/* View Mode Switch based on active tab */}
            {activeTab === 'learning' ? (
              /* MY LEARNING / ENROLLED CLASSES VIEW */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-ink dark:text-white">
                      Enrolled NCERT Classes
                    </h2>
                    <p className="text-xs text-text-secondary dark:text-muted-foreground mt-0.5">
                      Select a classroom to view chapters and track mastery
                    </p>
                  </div>
                  <Link
                    href="/join"
                    className={buttonVariants({
                      variant: 'orange',
                      size: 'sm',
                      className: 'rounded-full font-bold text-xs',
                    })}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Join Class
                  </Link>
                </div>

                {/* Enrolled Class Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {enrolledClasses.map((cls) => {
                    const isApproved = cls.status === 'active';
                    const isCurrent = activeClass?.classId === cls.classId;
                    return (
                      <div
                        key={cls.classId}
                        className={`rounded-card border-2 border-ink p-4 flex flex-col justify-between transition-all ${
                          isCurrent
                            ? 'bg-surface-cream shadow-card'
                            : 'bg-surface-white dark:bg-card hover:bg-surface-peach/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/75 bg-surface-white dark:bg-muted px-2 py-0.5 rounded-full border border-ink/30">
                              Grade {cls.grade}-{cls.section}
                            </span>
                            {isApproved ? (
                              <Badge
                                variant="default"
                                size="sm"
                                className="bg-emerald-600 text-white font-bold text-[10px]"
                              >
                                Approved
                              </Badge>
                            ) : (
                              <Badge
                                variant="warning"
                                size="sm"
                                className="bg-surface-yellow text-ink border border-ink font-bold text-[10px]"
                              >
                                Pending
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-extrabold text-base text-ink dark:text-white">
                            {cls.name}
                          </h3>
                          <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 text-primary-orange" />
                            {cls.teacherName || 'Assigned Educator'}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-ink/20">
                          {isApproved ? (
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectClass(cls.classId);
                                setActiveTab('dashboard');
                              }}
                              className="w-full py-2 px-3 rounded-full border-2 border-ink bg-primary-orange hover:bg-primary-orange-dark text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <span>Enter Classroom</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <div className="text-center text-[11px] text-text-secondary font-medium">
                              Awaiting teacher approval
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* DASHBOARD MAIN RHYTHM FROM design.md */
              <>
                {/* 1. Greeting Row (Full Width) */}
                <GreetingBanner studentName={firstName} streakDays={9} bonusXp={150} />

                {/* 2. Four Equal Stat Tiles (4-Column Grid) */}
                <StatTiles xp={1320} levelTitle="Trainee" streakDays={9} rank={10} />

                {/* 3. Course Progress Card (Full Width) */}
                <CourseProgressCard
                  courseTitle={
                    activeClass
                      ? `${activeClass.name} (Grade ${activeClass.grade})`
                      : 'NCERT Mathematics (Class 8)'
                  }
                  moduleLabel="Module 4 of 6"
                  items={[
                    {
                      id: 'alg',
                      title: 'Algebraic Expressions & Identities',
                      percentage: 68,
                      xpReward: 120,
                    },
                    {
                      id: 'lin',
                      title: 'Linear Equations in One Variable',
                      percentage: 84,
                      xpReward: 150,
                    },
                  ]}
                  onContinue={handleContinueCourse}
                />

                {/* 4. Two Cards Side-by-Side: Today's Challenge | Learning Efficiency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TodayChallengeCard xpReward={50} onStartChallenge={handleStartDailyChallenge} />
                  <LearningEfficiencyCard
                    efficiencyRate={73}
                    accuracyDelta="+4%"
                    activeDaysDelta="−1"
                  />
                </div>

                {/* 5. Adaptive Curriculum Chapter Explorer (Interactive NCERT Syllabus) */}
                <div className="pt-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-ink dark:text-white">
                        Curriculum Chapters & Mastery
                      </h3>
                      <p className="text-xs text-text-secondary dark:text-muted-foreground mt-0.5">
                        Track your BKT skill mastery states aligned with NCERT
                      </p>
                    </div>

                    <Link
                      href={`/diagnostic?curriculum=${activeClass?.curriculumCode || 'NCERT-MATH-C8'}`}
                      className="text-xs font-bold text-primary-orange hover:underline flex items-center gap-1"
                    >
                      Diagnostic Test →
                    </Link>
                  </div>

                  {/* Chapter Filter Pills */}
                  {topics.length > 0 && (
                    <div
                      className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
                      role="tablist"
                      aria-label="Filter chapters"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={selectedTopic === 'all'}
                        onClick={() => setSelectedTopic('all')}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer border-2 border-ink ${
                          selectedTopic === 'all'
                            ? 'bg-primary-orange text-white shadow-xs'
                            : 'bg-surface-white dark:bg-card text-ink dark:text-white hover:bg-surface-cream'
                        }`}
                      >
                        All Chapters ({topics.length})
                      </button>

                      {topics.map((topic) => {
                        const isSelected = selectedTopic === topic.code;
                        const count = skillsByTopic[topic.code]?.length ?? 0;
                        return (
                          <button
                            key={topic.id}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            onClick={() => setSelectedTopic(topic.code)}
                            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer border-2 border-ink ${
                              isSelected
                                ? 'bg-primary-orange text-white shadow-xs'
                                : 'bg-surface-white dark:bg-card text-ink dark:text-white hover:bg-surface-cream'
                            }`}
                          >
                            {topic.name} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Skill Cards Grid */}
                  <div className="space-y-3">
                    {filteredSkills.slice(0, 6).map((skill: SkillItem) => (
                      <div
                        key={skill.id}
                        className="rounded-2xl border-2 border-ink bg-surface-white dark:bg-card p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:translate-x-1 transition-transform"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-text-secondary">
                              {skill.code}
                            </span>
                            {getMasteryBadge(skill.state)}
                          </div>
                          <h4 className="font-bold text-sm text-ink dark:text-white">
                            {skill.name}
                          </h4>
                          <span className="text-[11px] text-text-secondary">
                            {skill.topicName} • {skill.attemptsCount} attempts
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/learn?skillId=${skill.id}`}
                            className={buttonVariants({
                              variant: 'outline',
                              size: 'sm',
                              className:
                                'rounded-full border-2 border-ink text-xs font-bold px-3 py-1 text-ink dark:text-white hover:bg-surface-cream',
                            })}
                          >
                            Learn
                          </Link>
                          <Link
                            href={`/solve?skillId=${skill.id}`}
                            className={buttonVariants({
                              variant: 'orange',
                              size: 'sm',
                              className: 'rounded-full text-xs font-bold px-3 py-1',
                            })}
                          >
                            Solve
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ============================================================= */}
          {/* 3. RIGHT COLUMN (~330px desktop): Calendar & Leaderboard       */}
          {/* ============================================================= */}
          <div className="w-full lg:w-[330px] xl:w-[340px] shrink-0 p-4 sm:p-6 space-y-6 bg-surface-white dark:bg-[#15171C]">
            {/* Monthly Activity Calendar in Butter-Yellow */}
            <MonthlyCalendarCard monthName="November" maxStreak={9} />

            {/* Leaderboard with 3-tier Podium & Inverted "You" Row */}
            <LeaderboardCard
              currentUserName={studentName}
              currentUserRank={10}
              currentUserXp={1320}
              currentUserStreak={9}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentHomePage(): React.JSX.Element {
  return (
    <React.Suspense fallback={<StudentDashboardSkeleton />}>
      <StudentHomeContent />
    </React.Suspense>
  );
}
