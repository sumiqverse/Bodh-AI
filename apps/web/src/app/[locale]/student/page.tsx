'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { Badge, Skeleton, buttonVariants } from '@bodhai/ui';
import { Clock, ArrowRight, Plus, UserCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthToken, getCurrentUser, getWebApiClient } from '@/lib/api-client';
import { useSkillMap, type MasteryState, type SkillItem } from '@/hooks/useSkillMap';

// Gamified Dashboard Components from design.md
import {
  StudentSidebar,
  StudentTopBar,
  GreetingBanner,
  StatTiles,
  CourseProgressCard,
  LearningEfficiencyCard,
  MonthlyCalendarCard,
  LeaderboardCard,
} from '@/components/gamified';
import { useStudentGamification } from '@/hooks/useStudentGamification';
import { useProgressHistory } from '@/hooks/useProgressHistory';

export interface EnrolledClassroom {
  classId: string;
  name: string;
  grade: number;
  section: string;
  academicYear?: string;
  curriculumCode: string;
  status: 'active' | 'pending';
  diagnosticStatus?: 'pending' | 'skipped' | 'in_progress' | 'completed';
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
  const [mounted, setMounted] = React.useState<boolean>(false);
  const router = useRouter();

  React.useEffect(() => {
    setMounted(true);
    const checkAuth = () => {
      if (typeof window !== 'undefined' && !getAuthToken()) {
        window.location.href = '/';
      }
    };
    checkAuth();
    window.addEventListener('bodhai_auth_change', checkAuth);
    return () => {
      window.removeEventListener('bodhai_auth_change', checkAuth);
    };
  }, []);

  const t = useTranslations('skillMap');
  const searchParams = useSearchParams();
  const apiClient = getWebApiClient();
  const queryClient = useQueryClient();
  const [diagnosticError, setDiagnosticError] = React.useState<string | null>(null);

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
    return [];
  }, [profileQuery.data?.profile]);

  const activeClasses = enrolledClasses.filter((c) => c.status === 'active');
  const pendingClasses = enrolledClasses.filter((c) => c.status === 'pending');

  // Currently focused classroom (from URL or first active class)
  const activeClass = React.useMemo(() => {
    if (classIdParam && enrolledClasses.length) {
      const match = enrolledClasses.find(
        (c) => c.classId === classIdParam && c.status === 'active',
      );
      if (match) return match;
    }
    return activeClasses[0] || null;
  }, [classIdParam, enrolledClasses, activeClasses]);

  const currentUser = typeof window !== 'undefined' ? getCurrentUser() : null;
  const rawProfile = profileQuery.data?.profile as Record<string, unknown> | undefined;
  const studentName = String(
    rawProfile?.fullName ||
      rawProfile?.name ||
      rawProfile?.username ||
      currentUser?.full_name ||
      currentUser?.username ||
      'Student',
  );
  const firstName = studentName.split(' ')[0] || studentName || 'Student';
  const rollNumber = rawProfile?.rollNumber ? String(rawProfile.rollNumber) : undefined;
  const studentId = rawProfile?.id ? String(rawProfile.id) : currentUser?.id || undefined;

  // Real Classroom Leaderboard Query directly connected to enrolled classroom
  const leaderboardQuery = useQuery({
    queryKey: ['class-leaderboard', activeClass?.classId],
    queryFn: () => apiClient.getClassLeaderboard(activeClass!.classId, token || undefined),
    enabled: activeClass?.status === 'active' && !!activeClass.classId && !!token,
    staleTime: 30 * 1000,
  });

  const achievementsQuery = useQuery({
    queryKey: ['student-achievements', activeClass?.classId],
    queryFn: () => apiClient.getMyClassAchievements(activeClass!.classId, token || undefined),
    enabled: activeClass?.status === 'active' && !!activeClass.classId && !!token,
  });

  const assignmentsQuery = useQuery({
    queryKey: ['student-assignments', activeClass?.classId],
    queryFn: () => apiClient.getMyClassAssignments(activeClass!.classId, token || undefined),
    enabled: activeClass?.status === 'active' && !!activeClass.classId && !!token,
  });

  // Real Dynamic Gamification & Telemetry Store
  const gamification = useStudentGamification({
    studentId,
    studentName,
    realLeaderboardData: leaderboardQuery.data,
  });

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
  const activeCurriculumCode = isClassActive ? activeClass?.curriculumCode : undefined;
  const { topics, skills, skillsByTopic, nextAction } = useSkillMap(
    activeCurriculumCode,
    activeClass?.classId,
  );
  const { stats: progressStats } = useProgressHistory(
    activeCurriculumCode || 'NCERT-MATH-C8',
    activeClass?.classId,
  );

  // Dynamic curriculum progress calculation
  const totalSkillsCount = skills.length;
  const masteredSkillsCount = skills.filter((s) => s.state === 'mastered').length;
  const partialSkillsCount = skills.filter((s) => s.state === 'partial').length;
  const notLearnedSkillsCount = skills.filter((s) => s.state === 'not_learned').length;

  const overallProgressPercentage =
    totalSkillsCount > 0 ? Math.round((masteredSkillsCount / totalSkillsCount) * 100) : 0;

  const activeTopic = React.useMemo(() => {
    if (nextAction) {
      const match = skills.find(
        (s) => s.id === nextAction.skillId || s.code === nextAction.skillCode,
      );
      if (match) {
        const t = topics.find((top) => top.code === match.topicCode);
        if (t) return t;
      }
    }
    return topics[0] || null;
  }, [nextAction, skills, topics]);

  const activeTopicSkills = activeTopic ? (skillsByTopic[activeTopic.code] ?? []) : [];
  const activeTopicMastered = activeTopicSkills.filter((s) => s.state === 'mastered').length;
  const activeTopicPercentage =
    activeTopicSkills.length > 0
      ? Math.round((activeTopicMastered / activeTopicSkills.length) * 100)
      : 0;

  const activeTopicIndex = activeTopic
    ? Math.max(1, topics.findIndex((t) => t.id === activeTopic.id) + 1)
    : 0;
  const totalTopicsCount = topics.length;
  const moduleLabel = `Chapter ${activeTopicIndex} of ${totalTopicsCount}`;

  const courseProgressItems = [
    {
      id: activeTopic?.code || 'active_mod',
      title: activeTopic?.name || 'No chapter available',
      percentage: activeTopicPercentage,
    },
    {
      id: 'overall_curriculum',
      title: 'Overall Curriculum Mastery',
      percentage: overallProgressPercentage,
    },
  ];

  const quizAccuracyRate = progressStats.totalAttempts > 0 ? progressStats.overallAccuracy : 0;

  const activeLearningPct =
    totalSkillsCount > 0 ? Math.round((partialSkillsCount / totalSkillsCount) * 100) : 0;
  const incompleteTasksPct =
    totalSkillsCount > 0 ? Math.round((notLearnedSkillsCount / totalSkillsCount) * 100) : 0;

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

  if (!mounted || !token) {
    return <StudentDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-canvas-gradient py-4 sm:py-8 px-2 sm:px-4 flex justify-center text-ink selection:bg-surface-cream selection:text-ink">
      {/* APP SHELL: ~1320px container, 28px radius, 2px border, soft diffuse shadow */}
      <div className="w-full max-w-[1320px] rounded-[28px] border-2 border-ink bg-surface-white dark:bg-[#15171C] shadow-shell overflow-hidden">
        <div className="flex flex-col xl:flex-row min-h-[850px]">
          {/* ============================================================= */}
          {/* 1. LEFT SIDEBAR (~230px, separated by dashed vertical border) */}
          {/* ============================================================= */}
          <div className="xl:w-[230px] shrink-0 border-b-2 xl:border-b-0 xl:border-r-2 border-dashed border-ink/40 bg-surface-white dark:bg-[#15171C]">
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
          <div className="flex-1 min-w-0 w-full p-4 sm:p-6 lg:p-7 space-y-6 border-b-2 xl:border-b-0 xl:border-r-2 border-dashed border-ink/40 overflow-y-auto">
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

            {activeClass &&
              (activeClass.diagnosticStatus === 'pending' ||
                activeClass.diagnosticStatus === 'in_progress') && (
                <div className="rounded-card border-2 border-ink bg-surface-cream p-4 space-y-3">
                  <p className="font-bold">
                    {activeClass.diagnosticStatus === 'in_progress'
                      ? 'Continue your diagnostic'
                      : 'Start with a diagnostic?'}
                  </p>
                  <p className="text-sm">
                    Answer 20 questions to help tailor learning for this classroom.
                  </p>
                  {diagnosticError && (
                    <p role="alert" className="text-sm text-red-700">
                      {diagnosticError}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Link
                      className="font-bold text-primary-orange"
                      href={`/diagnostic?curriculum=${encodeURIComponent(activeClass.curriculumCode)}&classId=${activeClass.classId}`}
                    >
                      Start or resume
                    </Link>
                    {activeClass.diagnosticStatus === 'pending' && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setDiagnosticError(null);
                            await apiClient.skipClassDiagnostic(
                              activeClass.classId,
                              token || undefined,
                            );
                            await queryClient.invalidateQueries({
                              queryKey: ['student-profile-me'],
                            });
                          } catch {
                            setDiagnosticError('Could not save your choice. Please try again.');
                          }
                        }}
                      >
                        Skip for now
                      </button>
                    )}
                  </div>
                </div>
              )}

            {/* View Mode Switch based on active tab */}
            {activeTab === 'achievements' || activeTab === 'certifications' ? (
              <section className="rounded-card border-2 border-ink p-5 space-y-3">
                <h2 className="text-lg font-bold">
                  {activeTab === 'achievements' ? 'Achievements' : 'Certificates'}
                </h2>
                {!activeClass ? (
                  <p>Join an approved classroom to see your awards.</p>
                ) : achievementsQuery.isLoading ? (
                  <p>Loading awards…</p>
                ) : achievementsQuery.isError ? (
                  <p>Could not load awards.</p>
                ) : (
                  <>
                    {achievementsQuery.data?.filter(
                      (award) =>
                        award.kind === (activeTab === 'achievements' ? 'badge' : 'certificate'),
                    ).length ? (
                      achievementsQuery.data
                        .filter(
                          (award) =>
                            award.kind === (activeTab === 'achievements' ? 'badge' : 'certificate'),
                        )
                        .map((award) => (
                          <div key={award.id} className="border-t border-ink/20 pt-3">
                            <p className="font-bold">{award.title}</p>
                            {award.kind === 'certificate' && activeClass && (
                              <Link
                                className="text-primary-orange underline"
                                href={`/certificate/${award.id}?classId=${activeClass.classId}`}
                              >
                                View certificate
                              </Link>
                            )}
                            <p className="text-xs">
                              Earned {new Date(award.earned_at).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        ))
                    ) : (
                      <p>No awards earned in this classroom yet.</p>
                    )}
                  </>
                )}
              </section>
            ) : activeTab === 'learning' ? (
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
                {enrolledClasses.length === 0 ? (
                  <div className="rounded-card border-2 border-ink bg-surface-cream/40 p-8 text-center space-y-4 shadow-card">
                    <div className="w-16 h-16 mx-auto rounded-full border-2 border-ink bg-surface-yellow flex items-center justify-center text-3xl shadow-xs">
                      🎒
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-ink dark:text-white">
                        No Classrooms Joined Yet
                      </h3>
                      <p className="text-xs text-text-secondary dark:text-muted-foreground mt-1 max-w-sm mx-auto">
                        Ask your educator for a 6-character Class Code to enroll and unlock
                        personalized NCERT curriculum competencies.
                      </p>
                    </div>
                    <Link
                      href="/join"
                      className={buttonVariants({
                        variant: 'orange',
                        size: 'md',
                        className: 'rounded-full font-bold text-xs shadow-card',
                      })}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Join Classroom with Code
                    </Link>
                  </div>
                ) : (
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
                )}
              </div>
            ) : !activeClass ? (
              <div className="rounded-card border-2 border-ink p-6 text-sm">
                {profileQuery.isLoading
                  ? 'Loading classrooms…'
                  : profileQuery.isError
                    ? 'Could not load your classrooms.'
                    : 'Join a classroom and wait for teacher approval to start learning.'}
                <div className="mt-4">
                  <Link href="/join" className="font-bold text-primary-orange">
                    Join a classroom →
                  </Link>
                </div>
              </div>
            ) : (
              /* DASHBOARD MAIN RHYTHM FROM design.md */
              <>
                {/* 1. Greeting Row (Full Width) */}
                <GreetingBanner studentName={firstName} streakDays={gamification.streakDays} />

                {/* 2. Four Equal Stat Tiles (4-Column Grid) */}
                <StatTiles
                  xp={gamification.xp}
                  levelTitle={gamification.levelTitle}
                  streakDays={gamification.streakDays}
                  rank={gamification.rank}
                />

                {/* 3. Course Progress Card (Full Width) */}
                <CourseProgressCard
                  courseTitle={
                    activeClass
                      ? `${activeClass.name} (Grade ${activeClass.grade})`
                      : activeTopic?.name || 'NCERT Mathematics (Class 8)'
                  }
                  moduleLabel={moduleLabel}
                  items={courseProgressItems}
                  onContinue={handleContinueCourse}
                />

                {/* 4. Two Cards Side-by-Side: Today's Challenge | Learning Efficiency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LearningEfficiencyCard
                    quizAccuracy={quizAccuracyRate}
                    totalAttempts={progressStats.totalAttempts}
                    activeLearning={activeLearningPct}
                    incompleteTasks={incompleteTasksPct}
                  />
                </div>

                <section className="rounded-card border-2 border-ink bg-surface-white dark:bg-card p-5 space-y-3">
                  <h2 className="text-base font-bold">Assignments</h2>
                  {assignmentsQuery.isLoading ? (
                    <p>Loading assignments…</p>
                  ) : assignmentsQuery.isError ? (
                    <p>Could not load assignments.</p>
                  ) : !assignmentsQuery.data?.length ? (
                    <p className="text-sm">No assignments for this classroom yet.</p>
                  ) : (
                    assignmentsQuery.data.map((assignment) => (
                      <div key={assignment.id} className="border-t border-ink/20 pt-3 text-sm">
                        <p className="font-bold">{assignment.title}</p>
                        {assignment.description && <p>{assignment.description}</p>}
                        <p className="text-xs text-text-secondary">
                          {assignment.status.replace('_', ' ')}
                          {assignment.due_date
                            ? ` · Due ${new Date(assignment.due_date).toLocaleDateString('en-IN')}`
                            : ''}
                        </p>
                      </div>
                    ))
                  )}
                </section>

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
          <div className="w-full xl:w-[300px] shrink-0 min-w-0 p-4 sm:p-6 space-y-6 bg-surface-white dark:bg-[#15171C]">
            {/* Monthly Activity Calendar in Butter-Yellow */}
            <MonthlyCalendarCard
              monthName={gamification.currentMonthName}
              maxStreak={gamification.maxStreak}
              todayDate={gamification.todayDate}
              attemptedDays={gamification.attemptedDays}
            />

            {/* Leaderboard with 3-tier Podium & Inverted "You" Row */}
            <LeaderboardCard
              loading={leaderboardQuery.isFetching}
              error={leaderboardQuery.isError}
              topThree={gamification.topThree}
              listLearners={gamification.listLearners}
              currentUserRow={gamification.currentUserRow}
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
