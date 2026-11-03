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
  Button,
  buttonVariants,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@bodhai/ui';
import { getWebApiClient, getAuthToken } from '@/lib/api-client';
import type {
  ClassDetailResponse,
  StudentRosterItem,
  ClassHeatmapResponse,
  ClassGapClustersResponse,
  GapClusterItem,
  ClassEarlyWarningsResponse,
  ClassSuggestionsResponse,
  AssignmentResponse,
  ClassProgressSummaryResponse,
} from '@bodhai/api-client';

import { ClassHeatmapView } from '@/components/teacher/ClassHeatmapView';
import { GroupGapClustersView } from '@/components/teacher/GroupGapClustersView';
import { EarlyWarningsView } from '@/components/teacher/EarlyWarningsView';
import { SuggestionsDecisionHub } from '@/components/teacher/SuggestionsDecisionHub';
import { AssignmentsView } from '@/components/teacher/AssignmentsView';
import { ProgressReassessmentView } from '@/components/teacher/ProgressReassessmentView';
import { StudentProfileModal } from '@/components/teacher/StudentProfileModal';
import { CurriculumContentHub } from '@/components/teacher/CurriculumContentHub';

interface PageProps {
  readonly params: Promise<{ id: string; locale: string }>;
}

export default function ClassDetailPage({ params }: PageProps): React.JSX.Element {
  const resolvedParams = React.use(params);
  const classId = resolvedParams.id;
  const tClasses = useTranslations('classes');
  const tTeacher = useTranslations('teacherDashboard');
  const router = useRouter();
  const apiClient = getWebApiClient();

  // Primary state
  const [classDetail, setClassDetail] = React.useState<ClassDetailResponse | null>(null);
  const [heatmap, setHeatmap] = React.useState<ClassHeatmapResponse | null>(null);
  const [clusters, setClusters] = React.useState<ClassGapClustersResponse | null>(null);
  const [warnings, setWarnings] = React.useState<ClassEarlyWarningsResponse | null>(null);
  const [suggestions, setSuggestions] = React.useState<ClassSuggestionsResponse | null>(null);
  const [assignments, setAssignments] = React.useState<AssignmentResponse[]>([]);
  const [progress, setProgress] = React.useState<ClassProgressSummaryResponse | null>(null);

  // UI state
  const [activeTab, setActiveTab] = React.useState<string>('heatmap');
  const [warningDays, setWarningDays] = React.useState<number>(14);
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);
  const [prefilledCluster, setPrefilledCluster] = React.useState<GapClusterItem | null>(null);

  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isExportingCsv, setIsExportingCsv] = React.useState<boolean>(false);
  const [codeCopied, setCodeCopied] = React.useState<boolean>(false);
  const [actionInProgressId, setActionInProgressId] = React.useState<string | null>(null);

  // Load only server-backed classroom data; surface failures instead of invented metrics.
  const loadClassData = React.useCallback(async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent(`/classes/${classId}`)}`);
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage(null);
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
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load classroom data.');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, classId, router, warningDays]);

  React.useEffect(() => {
    void loadClassData();
  }, [loadClassData]);

  // Handle rotate join code
  const handleRotate = async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await apiClient.rotateClassJoinCode(classId, token);
      setClassDetail((prev) => (prev ? { ...prev, join_code: res.join_code } : null));
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error rotating join code');
    }
  };

  // Handle copy join code
  const handleCopyCode = (): void => {
    if (!classDetail) return;
    void navigator.clipboard.writeText(classDetail.join_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Handle student roster actions
  const handleApprove = async (studentId: string): Promise<void> => {
    const token = getAuthToken();
    if (!token) return;

    setActionInProgressId(studentId);
    try {
      await apiClient.approveStudent(classId, studentId, token);
      setClassDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          students: prev.students.map((s) =>
            s.student_id === studentId ? { ...s, status: 'active' } : s,
          ),
        };
      });
      void loadClassData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error approving student');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRemove = async (studentId: string): Promise<void> => {
    const token = getAuthToken();
    if (!token) return;

    setActionInProgressId(studentId);
    try {
      await apiClient.removeStudent(classId, studentId, token);
      setClassDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          students: prev.students.filter((s) => s.student_id !== studentId),
        };
      });
      void loadClassData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error removing student');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle CSV Export (privacy-aware)
  const handleExportCsv = async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) return;

    setIsExportingCsv(true);
    try {
      const csvText = await apiClient.exportClassCsv(classId, token);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `class_${classId}_competency_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to export CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Handle Print view
  const handlePrint = (): void => {
    window.print();
  };

  // Handle Revision Assignment from Gap Clusters
  const handleAssignClusterRevision = (cluster: GapClusterItem): void => {
    setPrefilledCluster(cluster);
    setActiveTab('assignments');
  };

  // Handle Teacher Decisions on Suggestions
  const handleRecordDecision = async (
    suggestionId: string,
    decision: 'accept' | 'edit' | 'ignore' | 'override',
    notes?: string,
  ): Promise<void> => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await apiClient.recordTeacherDecision(
        classId,
        suggestionId,
        {
          action: decision,
          teacher_notes: notes,
        },
        token,
      );
      await loadClassData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save decision.');
    }
  };

  // Handle Create Assignment
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
      const newAsgn = await apiClient.createAssignment(classId, data, token);
      setAssignments((prev) => [newAsgn, ...prev]);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating assignment');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12 text-center text-muted-foreground">
        Loading teacher classroom telemetry & competency matrix...
      </div>
    );
  }

  if (!classDetail) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12 text-center">
        <p className="text-destructive font-medium">{errorMessage || 'Class not found'}</p>
        <Link
          href="/classes"
          className={buttonVariants({
            variant: 'outline',
            size: 'md',
            className: 'mt-4 inline-flex items-center',
          })}
        >
          {tClasses('title')}
        </Link>
      </div>
    );
  }

  const classObj = {
    id: classDetail.id,
    name: classDetail.name,
    grade: classDetail.grade,
    section: classDetail.section,
    academic_year: classDetail.academic_year,
    join_code: classDetail.join_code,
    school_id: classDetail.school_id,
    teacher_id: classDetail.teacher_id,
    created_at: classDetail.created_at,
  };

  return (
    <div className="min-h-screen bg-canvas-gradient py-6 px-3 sm:px-6 flex justify-center text-ink selection:bg-surface-cream selection:text-ink">
      <div className="w-full max-w-[1360px] rounded-[28px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-8 shadow-shell space-y-6">
        {/* Header bar: breadcrumb, title, code, export & print */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b-2 border-dashed border-ink/40 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2 print:hidden">
              <Link
                href="/classes"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className:
                    'cursor-pointer text-xs inline-flex items-center rounded-full border-2 border-ink bg-surface-white font-bold',
                })}
              >
                ← {tTeacher('backToClasses')}
              </Link>
              <span className="text-xs font-bold rounded-full border-2 border-ink bg-surface-cream px-3 py-1 text-ink shadow-xs">
                Class {classDetail.grade}
                {classDetail.section ? `-${classDetail.section}` : ''}
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight text-ink dark:text-white">
              {classDetail.name}
            </h1>
            <p className="text-xs font-bold text-text-secondary mt-1">
              Academic Year: {classDetail.academic_year || 'Current'} •{' '}
              {classDetail.students.length} Enrolled Students
            </p>
          </div>

          {/* Join code card & top actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-surface-cream p-3 shadow-card">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary block">
                  {tTeacher('joinCodeLabel')}
                </span>
                <div className="font-mono text-xl font-black text-ink leading-tight">
                  {classDetail.join_code}
                </div>
              </div>
              <div className="flex flex-col gap-1 print:hidden">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="cursor-pointer text-xs h-6 px-2.5 rounded-full border-2 border-ink font-bold bg-surface-white"
                >
                  {codeCopied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRotate}
                  className="cursor-pointer text-[10px] h-6 px-2 text-text-secondary font-bold hover:text-ink"
                >
                  {tTeacher('rotateCode')}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExportingCsv}
                onClick={handleExportCsv}
                className="cursor-pointer text-xs font-bold rounded-full border-2 border-ink shadow-xs bg-surface-white"
              >
                {isExportingCsv ? tTeacher('export.exporting') : tTeacher('export.downloadCsv')}
              </Button>
              <Button
                type="button"
                variant="orange"
                size="sm"
                onClick={handlePrint}
                className="cursor-pointer text-xs font-bold rounded-full border-2 border-ink shadow-xs"
              >
                🖨 {tTeacher('export.printView')}
              </Button>
            </div>
          </div>
        </div>

        {/* DPDP Statutory Privacy Notice Banner */}
        <div className="rounded-2xl border-2 border-ink bg-surface-cream/50 p-3.5 text-xs text-ink font-medium flex items-center justify-between shadow-xs">
          <span>{tTeacher('export.privacyNotice')}</span>
          <Badge
            variant="outline"
            className="text-[11px] font-bold rounded-full border-2 border-ink bg-surface-white ml-2"
          >
            DPDP Act 2023 Compliant
          </Badge>
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
          <div className="mb-6 print:hidden">
            <TabsList className="flex flex-wrap gap-1.5 bg-surface-cream/50 p-2 rounded-full border-2 border-ink shadow-xs overflow-x-auto">
              <TabsTrigger
                value="heatmap"
                className="rounded-full px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                📊 {tTeacher('tabs.heatmap')}
              </TabsTrigger>
              <TabsTrigger
                value="curriculum"
                className="rounded-full px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                📚 Curriculum & Content Hub
              </TabsTrigger>
              <TabsTrigger
                value="clusters"
                className="rounded-full px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                🎯 {tTeacher('tabs.gapClusters')}
                {clusters && clusters.clusters.length > 0 && (
                  <span className="ml-1.5 px-2 py-0.2 rounded-full bg-primary-orange text-white text-[10px] font-black border border-ink">
                    {clusters.clusters.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="warnings"
                className="rounded-full px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                ⚠️ {tTeacher('tabs.earlyWarnings')}
                {warnings && warnings.warnings.length > 0 && (
                  <span className="ml-1.5 px-2 py-0.2 rounded-full bg-surface-pink text-ink text-[10px] font-black border border-ink">
                    {warnings.warnings.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="suggestions"
                className="rounded-full px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                💡 {tTeacher('tabs.suggestions')}
                {suggestions && suggestions.suggestions.length > 0 && (
                  <span className="ml-1.5 px-2 py-0.2 rounded-full bg-surface-yellow text-ink text-[10px] font-black border border-ink">
                    {suggestions.suggestions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="assignments"
                className="rounded-full px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                📝 {tTeacher('tabs.assignments')}
              </TabsTrigger>
              <TabsTrigger
                value="progress"
                className="rounded-full px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                📈 {tTeacher('tabs.progress')}
              </TabsTrigger>
              <TabsTrigger
                value="roster"
                className="rounded-full px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                👥 {tTeacher('tabs.roster')} ({classDetail.students.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Heatmap View */}
          <TabsContent value="heatmap">
            {heatmap ? (
              <ClassHeatmapView
                heatmap={heatmap}
                onSelectStudent={(studentId) => setSelectedStudentId(studentId)}
              />
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No competency telemetry available yet.
              </div>
            )}
          </TabsContent>

          {/* Tab: Curriculum & Content Hub */}
          <TabsContent value="curriculum">
            <CurriculumContentHub activeClass={classObj} onRefreshData={loadClassData} />
          </TabsContent>

          {/* Tab 2: Group Gap Clusters View */}
          <TabsContent value="clusters">
            {clusters ? (
              <GroupGapClustersView
                clusters={clusters}
                onAssignRevision={handleAssignClusterRevision}
              />
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Analyzing student competency distributions...
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Early Warnings View */}
          <TabsContent value="warnings">
            {warnings ? (
              <EarlyWarningsView
                warnings={warnings}
                days={warningDays}
                onDaysChange={(d) => setWarningDays(d)}
                onSelectStudent={(studentId) => setSelectedStudentId(studentId)}
              />
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Checking learning velocity signals...
              </div>
            )}
          </TabsContent>

          {/* Tab 4: Suggestions & Decision Hub */}
          <TabsContent value="suggestions">
            {suggestions ? (
              <SuggestionsDecisionHub
                suggestions={suggestions}
                onRecordDecision={handleRecordDecision}
                onSelectStudent={(studentId) => setSelectedStudentId(studentId)}
              />
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Evaluating diagnostic evidence & pedagogical signals...
              </div>
            )}
          </TabsContent>

          {/* Tab 5: Assignments View */}
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

          {/* Tab 6: Progress & Reassessment View */}
          <TabsContent value="progress">
            {progress ? (
              <ProgressReassessmentView progress={progress} />
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aggregating longitudinal competency trajectory...
              </div>
            )}
          </TabsContent>

          {/* Tab 7: Class Roster View */}
          <TabsContent value="roster">
            <Card className="shadow-xs">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">{tClasses('rosterTitle')}</CardTitle>
                    <CardDescription className="text-xs">
                      {classDetail.students.length} {tClasses('studentsCount')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {classDetail.students.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {tClasses('emptyRoster')}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tClasses('studentName')}</TableHead>
                        <TableHead>{tClasses('studentUsername')}</TableHead>
                        <TableHead>{tClasses('rollNo')}</TableHead>
                        <TableHead>{tClasses('status')}</TableHead>
                        <TableHead className="text-right">{tClasses('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classDetail.students.map((student: StudentRosterItem) => (
                        <TableRow key={student.student_id}>
                          <TableCell className="font-medium text-foreground">
                            <button
                              type="button"
                              onClick={() => setSelectedStudentId(student.student_id)}
                              className="hover:underline text-left cursor-pointer"
                            >
                              {student.full_name}
                            </button>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{student.username}</TableCell>
                          <TableCell>{student.roll_number || '—'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={student.status === 'active' ? 'success' : 'outline'}
                              className="text-xs"
                            >
                              {student.status === 'active'
                                ? tClasses('active')
                                : tClasses('pending')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="cursor-pointer text-xs"
                                onClick={() => setSelectedStudentId(student.student_id)}
                              >
                                Profile
                              </Button>
                              {student.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="cursor-pointer text-xs"
                                  disabled={actionInProgressId === student.student_id}
                                  onClick={() => handleApprove(student.student_id)}
                                >
                                  {actionInProgressId === student.student_id
                                    ? tClasses('approving')
                                    : tClasses('approve')}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="cursor-pointer text-xs text-destructive hover:bg-destructive/10"
                                disabled={actionInProgressId === student.student_id}
                                onClick={() => handleRemove(student.student_id)}
                              >
                                {actionInProgressId === student.student_id
                                  ? tClasses('removing')
                                  : tClasses('remove')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Student Profile Modal */}
        <StudentProfileModal
          studentId={selectedStudentId}
          classId={classId}
          onClose={() => setSelectedStudentId(null)}
        />
      </div>
    </div>
  );
}
