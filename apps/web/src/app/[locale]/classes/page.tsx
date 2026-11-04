'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import {
  Button,
  buttonVariants,
  Input,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@bodhai/ui';
import { getWebApiClient, getAuthToken, getCurrentUser, clearAuthSession } from '@/lib/api-client';
import type {
  ClassResponse,
  ClassDetailResponse,
  StudentRosterItem,
  ClassHeatmapResponse,
  ClassGapClustersResponse,
  ClassEarlyWarningsResponse,
  ClassSuggestionsResponse,
  AssignmentResponse,
  ClassProgressSummaryResponse,
  GapClusterItem,
} from '@bodhai/api-client';

import { ClassHeatmapView } from '@/components/teacher/ClassHeatmapView';
import { GroupGapClustersView } from '@/components/teacher/GroupGapClustersView';
import { EarlyWarningsView } from '@/components/teacher/EarlyWarningsView';
import { SuggestionsDecisionHub } from '@/components/teacher/SuggestionsDecisionHub';
import { AssignmentsView } from '@/components/teacher/AssignmentsView';
import { ProgressReassessmentView } from '@/components/teacher/ProgressReassessmentView';
import { StudentProfileModal } from '@/components/teacher/StudentProfileModal';
import { CurriculumContentHub } from '@/components/teacher/CurriculumContentHub';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  FileSpreadsheet,
  Printer,
  Users,
  BookOpen,
  Target,
  Lightbulb,
} from 'lucide-react';

export default function TeacherDashboardPage(): React.JSX.Element {
  const t = useTranslations('classes');
  const router = useRouter();
  const apiClient = getWebApiClient();

  // Primary state
  const [classesList, setClassesList] = React.useState<ClassResponse[]>([]);
  const [selectedClassId, setSelectedClassId] = React.useState<string>('');
  const [activeTab, setActiveTab] = React.useState<string>('overview');

  // Telemetry state for selected class
  const [classDetail, setClassDetail] = React.useState<ClassDetailResponse | null>(null);
  const [heatmap, setHeatmap] = React.useState<ClassHeatmapResponse | null>(null);
  const [clusters, setClusters] = React.useState<ClassGapClustersResponse | null>(null);
  const [warnings, setWarnings] = React.useState<ClassEarlyWarningsResponse | null>(null);
  const [suggestions, setSuggestions] = React.useState<ClassSuggestionsResponse | null>(null);
  const [assignments, setAssignments] = React.useState<AssignmentResponse[]>([]);
  const [progress, setProgress] = React.useState<ClassProgressSummaryResponse | null>(null);

  // UI state
  const [warningDays, setWarningDays] = React.useState<number>(14);
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);
  const [prefilledCluster, setPrefilledCluster] = React.useState<GapClusterItem | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isCreating, setIsCreating] = React.useState<boolean>(false);
  const [rotatingId, setRotatingId] = React.useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = React.useState<string | null>(null);
  const [codeCopied, setCodeCopied] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // New class form state
  const [className, setClassName] = React.useState<string>('');
  const [grade, setGrade] = React.useState<string>('8');
  const [subject, setSubject] = React.useState<string>('Mathematics');
  const [section, setSection] = React.useState<string>('A');
  const [academicYear] = React.useState<string>('2024-2025');

  // Active selected class object
  const activeClass = React.useMemo(() => {
    return classesList.find((c) => c.id === selectedClassId) ?? classesList[0] ?? null;
  }, [classesList, selectedClassId]);

  // Load telemetry data for active class
  const loadActiveTelemetry = React.useCallback(
    async (classId: string, token: string): Promise<void> => {
      try {
        const [
          detail,
          classHeatmap,
          classClusters,
          classWarnings,
          classSuggestions,
          classAssignments,
          classProgress,
        ] = await Promise.all([
          apiClient.getClassDetails(classId, token),
          apiClient.getClassHeatmap(classId, undefined, token),
          apiClient.getClassGapClusters(classId, undefined, undefined, token),
          apiClient.getClassEarlyWarnings(classId, warningDays, token),
          apiClient.getClassSuggestions(classId, token),
          apiClient.listAssignments(classId, token),
          apiClient.getClassProgressSummary(classId, token),
        ]);
        setClassDetail(detail);
        setHeatmap(classHeatmap);
        setClusters(classClusters);
        setWarnings(classWarnings);
        setSuggestions(classSuggestions);
        setAssignments(classAssignments);
        setProgress(classProgress);
      } catch (err) {
        setClassDetail(null);
        setHeatmap(null);
        setClusters(null);
        setWarnings(null);
        setSuggestions(null);
        setAssignments([]);
        setProgress(null);
        setErrorMessage(err instanceof Error ? err.message : 'Could not load classroom data.');
      }
    },
    [apiClient, warningDays],
  );

  const fetchClasses = React.useCallback(
    async (token: string): Promise<void> => {
      const user = getCurrentUser();
      if (user?.role === 'student') {
        router.replace('/student');
        return;
      }

      const activeToken = token;

      try {
        setIsLoading(true);
        const data = await apiClient.listClasses(activeToken);
        if (data && data.length > 0) {
          const params =
            typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const targetId = params?.get('classId');
          const matchedClass = targetId ? data.find((c) => c.id === targetId) : null;
          const chosen = matchedClass ?? data[0]!;

          setClassesList(data);
          setSelectedClassId(chosen.id);
          void loadActiveTelemetry(chosen.id, activeToken);
        } else {
          // Zero classes: show empty state with Create Class CTA
          setClassesList([]);
          setSelectedClassId('');
          setClassDetail(null);
          setHeatmap(null);
          setClusters(null);
          setWarnings(null);
          setSuggestions(null);
          setAssignments([]);
          setProgress(null);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load classes';
        if (
          msg.includes('401') ||
          msg.toLowerCase().includes('expired') ||
          msg.includes('authenticate')
        ) {
          clearAuthSession();
          router.push('/login?expired=true');
          return;
        }
        if (
          msg.includes('403') ||
          msg.includes('not authorized') ||
          msg.includes("Role 'student'")
        ) {
          router.replace('/student');
          return;
        }
        setErrorMessage(msg);
        setClassesList([]);
        setSelectedClassId('');
      } finally {
        setIsLoading(false);
      }
    },
    [apiClient, loadActiveTelemetry, router],
  );

  React.useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      window.location.href = '/';
      return;
    }
    const user = getCurrentUser();
    if (user && user.role === 'admin') {
      router.push('/admin/stats');
      return;
    }
    if (user && user.role === 'student') {
      router.replace('/student');
      return;
    }
    setIsAuthenticated(true);
    void fetchClasses(token);

    const checkAuth = () => {
      if (!getAuthToken()) {
        window.location.href = '/';
      }
    };
    window.addEventListener('bodhai_auth_change', checkAuth);
    return () => {
      window.removeEventListener('bodhai_auth_change', checkAuth);
    };
  }, [fetchClasses, router]);

  // When selected class changes, load telemetry
  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    const token = getAuthToken();
    if (token) {
      void loadActiveTelemetry(classId, token);
    }
  };

  // Create Class
  const handleCreateClass = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    setErrorMessage(null);
    setIsCreating(true);

    const finalClassName = className.trim()
      ? className.trim().toLowerCase().includes(subject.toLowerCase())
        ? className.trim()
        : `${className.trim()} ${subject}`
      : `Class ${grade}-${section.trim() || 'A'} ${subject}`;

    try {
      const created = await apiClient.createClass(
        {
          name: finalClassName,
          grade: parseInt(grade, 10),
          section: section.trim() || 'A',
          subject,
          academic_year: academicYear.trim(),
        },
        token,
      );
      setClassesList((prev) => [created, ...prev]);
      setSelectedClassId(created.id);
      void loadActiveTelemetry(created.id, token);
      setClassName('');
      setActiveTab('overview');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating class');
    } finally {
      setIsCreating(false);
    }
  };

  // Approve pending student join request
  const handleApprove = async (studentId: string): Promise<void> => {
    const token = getAuthToken();
    if (!token || !selectedClassId) return;

    setActionInProgressId(studentId);
    try {
      await apiClient.approveStudent(selectedClassId, studentId, token);
      setClassDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          students: prev.students.map((s) =>
            s.student_id === studentId ? { ...s, status: 'active' } : s,
          ),
        };
      });
      void loadActiveTelemetry(selectedClassId, token);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error approving student');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Remove student from roster
  const handleRemove = async (studentId: string): Promise<void> => {
    const token = getAuthToken();
    if (!token || !selectedClassId) return;

    setActionInProgressId(studentId);
    try {
      await apiClient.removeStudent(selectedClassId, studentId, token);
      setClassDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          students: prev.students.filter((s) => s.student_id !== studentId),
        };
      });
      void loadActiveTelemetry(selectedClassId, token);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error removing student');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Rotate join code
  const handleRotateCode = async (classId: string): Promise<void> => {
    const token = getAuthToken();
    if (!token) return;

    setRotatingId(classId);
    try {
      const res = await apiClient.rotateClassJoinCode(classId, token);
      setClassesList((prev) =>
        prev.map((c) => (c.id === classId ? { ...c, join_code: res.join_code } : c)),
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not rotate class code.');
    } finally {
      setRotatingId(null);
    }
  };

  // Copy code
  const handleCopyCode = (): void => {
    if (!activeClass) return;
    void navigator.clipboard.writeText(activeClass.join_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Suggestions decisions
  const handleRecordDecision = async (
    suggestionId: string,
    decision: 'accept' | 'edit' | 'ignore' | 'override',
    notes?: string,
  ): Promise<void> => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await apiClient.recordTeacherDecision(
        selectedClassId,
        suggestionId,
        { action: decision, teacher_notes: notes },
        token,
      );
      await loadActiveTelemetry(selectedClassId, token);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save decision.');
    }
  };

  // Create Assignment
  const handleCreateAssignment = async (data: {
    title: string;
    description?: string;
    skill_ids: string[];
    student_ids: string[];
    due_date?: string;
  }): Promise<void> => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const saved = await apiClient.createAssignment(selectedClassId, data, token);
      setAssignments((prev) => [saved, ...prev]);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not create assignment.');
      throw err;
    }
  };

  // CSV Export
  const handleExportCsv = async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) return;

    let csvText: string;
    try {
      csvText = await apiClient.exportClassCsv(selectedClassId, token);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not export classroom data.');
      return;
    }

    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `class_${selectedClassId}_competency_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated || (isLoading && classesList.length === 0)) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-24 flex flex-col items-center justify-center space-y-3 text-center text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm font-medium">Loading Teacher Dashboard & Classroom Heatmap...</p>
      </div>
    );
  }

  const gradeOptions = [
    { value: '6', label: 'Class 6' },
    { value: '7', label: 'Class 7' },
    { value: '8', label: 'Class 8' },
    { value: '9', label: 'Class 9' },
    { value: '10', label: 'Class 10' },
  ];

  const subjectOptions = [
    { value: 'Mathematics', label: 'Mathematics (NCERT)' },
    { value: 'Science', label: 'Science (NCERT)' },
    { value: 'Social Science', label: 'Social Science (NCERT)' },
    { value: 'English', label: 'English (NCERT)' },
    { value: 'Hindi', label: 'Hindi (NCERT)' },
  ];

  // If teacher has 0 classes, render the onboarding / create class view directly
  if (classesList.length === 0) {
    return (
      <div className="min-h-screen bg-canvas-gradient py-10 px-3 sm:px-6 flex justify-center text-ink selection:bg-surface-cream selection:text-ink">
        <div className="w-full max-w-4xl rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-10 shadow-shell space-y-8 relative overflow-hidden">
          {/* Decorative corner accent circles (design.md Section 5) */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-surface-cream pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-surface-butter/50 pointer-events-none" />

          <div className="relative z-10 text-center space-y-3">
            <span className="inline-block text-xs font-black uppercase tracking-wider rounded-full border-2 border-ink bg-surface-cream px-3.5 py-1 text-ink shadow-xs">
              Teacher Onboarding
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight text-ink dark:text-white">
              Create Your First Classroom
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
              Set up your class to automatically load the NCERT-aligned curriculum map, generate a
              unique student join code, and track student competency mastery in real-time.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="relative z-10 rounded-2xl border-2 border-ink bg-surface-pink/60 dark:bg-surface-pink/20 p-4 text-sm text-ink dark:text-pink-100 font-bold flex items-center gap-2.5 shadow-xs"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-pink border-2 border-ink text-ink font-black text-xs shadow-xs">
                !
              </span>
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          <div className="relative z-10 rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-8 shadow-card space-y-6">
            <div className="space-y-1 border-b-2 border-dashed border-ink/20 pb-4">
              <h2 className="text-xl font-black text-ink dark:text-white">{t('createNewClass')}</h2>
              <p className="text-xs text-text-secondary">
                Choose your grade and subject to import NCERT topics and skills. You can add, edit,
                or customize chapters at any time.
              </p>
            </div>
            <form
              onSubmit={handleCreateClass}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end"
            >
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                <label
                  htmlFor="new-class-name-empty"
                  className="text-xs font-black uppercase tracking-wider text-text-secondary"
                >
                  {t('className')} (or auto-generates)
                </label>
                <Input
                  id="new-class-name-empty"
                  placeholder={`e.g. Class ${grade}-${section} ${subject}`}
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 lg:col-span-2">
                <label
                  htmlFor="new-class-grade-empty"
                  className="text-xs font-black uppercase tracking-wider text-text-secondary"
                >
                  {t('grade')}
                </label>
                <Select
                  id="new-class-grade-empty"
                  options={gradeOptions}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 lg:col-span-3">
                <label
                  htmlFor="new-class-subject-empty"
                  className="text-xs font-black uppercase tracking-wider text-text-secondary"
                >
                  Subject
                </label>
                <Select
                  id="new-class-subject-empty"
                  options={subjectOptions}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 lg:col-span-1">
                <label
                  htmlFor="new-class-section-empty"
                  className="text-xs font-black uppercase tracking-wider text-text-secondary"
                >
                  {t('section')}
                </label>
                <Input
                  id="new-class-section-empty"
                  placeholder={t('sectionPlaceholder')}
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full cursor-pointer py-2 font-bold text-xs min-h-[44px] rounded-full border-2 border-ink shadow-xs"
                  disabled={isCreating}
                >
                  {isCreating ? t('creating') : '+ Create Class'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const enrolledStudents: StudentRosterItem[] = classDetail?.students ?? [];
  const pendingStudents = enrolledStudents.filter((s) => s.status === 'pending');
  const activeStudents = enrolledStudents.filter((s) => s.status === 'active');

  return (
    <div className="min-h-screen bg-canvas-gradient py-6 px-3 sm:px-6 flex justify-center text-ink selection:bg-surface-cream selection:text-ink">
      <div className="w-full max-w-[1360px] rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-8 shadow-shell space-y-6">
        {/* Top Header & Classroom Switcher */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b-2 border-dashed border-ink/30 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-black uppercase tracking-wider rounded-full border-2 border-ink bg-surface-cream px-3 py-0.5 text-ink shadow-xs">
                Teacher Dashboard
              </span>
              <span className="text-xs font-bold rounded-full border-2 border-ink bg-surface-white dark:bg-card px-3 py-0.5 text-text-secondary shadow-xs">
                DPDP Act 2023 Compliant
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight text-ink dark:text-white capitalize">
              {activeClass?.name || t('title')}
            </h1>
            <p className="text-xs font-bold text-text-secondary mt-1">
              Academic Year: {activeClass?.academic_year || '2024-2025'} • Grade{' '}
              {activeClass?.grade} Section {activeClass?.section || 'A'}
            </p>
          </div>

          {/* Controls: Class Selector, Join Code, Simulation, Export */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Active Class Dropdown */}
            <div className="min-w-[200px]">
              <label htmlFor="active-class-select" className="sr-only">
                Select Classroom
              </label>
              <select
                id="active-class-select"
                aria-label="Select Classroom"
                value={selectedClassId}
                onChange={(e) => handleSelectClass(e.target.value)}
                className="w-full text-xs font-bold rounded-full border-2 border-ink bg-surface-white dark:bg-card px-4 py-2 text-ink dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
              >
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Class {c.grade}-{c.section})
                  </option>
                ))}
              </select>
            </div>

            {/* Join Code Card */}
            {activeClass && (
              <div className="flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-surface-cream px-3 py-1.5 shadow-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                    Join Code
                  </span>
                  <span className="font-mono text-base font-black text-ink">
                    {activeClass.join_code}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="h-7 w-7 p-0 cursor-pointer rounded-lg border-2 border-ink bg-surface-white hover:bg-surface-yellow shadow-xs"
                    aria-label="Copy Join Code"
                  >
                    {codeCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-ink" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRotateCode(activeClass.id)}
                    disabled={rotatingId === activeClass.id}
                    className="h-7 w-7 p-0 text-ink cursor-pointer hover:bg-surface-yellow rounded-lg"
                    aria-label="Rotate Join Code"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${rotatingId === activeClass.id ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs font-bold gap-1.5 cursor-pointer rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream shadow-xs px-3.5 py-2"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-ink" />
              CSV
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs gap-1.5 cursor-pointer rounded-full border-2 border-ink bg-surface-white hover:bg-surface-cream shadow-xs px-3 py-2"
              aria-label="Print Classroom Summary"
            >
              <Printer className="w-3.5 h-3.5 text-ink" />
            </Button>
          </div>
        </div>

        {/* Four Neo-Brutalist Stat Tiles (design.md Section 6.4) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Tile 1: Enrolled Students (Surface Cream #FDEFC3) */}
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className="group text-left rounded-[20px] border-2 border-ink bg-surface-cream p-4 shadow-card hover:-translate-y-0.5 transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-surface-yellow/40 pointer-events-none" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary block">
                  Learners
                </span>
                <div className="font-serif text-2xl sm:text-3xl font-black text-ink mt-0.5">
                  {activeStudents.length}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full border-2 border-ink bg-surface-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4 text-ink" />
              </div>
            </div>
            <div className="mt-2 text-[11px] font-bold text-text-secondary flex items-center gap-1.5 relative z-10">
              <span>{enrolledStudents.length} total enrolled</span>
              {pendingStudents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-surface-yellow border border-ink text-ink text-[10px] font-black">
                  +{pendingStudents.length}
                </span>
              )}
            </div>
          </button>

          {/* Tile 2: Curriculum / Class (Surface Blue #DCE8FB) */}
          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            className="group text-left rounded-[20px] border-2 border-ink bg-surface-blue p-4 shadow-card hover:-translate-y-0.5 transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-surface-white/40 pointer-events-none" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary block">
                  Curriculum
                </span>
                <div className="font-serif text-xl sm:text-2xl font-black text-ink mt-0.5 truncate max-w-[150px]">
                  {activeClass ? `Class ${activeClass.grade}` : 'NCERT'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full border-2 border-ink bg-surface-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4 text-ink" />
              </div>
            </div>
            <div className="mt-2 text-[11px] font-bold text-text-secondary relative z-10 truncate">
              NCERT-aligned Curriculum
            </div>
          </button>

          {/* Tile 3: Skill Gaps (Surface Pink #F9B9B9) */}
          <button
            type="button"
            onClick={() => setActiveTab('clusters')}
            className="group text-left rounded-[20px] border-2 border-ink bg-surface-pink p-4 shadow-card hover:-translate-y-0.5 transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-surface-cream/50 pointer-events-none" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary block">
                  Skill Gaps
                </span>
                <div className="font-serif text-2xl sm:text-3xl font-black text-ink mt-0.5">
                  {clusters?.clusters.length ?? 0}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full border-2 border-ink bg-surface-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Target className="w-4 h-4 text-ink" />
              </div>
            </div>
            <div className="mt-2 text-[11px] font-bold text-text-secondary relative z-10">
              {clusters && clusters.clusters.length > 0
                ? 'Prerequisite clusters'
                : 'No active gap alerts'}
            </div>
          </button>

          {/* Tile 4: AI Suggestions (Surface Butter / Yellow #FFF4B5) */}
          <button
            type="button"
            onClick={() => setActiveTab('suggestions')}
            className="group text-left rounded-[20px] border-2 border-ink bg-surface-butter p-4 shadow-card hover:-translate-y-0.5 transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-surface-yellow/40 pointer-events-none" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary block">
                  Suggestions
                </span>
                <div className="font-serif text-2xl sm:text-3xl font-black text-ink mt-0.5">
                  {suggestions?.suggestions.length ?? 0}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full border-2 border-ink bg-surface-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Lightbulb className="w-4 h-4 text-ink" />
              </div>
            </div>
            <div className="mt-2 text-[11px] font-bold text-text-secondary relative z-10">
              {suggestions && suggestions.suggestions.length > 0
                ? 'Decisions pending'
                : 'Class on track'}
            </div>
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-2xl border-2 border-ink bg-surface-pink/60 dark:bg-surface-pink/20 p-4 text-sm text-ink dark:text-pink-100 font-bold flex items-center gap-2.5 shadow-xs"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-pink border-2 border-ink text-ink font-black text-xs shadow-xs">
              !
            </span>
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Main Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-6 overflow-x-auto pb-1">
            <TabsList className="h-auto w-full min-w-max flex flex-nowrap items-center gap-1.5 rounded-full border-2 border-ink bg-surface-cream/40 dark:bg-card p-1.5 shadow-xs">
              <TabsTrigger
                value="overview"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all border-2 data-[state=active]:border-ink data-[state=active]:bg-surface-white data-[state=active]:text-ink data-[state=active]:shadow-xs data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary hover:text-ink hover:bg-surface-white/70"
              >
                Overview & Heatmap
              </TabsTrigger>
              <TabsTrigger
                value="curriculum"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all border-2 data-[state=active]:border-ink data-[state=active]:bg-surface-white data-[state=active]:text-ink data-[state=active]:shadow-xs data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary hover:text-ink hover:bg-surface-white/70"
              >
                Curriculum Hub
              </TabsTrigger>
              <TabsTrigger
                value="clusters"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all border-2 data-[state=active]:border-ink data-[state=active]:bg-surface-white data-[state=active]:text-ink data-[state=active]:shadow-xs data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary hover:text-ink hover:bg-surface-white/70"
              >
                Gaps & Clusters
                {clusters && clusters.clusters.length > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 rounded-full bg-primary-orange text-white text-[10px] font-black border border-ink shadow-xs">
                    {clusters.clusters.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="warnings"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all border-2 data-[state=active]:border-ink data-[state=active]:bg-surface-white data-[state=active]:text-ink data-[state=active]:shadow-xs data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary hover:text-ink hover:bg-surface-white/70"
              >
                Early Warnings
                {warnings && warnings.warnings.length > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 rounded-full bg-surface-pink text-ink text-[10px] font-black border border-ink shadow-xs">
                    {warnings.warnings.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="suggestions"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all border-2 data-[state=active]:border-ink data-[state=active]:bg-surface-white data-[state=active]:text-ink data-[state=active]:shadow-xs data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary hover:text-ink hover:bg-surface-white/70"
              >
                Suggestions
                {suggestions && suggestions.suggestions.length > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 rounded-full bg-surface-yellow text-ink text-[10px] font-black border border-ink shadow-xs">
                    {suggestions.suggestions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="classes"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all border-2 data-[state=active]:border-ink data-[state=active]:bg-surface-white data-[state=active]:text-ink data-[state=active]:shadow-xs data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary hover:text-ink hover:bg-surface-white/70"
              >
                My Classes ({classesList.length})
              </TabsTrigger>
              <TabsTrigger
                value="roster"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all border-2 data-[state=active]:border-ink data-[state=active]:bg-surface-white data-[state=active]:text-ink data-[state=active]:shadow-xs data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary hover:text-ink hover:bg-surface-white/70"
              >
                Students ({enrolledStudents.length})
                {pendingStudents.length > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 rounded-full bg-surface-yellow text-ink text-[10px] font-black border border-ink shadow-xs">
                    {pendingStudents.length} pending
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="assignments"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all border-2 data-[state=active]:border-ink data-[state=active]:bg-surface-white data-[state=active]:text-ink data-[state=active]:shadow-xs data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary hover:text-ink hover:bg-surface-white/70"
              >
                Assignments ({assignments.length})
              </TabsTrigger>
              <TabsTrigger
                value="progress"
                className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all border-2 data-[state=active]:border-ink data-[state=active]:bg-surface-white data-[state=active]:text-ink data-[state=active]:shadow-xs data-[state=inactive]:border-transparent data-[state=inactive]:text-text-secondary hover:text-ink hover:bg-surface-white/70"
              >
                Reports
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Overview & Heatmap */}
          <TabsContent value="overview">
            {heatmap && heatmap.students.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Showing real-time competency matrix for{' '}
                    <strong className="text-foreground">{activeClass?.name}</strong>. Click any cell
                    to inspect student mastery details.
                  </span>
                  <Link
                    href={`/classes/${selectedClassId}`}
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                      className:
                        'text-xs h-7 inline-flex items-center rounded-full border-2 border-ink',
                    })}
                  >
                    Full Screen View ↗
                  </Link>
                </div>

                <ClassHeatmapView
                  heatmap={heatmap}
                  onSelectStudent={(studentId) => setSelectedStudentId(studentId)}
                />
              </div>
            ) : (
              <div className="rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-8 sm:p-12 text-center shadow-card relative overflow-hidden max-w-2xl mx-auto space-y-6">
                {/* Decorative corner accent circles (design.md Section 5) */}
                <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-surface-cream pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-surface-butter/50 pointer-events-none" />

                {/* Mascot badge */}
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-full border-2 border-ink bg-surface-cream flex items-center justify-center mx-auto shadow-xs">
                    <Sparkles className="w-8 h-8 text-primary-orange" />
                  </div>
                </div>

                <div className="relative z-10 space-y-3 max-w-lg mx-auto">
                  <h3 className="font-serif text-2xl sm:text-3xl font-black text-ink dark:text-white tracking-tight">
                    No Enrolled Students Yet
                  </h3>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    Students join this classroom using the unique join code below. Once they join,
                    their real-time Bayesian competency heatmap will appear right here.
                  </p>

                  {/* Join Code Highlight Pill */}
                  <div className="pt-2">
                    <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-ink bg-surface-butter px-5 py-2.5 shadow-xs">
                      <span className="text-[11px] font-black uppercase tracking-wider text-text-secondary">
                        Student Join Code:
                      </span>
                      <span className="font-mono text-xl font-black text-ink tracking-widest">
                        {activeClass?.join_code}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCode}
                        className="h-7 px-2.5 text-xs font-bold rounded-lg border-2 border-ink bg-surface-white cursor-pointer shadow-xs"
                      >
                        {codeCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-ink" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                    <Button
                      variant="primary"
                      onClick={() => setActiveTab('roster')}
                      className="rounded-full px-6 py-2.5 text-xs font-bold shadow-xs cursor-pointer border-2 border-ink"
                    >
                      View Class Roster & Pending Requests →
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCopyCode}
                      className="rounded-full px-6 py-2.5 text-xs font-bold shadow-xs cursor-pointer border-2 border-ink bg-surface-white hover:bg-surface-cream"
                    >
                      {codeCopied ? 'Join Code Copied!' : 'Copy Join Code'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab: Curriculum & Content Hub */}
          <TabsContent value="curriculum">
            <CurriculumContentHub
              activeClass={activeClass}
              onRefreshData={() => {
                if (activeClass) void loadActiveTelemetry(activeClass.id, getAuthToken() || '');
              }}
            />
          </TabsContent>

          {/* Tab 2: Gap Clusters */}
          <TabsContent value="clusters">
            {clusters ? (
              <GroupGapClustersView
                clusters={clusters}
                onAssignRevision={(cluster) => {
                  setPrefilledCluster(cluster);
                  setActiveTab('assignments');
                }}
              />
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Analyzing prerequisite gap distributions...
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Early Warnings */}
          <TabsContent value="warnings">
            {warnings ? (
              <EarlyWarningsView
                warnings={warnings}
                days={warningDays}
                onDaysChange={(d) => setWarningDays(d)}
                onSelectStudent={(studentId) => setSelectedStudentId(studentId)}
              />
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Evaluating learning velocity and inactivity signals...
              </div>
            )}
          </TabsContent>

          {/* Tab 4: Suggestions Decision Hub */}
          <TabsContent value="suggestions">
            {suggestions ? (
              <SuggestionsDecisionHub
                suggestions={suggestions}
                onRecordDecision={handleRecordDecision}
                onSelectStudent={(studentId) => setSelectedStudentId(studentId)}
              />
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Synthesizing pedagogical recommendations...
              </div>
            )}
          </TabsContent>

          {/* Tab 5: My Classes & Create Class */}
          <TabsContent value="classes" className="space-y-6">
            <div className="rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-6 shadow-card space-y-4 relative overflow-hidden">
              <div className="space-y-1 border-b-2 border-dashed border-ink/20 pb-4">
                <h3 className="text-lg font-black text-ink dark:text-white">
                  {t('createNewClass')}
                </h3>
                <p className="text-xs text-text-secondary">
                  Create a new section to automatically generate a student join code and assign an
                  NCERT-aligned curriculum.
                </p>
              </div>
              <form
                onSubmit={handleCreateClass}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end"
              >
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                  <label
                    htmlFor="new-class-name"
                    className="text-xs font-black uppercase tracking-wider text-text-secondary"
                  >
                    {t('className')} (or auto-generates)
                  </label>
                  <Input
                    id="new-class-name"
                    placeholder={`e.g. Class ${grade}-${section} ${subject}`}
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 lg:col-span-2">
                  <label
                    htmlFor="new-class-grade"
                    className="text-xs font-black uppercase tracking-wider text-text-secondary"
                  >
                    {t('grade')}
                  </label>
                  <Select
                    id="new-class-grade"
                    options={gradeOptions}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 lg:col-span-3">
                  <label
                    htmlFor="new-class-subject"
                    className="text-xs font-black uppercase tracking-wider text-text-secondary"
                  >
                    Subject
                  </label>
                  <Select
                    id="new-class-subject"
                    options={subjectOptions}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 lg:col-span-1">
                  <label
                    htmlFor="new-class-section"
                    className="text-xs font-black uppercase tracking-wider text-text-secondary"
                  >
                    {t('section')}
                  </label>
                  <Input
                    id="new-class-section"
                    placeholder={t('sectionPlaceholder')}
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full cursor-pointer py-2 font-bold text-xs min-h-[44px] rounded-full border-2 border-ink shadow-xs"
                    disabled={isCreating}
                  >
                    {isCreating ? t('creating') : '+ Create Class'}
                  </Button>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classesList.map((cls) => {
                const isSelected = cls.id === selectedClassId;
                return (
                  <div
                    key={cls.id}
                    className={`flex flex-col justify-between rounded-[22px] border-2 border-ink p-5 shadow-xs transition-all ${
                      isSelected
                        ? 'bg-surface-cream/40 ring-2 ring-primary-orange'
                        : 'bg-surface-white dark:bg-card hover:shadow-card'
                    }`}
                  >
                    <div className="space-y-1 pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-base font-black truncate text-ink dark:text-white capitalize">
                          {cls.name}
                        </h4>
                        <span className="shrink-0 text-xs font-black rounded-full border-2 border-ink bg-surface-yellow px-2.5 py-0.5 text-ink shadow-xs">
                          Class {cls.grade}
                          {cls.section ? `-${cls.section}` : ''}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-text-secondary">
                        {cls.academic_year || '2024-2025'}
                      </p>
                    </div>

                    <div className="space-y-3 pt-0">
                      <div className="flex items-center justify-between rounded-xl border-2 border-ink bg-surface-cream/70 p-3 shadow-xs">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                            Join Code
                          </span>
                          <div className="font-mono text-lg font-black text-ink tracking-widest">
                            {cls.join_code}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer text-xs font-bold rounded-lg border-2 border-ink bg-surface-white shadow-xs"
                          onClick={() => handleRotateCode(cls.id)}
                          disabled={rotatingId === cls.id}
                        >
                          {rotatingId === cls.id ? t('rotating') : t('rotateCode')}
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={isSelected ? 'primary' : 'outline'}
                          size="sm"
                          className="flex-1 text-xs font-bold rounded-full border-2 border-ink cursor-pointer shadow-xs"
                          onClick={() => {
                            handleSelectClass(cls.id);
                            setActiveTab('overview');
                          }}
                        >
                          {isSelected ? '✓ Viewing Heatmap' : 'Open Heatmap'}
                        </Button>
                        <Link
                          href={`/classes/${cls.id}`}
                          className={buttonVariants({
                            variant: 'outline',
                            size: 'sm',
                            className:
                              'text-xs shrink-0 inline-flex items-center rounded-full border-2 border-ink bg-surface-white shadow-xs font-bold',
                          })}
                        >
                          Dashboard →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Tab 6: Students Roster */}
          <TabsContent value="roster" className="space-y-6">
            {/* Pending Requests Section */}
            {pendingStudents.length > 0 && (
              <div className="rounded-[24px] border-2 border-ink bg-surface-yellow/20 p-6 shadow-xs space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-ink flex items-center gap-2">
                    Pending Join Requests ({pendingStudents.length})
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Review and approve students who requested to join with class code{' '}
                    <strong className="font-mono text-ink font-bold">
                      {activeClass?.join_code}
                    </strong>
                    .
                  </p>
                </div>
                <div className="overflow-x-auto rounded-xl border-2 border-ink bg-surface-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-ink bg-surface-cream/50">
                        <TableHead className="font-black text-ink">{t('studentName')}</TableHead>
                        <TableHead className="font-black text-ink">
                          {t('studentUsername')}
                        </TableHead>
                        <TableHead className="font-black text-ink">{t('rollNumber')}</TableHead>
                        <TableHead className="font-black text-ink">{t('status')}</TableHead>
                        <TableHead className="text-right font-black text-ink">
                          {t('actions')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingStudents.map((st) => (
                        <TableRow key={st.student_id} className="border-b border-ink/20">
                          <TableCell className="font-bold text-ink">{st.full_name}</TableCell>
                          <TableCell className="font-mono text-xs">{st.username}</TableCell>
                          <TableCell>{st.roll_number || '—'}</TableCell>
                          <TableCell>
                            <span className="text-xs font-bold rounded-full border-2 border-ink bg-surface-yellow px-2.5 py-0.5 text-ink shadow-xs">
                              {t('pending')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={actionInProgressId === st.student_id}
                                onClick={() => handleApprove(st.student_id)}
                                className="text-xs font-bold rounded-full border-2 border-ink cursor-pointer shadow-xs"
                              >
                                {actionInProgressId === st.student_id
                                  ? t('approving')
                                  : `✓ ${t('approve')}`}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionInProgressId === st.student_id}
                                onClick={() => handleRemove(st.student_id)}
                                className="text-xs font-bold rounded-full border-2 border-ink text-destructive hover:bg-surface-pink/30 cursor-pointer shadow-xs"
                              >
                                ✕ {t('reject')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Active Students Section */}
            <div className="rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b-2 border-dashed border-ink/20 pb-4">
                <div>
                  <h3 className="text-lg font-black text-ink dark:text-white">
                    Class Roster & Individual Profiles ({activeStudents.length})
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Enrolled students in {activeClass?.name}. Click any student to inspect their
                    Bayesian competency matrix.
                  </p>
                </div>
              </div>

              {activeStudents.length === 0 ? (
                <div className="rounded-[20px] border-2 border-dashed border-ink/30 bg-surface-cream/30 p-8 sm:p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full border-2 border-ink bg-surface-cream flex items-center justify-center mx-auto shadow-xs">
                    <Users className="w-5 h-5 text-ink" />
                  </div>
                  <h4 className="font-bold text-base text-ink dark:text-white">
                    No active students enrolled in this class yet.
                  </h4>
                  <p className="text-xs text-text-secondary max-w-sm mx-auto">
                    Ask students to visit{' '}
                    <strong className="text-ink dark:text-white font-mono">/join</strong> and enter
                    join code{' '}
                    <strong className="font-mono text-primary-orange font-black">
                      {activeClass?.join_code}
                    </strong>
                    .
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border-2 border-ink bg-surface-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-ink bg-surface-cream/40">
                        <TableHead className="font-black text-ink">{t('studentName')}</TableHead>
                        <TableHead className="font-black text-ink">
                          {t('studentUsername')}
                        </TableHead>
                        <TableHead className="font-black text-ink">{t('rollNumber')}</TableHead>
                        <TableHead className="font-black text-ink">{t('status')}</TableHead>
                        <TableHead className="text-right font-black text-ink">
                          {t('actions')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeStudents.map((st) => (
                        <TableRow key={st.student_id} className="border-b border-ink/20">
                          <TableCell className="font-bold text-ink">
                            <button
                              type="button"
                              onClick={() => setSelectedStudentId(st.student_id)}
                              className="hover:underline text-left cursor-pointer font-bold text-primary-orange"
                            >
                              {st.full_name}
                            </button>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{st.username}</TableCell>
                          <TableCell>{st.roll_number ? `#${st.roll_number}` : '—'}</TableCell>
                          <TableCell>
                            <span className="text-xs font-bold rounded-full border-2 border-ink bg-emerald-100 text-emerald-800 px-2.5 py-0.5 shadow-xs">
                              {t('active')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="cursor-pointer text-xs font-bold rounded-full border-2 border-ink bg-surface-white shadow-xs"
                                onClick={() => setSelectedStudentId(st.student_id)}
                              >
                                {t('viewRoster')} →
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionInProgressId === st.student_id}
                                onClick={() => handleRemove(st.student_id)}
                                className="text-xs font-bold rounded-full border-2 border-ink text-destructive hover:bg-surface-pink/30 cursor-pointer shadow-xs"
                              >
                                {actionInProgressId === st.student_id ? t('removing') : t('remove')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 7: Assignments */}
          <TabsContent value="assignments">
            <AssignmentsView
              assignments={assignments}
              students={heatmap ? heatmap.students : []}
              skills={heatmap ? heatmap.skills : []}
              onCreateAssignment={handleCreateAssignment}
              prefilledCluster={prefilledCluster}
              onClearPrefilled={() => setPrefilledCluster(null)}
            />
          </TabsContent>

          {/* Tab 8: Reports */}
          <TabsContent value="progress">
            {progress ? (
              <ProgressReassessmentView progress={progress} />
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Aggregating longitudinal competency trajectory...
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Student Profile Modal */}
        <StudentProfileModal
          studentId={selectedStudentId}
          classId={selectedClassId}
          onClose={() => setSelectedStudentId(null)}
        />
      </div>
    </div>
  );
}
