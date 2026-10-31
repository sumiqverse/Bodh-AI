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
import {
  getMockClassDetail,
  getMockHeatmap,
  getMockGapClusters,
  getMockEarlyWarnings,
  getMockSuggestions,
  getMockAssignments,
  getMockProgressSummary,
} from '@/lib/teacher-mock-data';
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

  // Fetch all class data
  const loadClassData = React.useCallback(async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    // High-fidelity fallback for mock sessions or offline mode
    if (token.startsWith('mock_token_') || classId.startsWith('cls-mock-')) {
      setIsLoading(false);
      setClassDetail(getMockClassDetail(classId));
      setHeatmap(getMockHeatmap(classId));
      setClusters(getMockGapClusters(classId));
      setWarnings(getMockEarlyWarnings(classId, warningDays));
      setSuggestions(getMockSuggestions(classId));
      setAssignments(getMockAssignments(classId));
      setProgress(getMockProgressSummary(classId));
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [detailRes, heatmapRes, clusterRes, warningRes, suggRes, asgnRes, progRes] =
        await Promise.allSettled([
          apiClient.getClassDetails(classId, token),
          apiClient.getClassHeatmap(classId, token),
          apiClient.getClassGapClusters(classId, undefined, undefined, token),
          apiClient.getClassEarlyWarnings(classId, warningDays, token),
          apiClient.getClassSuggestions(classId, token),
          apiClient.listAssignments(classId, token),
          apiClient.getClassProgressSummary(classId, token),
        ]);

      if (detailRes.status === 'fulfilled') {
        const detail = detailRes.value;
        setClassDetail(detail);
        if (heatmapRes.status === 'fulfilled' && heatmapRes.value) {
          setHeatmap(heatmapRes.value);
        } else {
          setHeatmap({
            class_id: classId,
            total_students: detail.students.length,
            total_skills: 0,
            students: [],
            skills: [],
            matrix: [],
            summary: { mastered: 0, partial: 0, not_learned: 0 },
          });
        }
        if (clusterRes.status === 'fulfilled' && clusterRes.value) {
          setClusters(clusterRes.value);
        } else {
          setClusters({ class_id: classId, total_clusters: 0, clusters: [] });
        }
        if (warningRes.status === 'fulfilled' && warningRes.value) {
          setWarnings(warningRes.value);
        } else {
          setWarnings({ class_id: classId, threshold_days: warningDays, warnings: [] });
        }
        if (suggRes.status === 'fulfilled' && suggRes.value) {
          setSuggestions(suggRes.value);
        } else {
          setSuggestions({ class_id: classId, suggestions: [] });
        }
        if (asgnRes.status === 'fulfilled' && asgnRes.value) {
          setAssignments(asgnRes.value);
        } else {
          setAssignments([]);
        }
        if (progRes.status === 'fulfilled' && progRes.value) {
          setProgress(progRes.value);
        } else {
          setProgress(null);
        }
      } else {
        if (token.startsWith('mock_token_') || classId.startsWith('cls-mock-')) {
          setClassDetail(getMockClassDetail(classId));
          setHeatmap(getMockHeatmap(classId));
          setClusters(getMockGapClusters(classId));
          setWarnings(getMockEarlyWarnings(classId, warningDays));
          setSuggestions(getMockSuggestions(classId));
          setAssignments(getMockAssignments(classId));
          setProgress(getMockProgressSummary(classId));
        } else {
          setErrorMessage('Class details could not be loaded from server.');
        }
      }
    } catch {
      if (token.startsWith('mock_token_') || classId.startsWith('cls-mock-')) {
        setClassDetail(getMockClassDetail(classId));
        setHeatmap(getMockHeatmap(classId));
        setClusters(getMockGapClusters(classId));
        setWarnings(getMockEarlyWarnings(classId, warningDays));
        setSuggestions(getMockSuggestions(classId));
        setAssignments(getMockAssignments(classId));
        setProgress(getMockProgressSummary(classId));
      } else {
        setErrorMessage('Failed to connect to classroom service.');
      }
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

    if (token.startsWith('mock_token_') || classId.startsWith('cls-mock-')) {
      const newCode = `MATH${Math.floor(100 + Math.random() * 900)}`;
      setClassDetail((prev) => (prev ? { ...prev, join_code: newCode } : null));
      return;
    }

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
    if (token.startsWith('mock_token_') || classId.startsWith('cls-mock-')) {
      setTimeout(() => {
        setClassDetail((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            students: prev.students.map((s) =>
              s.student_id === studentId ? { ...s, status: 'active' } : s,
            ),
          };
        });
        setActionInProgressId(null);
      }, 300);
      return;
    }

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
    if (token.startsWith('mock_token_') || classId.startsWith('cls-mock-')) {
      setTimeout(() => {
        setClassDetail((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            students: prev.students.filter((s) => s.student_id !== studentId),
          };
        });
        setActionInProgressId(null);
      }, 300);
      return;
    }

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
      let csvText = '';
      if (token.startsWith('mock_token_') || classId.startsWith('cls-mock-')) {
        csvText = `student_id,student_name,roll_number,skill_code,skill_name,p_mastery,state\n`;
        heatmap?.students.forEach((st) => {
          heatmap?.skills.forEach((sk) => {
            csvText += `${st.student_id},"${st.student_name}",${st.roll_number || ''},${sk.skill_code},"${sk.skill_name}",0.75,mastered\n`;
          });
        });
      } else {
        csvText = await apiClient.exportClassCsv(classId, token);
      }
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
    // Optimistic update for immediate feedback
    setSuggestions((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        suggestions: prev.suggestions.map((s) =>
          s.suggestion_id === suggestionId ? { ...s, status: decision } : s,
        ),
      };
    });

    const token = getAuthToken();
    if (!token || token.startsWith('mock_token_') || classId.startsWith('cls-mock-')) return;

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
    } catch {
      // already optimistically updated
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

    if (token.startsWith('mock_token_') || classId.startsWith('cls-mock-')) {
      const mockAsgn: AssignmentResponse = {
        id: `asgn-mock-${Date.now()}`,
        class_id: classId,
        title: data.title,
        description: data.description,
        skill_ids: data.skill_ids,
        due_date: data.due_date || new Date(Date.now() + 7 * 864e5).toISOString(),
        status: 'active',
        total_assigned: data.student_ids.length || 10,
        completed_count: 0,
        students: data.student_ids.map((sid) => ({
          student_id: sid,
          student_name: 'Student',
          status: 'assigned',
        })),
        created_at: new Date().toISOString(),
      };
      setAssignments((prev) => [mockAsgn, ...prev]);
      return;
    }

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
        <Link href="/classes" className="mt-4 inline-block">
          <Button variant="outline">{tClasses('title')}</Button>
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
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header bar: breadcrumb, title, code, export & print */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1 print:hidden">
            <Link href="/classes">
              <Button variant="ghost" size="sm" className="cursor-pointer text-xs">
                ← {tTeacher('backToClasses')}
              </Button>
            </Link>
            <Badge variant="outline" className="text-xs">
              Class {classDetail.grade}
              {classDetail.section ? `-${classDetail.section}` : ''}
            </Badge>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            {classDetail.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Academic Year: {classDetail.academic_year || 'Current'} • {classDetail.students.length}{' '}
            Enrolled Students
          </p>
        </div>

        {/* Join code card & top actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5 shadow-xs">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                {tTeacher('joinCodeLabel')}
              </span>
              <div className="font-mono text-lg font-extrabold text-primary leading-tight">
                {classDetail.join_code}
              </div>
            </div>
            <div className="flex flex-col gap-1 print:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="cursor-pointer text-[11px] h-6 px-2"
              >
                {codeCopied ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRotate}
                className="cursor-pointer text-[11px] h-6 px-2 text-muted-foreground"
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
              className="cursor-pointer text-xs"
            >
              {isExportingCsv ? tTeacher('export.exporting') : tTeacher('export.downloadCsv')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="cursor-pointer text-xs"
            >
              🖨 {tTeacher('export.printView')}
            </Button>
          </div>
        </div>
      </div>

      {/* DPDP Statutory Privacy Notice Banner */}
      <div className="rounded-lg border border-muted bg-muted/40 p-3 text-xs text-muted-foreground flex items-center justify-between">
        <span>{tTeacher('export.privacyNotice')}</span>
        <Badge variant="outline" className="text-[11px] font-medium shrink-0 ml-2">
          DPDP Act 2023 Compliant
        </Badge>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium"
        >
          {errorMessage}
        </div>
      )}

      {/* Main Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-border mb-6 print:hidden">
          <TabsList className="flex flex-wrap gap-1 bg-transparent p-0">
            <TabsTrigger
              value="heatmap"
              className="rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card px-4 py-2 text-xs font-semibold"
            >
              📊 {tTeacher('tabs.heatmap')}
            </TabsTrigger>
            <TabsTrigger
              value="curriculum"
              className="rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card px-4 py-2 text-xs font-bold text-primary"
            >
              📚 Curriculum & Content Hub
            </TabsTrigger>
            <TabsTrigger
              value="clusters"
              className="rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card px-4 py-2 text-xs font-semibold"
            >
              🎯 {tTeacher('tabs.gapClusters')}
              {clusters && clusters.clusters.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                  {clusters.clusters.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="warnings"
              className="rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card px-4 py-2 text-xs font-semibold"
            >
              ⚠️ {tTeacher('tabs.earlyWarnings')}
              {warnings && warnings.warnings.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                  {warnings.warnings.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="suggestions"
              className="rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card px-4 py-2 text-xs font-semibold"
            >
              💡 {tTeacher('tabs.suggestions')}
              {suggestions && suggestions.suggestions.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {suggestions.suggestions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card px-4 py-2 text-xs font-semibold"
            >
              📝 {tTeacher('tabs.assignments')}
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card px-4 py-2 text-xs font-semibold"
            >
              📈 {tTeacher('tabs.progress')}
            </TabsTrigger>
            <TabsTrigger
              value="roster"
              className="rounded-t-lg border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card px-4 py-2 text-xs font-semibold"
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
                            {student.status === 'active' ? tClasses('active') : tClasses('pending')}
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
  );
}
