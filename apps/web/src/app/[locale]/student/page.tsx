'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Skeleton,
} from '@bodhai/ui';
import {
  BookOpen,
  GraduationCap,
  Lock,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Plus,
  RefreshCw,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAuthToken, getWebApiClient } from '@/lib/api-client';
import { useSkillMap, type MasteryState, type SkillItem } from '@/hooks/useSkillMap';

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

export default function StudentHomePage(): React.JSX.Element {
  const t = useTranslations('skillMap');
  const router = useRouter();
  const apiClient = getWebApiClient();

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

  // Track client hydration mounting to prevent SSR hydration mismatch
  const [isMounted, setIsMounted] = React.useState(false);

  // Primary view state: 'classes' (all enrolled classes hub) vs 'classroom' (exploring single class)
  const [viewMode, setViewMode] = React.useState<'classes' | 'classroom'>('classes');

  const [selectedClassId, setSelectedClassId] = React.useState<string>('');

  React.useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bodhai_selected_class_id');
      if (saved) {
        setSelectedClassId(saved);
      }
    }
  }, []);

  const activeClass = React.useMemo(() => {
    if (!enrolledClasses.length) return null;
    return (
      enrolledClasses.find((c) => c.classId === selectedClassId) ||
      enrolledClasses.find((c) => c.status === 'active') ||
      enrolledClasses[0]
    );
  }, [enrolledClasses, selectedClassId]);

  const rawProfile = profileQuery.data?.profile as Record<string, unknown> | undefined;

  const enrolledCurriculum =
    activeClass?.curriculumCode ||
    (typeof rawProfile?.curriculumCode === 'string' ? rawProfile.curriculumCode : undefined) ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('bodhai_student_curriculum') || 'NCERT-MATH-C8'
      : 'NCERT-MATH-C8');

  // Keep localStorage in sync when active classroom changes
  React.useEffect(() => {
    if (activeClass && typeof window !== 'undefined') {
      localStorage.setItem('bodhai_student_curriculum', activeClass.curriculumCode);
      localStorage.setItem('bodhai_selected_class_id', activeClass.classId);
    }
  }, [activeClass]);

  // Handle student clicking "Enter Classroom"
  const handleEnterClass = (cls: EnrolledClassroom) => {
    setSelectedClassId(cls.classId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bodhai_selected_class_id', cls.classId);
      localStorage.setItem('bodhai_student_curriculum', cls.curriculumCode);
    }
    setViewMode('classroom');
  };

  const handleBackToClasses = () => {
    setViewMode('classes');
  };

  // Only query curriculum skills if the active class is approved
  const isClassActive = activeClass?.status === 'active';
  const { topics, skills, skillsByTopic, summary, nextAction, isLoading, error, refetch } =
    useSkillMap(isClassActive ? enrolledCurriculum : undefined);

  const [selectedTopic, setSelectedTopic] = React.useState<string>('all');

  const filteredSkills = React.useMemo(() => {
    if (selectedTopic === 'all') return skills;
    return skillsByTopic[selectedTopic] ?? [];
  }, [selectedTopic, skills, skillsByTopic]);

  const activeClasses = enrolledClasses.filter((c) => c.status === 'active');
  const pendingClasses = enrolledClasses.filter((c) => c.status === 'pending');

  const studentName = String(rawProfile?.name || rawProfile?.username || 'Student');

  const rollNumber = rawProfile?.rollNumber ? String(rawProfile.rollNumber) : undefined;

  const getMasteryBadge = (state: MasteryState) => {
    switch (state) {
      case 'mastered':
        return (
          <Badge
            variant="default"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-0.5 px-2.5"
          >
            {t('stateMastered')}
          </Badge>
        );
      case 'partial':
        return (
          <Badge
            variant="warning"
            size="sm"
            className="bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30 font-medium text-xs py-0.5 px-2.5"
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
            className="text-muted-foreground border-border font-normal text-xs py-0.5 px-2.5"
          >
            {t('stateNotLearned')}
          </Badge>
        );
    }
  };

  // Profile or classroom data loading skeleton (rendered during SSR and client data calibration)
  if (!isMounted || profileQuery.isLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-10 space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE 1: "MY ENROLLED CLASSES" HUB
  // Mention all classes first so student can see enrolled status & enter approved ones
  // =========================================================================
  if (viewMode === 'classes') {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-10 space-y-8">
        {/* Hub Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <GraduationCap className="h-3.5 w-3.5" />
                Student Learning Portal
              </span>
              {rollNumber && (
                <span className="text-xs font-mono text-muted-foreground">Roll #{rollNumber}</span>
              )}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              My Enrolled Classes
            </h1>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground">
              Welcome, <span className="font-semibold text-foreground">{studentName}</span>. Select
              an approved classroom below to start learning.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/join">
              <Button
                variant="primary"
                size="sm"
                className="min-h-[42px] px-4 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Join Another Class
              </Button>
            </Link>
            <Link href="/profile">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[42px] text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
              >
                My Profile
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Counts Overview */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Card className="p-4 shadow-xs text-center border-border/80">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Enrolled Classes
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-1 block">
              {enrolledClasses.length}
            </span>
          </Card>
          <Card className="p-4 shadow-xs text-center border-emerald-500/20 bg-emerald-500/5">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
              Approved & Active
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-emerald-800 dark:text-emerald-200 mt-1 block">
              {activeClasses.length}
            </span>
          </Card>
          <Card className="p-4 shadow-xs text-center border-amber-500/20 bg-amber-500/5">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
              Awaiting Approval
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-bold text-amber-800 dark:text-amber-200 mt-1 block">
              {pendingClasses.length}
            </span>
          </Card>
        </div>

        {/* Pending Teacher Approval Alert Banner */}
        {pendingClasses.length > 0 && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <Clock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-semibold text-base">
                Teacher Approval Pending for {pendingClasses.length} Classroom
                {pendingClasses.length > 1 ? 's' : ''}
              </p>
              <p className="text-amber-800/90 dark:text-amber-300/90 text-xs sm:text-sm leading-relaxed">
                Your educator must accept your enrollment request before tests, lessons, and skill
                maps unlock. Please notify your teacher to approve your request in their teacher
                dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Empty State: Not enrolled in any class */}
        {enrolledClasses.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center border-dashed border-border/80">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BookOpen className="h-8 w-8" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground">
              You Have Not Joined Any Class Yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Ask your teacher for a 6-character Class Join Code to enroll in your class and start
              your learning journey.
            </p>
            <div className="mt-6">
              <Link href="/join">
                <Button variant="primary" size="lg" className="min-h-[48px] px-8 font-bold">
                  <Plus className="mr-2 h-4 w-4" />
                  Join Class with Code
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          /* Enrolled Classes Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enrolledClasses.map((cls) => {
              const isApproved = cls.status === 'active';
              return (
                <Card
                  key={cls.classId}
                  className={`flex flex-col justify-between transition-all overflow-hidden border ${
                    isApproved
                      ? 'border-border hover:border-primary/50 hover:shadow-card bg-card'
                      : 'border-amber-500/30 bg-amber-500/5'
                  }`}
                >
                  <CardHeader className="p-6 pb-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          size="sm"
                          className="font-medium text-xs py-0.5 px-2 bg-background/80"
                        >
                          Grade {cls.grade} • Sec {cls.section}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {cls.curriculumCode}
                        </span>
                      </div>

                      {isApproved ? (
                        <Badge
                          variant="default"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-0.5 px-2.5 flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge
                          variant="warning"
                          size="sm"
                          className="bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 font-semibold text-xs py-0.5 px-2.5 flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          Awaiting Approval
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="font-serif text-2xl font-bold text-foreground">
                      {cls.name}
                    </CardTitle>

                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                        <UserCheck className="h-4 w-4 text-primary" />
                        Educator: {cls.teacherName || 'Assigned Teacher'}
                      </div>
                      {cls.joinCode && (
                        <div className="text-xs font-mono text-muted-foreground pt-0.5">
                          Class Code:{' '}
                          <span className="font-bold text-foreground tracking-wider">
                            {cls.joinCode}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="px-6 py-2">
                    {isApproved ? (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Full access granted. Explore curriculum competencies, take adaptive
                        assessments, and practice lessons.
                      </p>
                    ) : (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed flex items-start gap-2">
                        <Lock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <span>
                          Access is locked while your teacher verifies your join request. Lessons
                          and tests will unlock as soon as your teacher approves you.
                        </span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-6 pt-4 border-t border-border/50">
                    {isApproved ? (
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleEnterClass(cls)}
                        className="w-full min-h-[46px] font-bold text-sm shadow-xs cursor-pointer flex items-center justify-center gap-2"
                      >
                        Enter Classroom
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <div className="w-full space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled
                          className="w-full min-h-[46px] font-medium text-sm cursor-not-allowed opacity-60 border-dashed text-muted-foreground flex items-center justify-center gap-2"
                        >
                          <Lock className="h-4 w-4" />
                          Awaiting Teacher Approval
                        </Button>
                        <p className="text-center text-[11px] text-muted-foreground">
                          Ask your educator to approve your enrollment in their teacher dashboard
                        </p>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE 2: CLASSROOM VIEW (Single Active Class Explorer)
  // Guarded strictly by teacher approval: if pending, show locked access gate!
  // =========================================================================

  // If the active class is pending, render the access locked gate
  if (!isClassActive) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16 text-center space-y-6">
        <Card className="p-8 border-amber-500/40 bg-amber-500/5 shadow-card">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Lock className="h-8 w-8" />
          </div>
          <CardHeader className="p-0 mb-4">
            <Badge
              variant="warning"
              className="mx-auto mb-2 text-xs py-1 px-3 bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40"
            >
              Approval Required
            </Badge>
            <CardTitle className="font-serif text-2xl font-bold text-foreground">
              Classroom Access Locked
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Your educator{' '}
              <span className="font-semibold text-foreground">
                {activeClass?.teacherName || 'Teacher'}
              </span>{' '}
              has not yet accepted your join request for{' '}
              <span className="font-semibold text-foreground">{activeClass?.name}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 mb-6 text-xs text-muted-foreground leading-relaxed">
            Under DPDP Act compliance and classroom safety protocols, students can only access
            competency maps, diagnostic assessments, and practice questions once approved by the
            educator.
          </CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={handleBackToClasses}
              className="w-full sm:w-auto min-h-[44px] px-6 font-semibold cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to My Classes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => profileQuery.refetch()}
              className="w-full sm:w-auto min-h-[44px] px-6 font-medium cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Check Status
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Classroom skill map loading state
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  // Error loading curriculum
  if (error) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <Card className="p-6 border-destructive/30">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold">{t('emptyState')}</CardTitle>
            <CardDescription className="text-sm text-destructive mt-1">
              {error.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              variant="primary"
              onClick={refetch}
              className="w-full min-h-[44px] cursor-pointer"
            >
              Try Again
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleBackToClasses}
              className="w-full min-h-[44px] cursor-pointer"
            >
              ← Back to My Classes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-10 space-y-8">
      {/* Top Classroom Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBackToClasses}
            className="min-h-[40px] text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            All Classes
          </Button>

          {/* Quick Classroom Switcher if multiple active classes */}
          {activeClasses.length > 1 ? (
            <select
              aria-label="Select Enrolled Classroom"
              value={activeClass?.classId || ''}
              onChange={(e) => {
                const target = enrolledClasses.find((c) => c.classId === e.target.value);
                if (target) handleEnterClass(target);
              }}
              className="rounded-lg border border-primary/30 bg-background px-3 py-1.5 text-xs font-bold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer max-w-[220px] sm:max-w-xs truncate"
            >
              {activeClasses.map((cls) => (
                <option key={cls.classId} value={cls.classId}>
                  {cls.name} ({cls.teacherName || 'Teacher'})
                </option>
              ))}
            </select>
          ) : (
            <div className="font-serif text-lg font-bold text-foreground">{activeClass?.name}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/diagnostic">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px] text-xs font-semibold cursor-pointer border-primary/30 text-primary hover:bg-primary/10"
            >
              Diagnostic
            </Button>
          </Link>
          <Link href="/progress">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px] text-xs font-medium cursor-pointer"
            >
              Progress
            </Button>
          </Link>
          <Link href="/profile">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px] text-xs font-medium cursor-pointer"
            >
              Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Classroom Banner */}
      <div className="rounded-2xl border border-primary/20 bg-card p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="default"
              size="sm"
              className="bg-emerald-600 text-white font-semibold text-xs py-0.5 px-2"
            >
              Active Classroom
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {activeClass?.curriculumCode}
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-foreground">{activeClass?.name}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Educator:{' '}
            <span className="font-medium text-foreground">
              {activeClass?.teacherName || 'Teacher'}
            </span>{' '}
            • Grade {activeClass?.grade} Section {activeClass?.section}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <Link href="/diagnostic">
            <Button
              variant="primary"
              size="sm"
              className="text-xs font-bold min-h-[38px] cursor-pointer shadow-xs"
            >
              Start Diagnostic Test →
            </Button>
          </Link>
        </div>
      </div>

      {/* SINGLE CLEAR 'NEXT' ACTION CARD */}
      {nextAction && (
        <section
          aria-labelledby="next-action-heading"
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6 sm:p-8 shadow-card"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge
                  variant="default"
                  size="sm"
                  className="font-semibold text-xs uppercase tracking-wider py-1 px-3"
                >
                  {t('nextActionBadge')}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  {nextAction.skillCode}
                </span>
              </div>
              <h2
                id="next-action-heading"
                className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
              >
                {nextAction.skillName}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {nextAction.rationale}
              </p>
            </div>

            <div className="w-full md:w-auto shrink-0">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => {
                  if (nextAction.actionType === 'test') {
                    router.push(`/test?skillId=${nextAction.skillId}`);
                  } else if (nextAction.actionType === 'solve') {
                    router.push(`/solve?skillId=${nextAction.skillId}`);
                  } else {
                    router.push(`/learn?skillId=${nextAction.skillId}`);
                  }
                }}
                className="w-full md:w-auto min-h-[50px] px-8 text-base font-semibold shadow-elevated cursor-pointer"
              >
                {nextAction.actionType === 'test'
                  ? t('startTest')
                  : nextAction.actionType === 'solve'
                    ? t('startSolve')
                    : t('startLesson')}{' '}
                →
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Mastery States Summary Statistics */}
      <section
        aria-label="Mastery Status Summary"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
      >
        <Card className="p-4 shadow-xs text-center border-border/80">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
            {t('totalSkills')}
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-1 block">
            {summary.totalCount}
          </span>
        </Card>

        <Card className="p-4 shadow-xs text-center border-emerald-500/20 bg-emerald-500/5">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
            {t('masteredCount')}
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-emerald-800 dark:text-emerald-200 mt-1 block">
            {summary.masteredCount}
          </span>
        </Card>

        <Card className="p-4 shadow-xs text-center border-amber-500/20 bg-amber-500/5">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
            {t('partialCount')}
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-amber-800 dark:text-amber-200 mt-1 block">
            {summary.partialCount}
          </span>
        </Card>

        <Card className="p-4 shadow-xs text-center border-border/80">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
            {t('notLearnedCount')}
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-muted-foreground mt-1 block">
            {summary.notLearnedCount}
          </span>
        </Card>
      </section>

      {/* Topic Filter Pills */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
        role="tablist"
        aria-label="Filter topics"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedTopic === 'all'}
          onClick={() => setSelectedTopic('all')}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            selectedTopic === 'all'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted/70 text-muted-foreground hover:bg-muted'
          }`}
        >
          {t('filterAll')} ({skills.length})
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
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted'
              }`}
            >
              {topic.name} ({count})
            </button>
          );
        })}
      </div>

      {/* SKILL MAP GRID — SHOWING THE THREE MASTERY STATES */}
      <section aria-label="Curriculum Skills Map" className="space-y-4">
        {filteredSkills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            {t('emptyState')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredSkills.map((skill: SkillItem) => (
              <Card
                key={skill.id}
                className="flex flex-col justify-between p-5 transition-all hover:border-primary/40 hover:shadow-card focus-within:ring-2 focus-within:ring-primary"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{skill.code}</span>
                    {getMasteryBadge(skill.state)}
                  </div>

                  <h3 className="font-serif text-lg font-bold text-foreground leading-snug">
                    {skill.name}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span>{skill.topicName}</span>
                    <span>•</span>
                    <span>{t('attemptsLabel', { count: skill.attemptsCount })}</span>
                  </div>
                </div>

                {/* Direct Action Links for Mobile Touch Targets */}
                <div className="flex items-center gap-2 pt-5 border-t border-border/60 mt-4">
                  <Link href={`/learn?skillId=${skill.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full min-h-[42px] text-xs font-medium cursor-pointer"
                    >
                      {t('startLesson')}
                    </Button>
                  </Link>

                  <Link href={`/solve?skillId=${skill.id}`} className="flex-1">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full min-h-[42px] text-xs font-semibold cursor-pointer"
                    >
                      {t('startSolve')}
                    </Button>
                  </Link>

                  <Link
                    href={`/test?skillId=${skill.id}`}
                    className="shrink-0"
                    title={t('startTest')}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[42px] px-3 text-xs font-medium cursor-pointer text-emerald-700 dark:text-emerald-400 hover:border-emerald-500"
                    >
                      Test
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
