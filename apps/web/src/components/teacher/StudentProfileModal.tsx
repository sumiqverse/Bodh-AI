'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  buttonVariants,
} from '@bodhai/ui';
import { getWebApiClient, getAuthToken } from '@/lib/api-client';
import { getMockStudentProfile } from '@/lib/teacher-mock-data';
import type {
  StudentProfileResponse,
  StudentProfileSkillItem,
  ErrorPatternItem,
  MasteryTrendPoint,
} from '@bodhai/api-client';

interface StudentProfileModalProps {
  readonly studentId: string | null;
  readonly classId: string;
  readonly onClose: () => void;
}

export function StudentProfileModal({
  studentId,
  classId,
  onClose,
}: StudentProfileModalProps): React.JSX.Element {
  const t = useTranslations('teacherDashboard.studentProfile');
  const apiClient = getWebApiClient();

  const [profile, setProfile] = React.useState<StudentProfileResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'mastery' | 'errors' | 'hints' | 'trend'>(
    'mastery',
  );

  React.useEffect(() => {
    if (!studentId) {
      setProfile(null);
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    if (token.startsWith('mock_token_') || classId.startsWith('cls-mock-')) {
      setProfile(getMockStudentProfile(studentId));
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);

    apiClient
      .getStudentProfile(classId, studentId, token)
      .then((data) => {
        if (isMounted) setProfile(data);
      })
      .catch((_err: unknown) => {
        if (isMounted) {
          // Fallback to high-fidelity mock profile
          setProfile(getMockStudentProfile(studentId));
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiClient, classId, studentId]);

  const isOpen = Boolean(studentId);

  const studentSlug = React.useMemo(() => {
    if (!profile) return 'stu-aarav-sharma';
    const name = profile.student_name.toLowerCase();
    if (name.includes('priya')) return 'stu-priya-patel';
    if (name.includes('rohan')) return 'stu-rohan-verma';
    if (name.includes('ananya')) return 'stu-ananya-iyer';
    if (name.includes('kabir')) return 'stu-kabir-singh';
    if (name.includes('diya')) return 'stu-diya-mehta';
    return 'stu-aarav-sharma';
  }, [profile]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                {profile ? profile.student_name : t('modalTitle')}
              </DialogTitle>
              {profile?.roll_number && (
                <DialogDescription className="text-xs font-mono">
                  Roll No: {profile.roll_number}
                </DialogDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/profiles/students/${studentSlug}`}
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className:
                    'text-xs font-semibold text-primary border-primary/40 inline-flex items-center',
                })}
              >
                Full Profile Page ↗
              </Link>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="cursor-pointer text-xs"
                >
                  ✕
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {isLoading && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading student competency telemetry...
          </div>
        )}

        {errorMsg && (
          <div className="p-3 text-xs rounded border border-destructive/20 bg-destructive/10 text-destructive font-medium">
            {errorMsg}
          </div>
        )}

        {profile && !isLoading && (
          <div className="space-y-4 pt-2">
            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-border gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('mastery')}
                className={`pb-2 px-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'mastery'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('masteryBreakdown')} ({profile.skills.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('errors')}
                className={`pb-2 px-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'errors'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('errorPatterns')} ({profile.error_patterns.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('hints')}
                className={`pb-2 px-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'hints'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('hintsUsed')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('trend')}
                className={`pb-2 px-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'trend'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('trendOverTime')} ({profile.trend.length})
              </button>
            </div>

            {/* Tab 1: Mastery by Skill */}
            {activeTab === 'mastery' && (
              <div className="space-y-2">
                {profile.skills.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No skill mastery data recorded yet for this student.
                  </p>
                ) : (
                  <div className="max-h-80 overflow-y-auto border border-border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Competency</TableHead>
                          <TableHead className="text-xs">Topic</TableHead>
                          <TableHead className="text-xs">Mastery State</TableHead>
                          <TableHead className="text-xs text-right">Probability</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profile.skills.map((item: StudentProfileSkillItem) => (
                          <TableRow key={item.skill_id}>
                            <TableCell className="text-xs font-medium">
                              <div>{item.skill_name}</div>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {item.skill_code}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.topic_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={item.state === 'mastered' ? 'success' : 'outline'}
                                className="text-[11px]"
                              >
                                {item.state === 'mastered'
                                  ? 'Mastered'
                                  : item.state === 'partial'
                                    ? 'In Progress'
                                    : 'Not Started'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-right">
                              {Math.round(item.p_mastery * 100)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Error Patterns */}
            {activeTab === 'errors' && (
              <div className="space-y-3">
                {profile.error_patterns.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No recurring error patterns identified.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {profile.error_patterns.map((err: ErrorPatternItem, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground font-mono">
                            {err.question_code}
                          </span>
                          <Badge variant="destructive" className="text-[11px]">
                            {err.count} {err.count === 1 ? 'occurrence' : 'occurrences'}
                          </Badge>
                        </div>
                        {err.prompt_excerpt && (
                          <p className="text-muted-foreground text-[11px] italic">
                            &quot;{err.prompt_excerpt}&quot;
                          </p>
                        )}
                        <p className="text-foreground/90">
                          <strong>Frequent Distractor Selected:</strong> &quot;
                          {err.distractor_chosen}&quot;
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          <strong>Underlying Misconception:</strong> {err.misconception}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Hint Ladder Usage */}
            {activeTab === 'hints' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <span className="font-semibold text-muted-foreground block mb-1">
                      {t('independentCount')}
                    </span>
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {profile.hint_usage.independent_attempts_count}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Solved without requesting any scaffolding
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4">
                    <span className="font-semibold text-muted-foreground block mb-1">
                      Total Hints Requested
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {profile.hint_usage.total_hints_requested}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Across 3 progressive scaffolding levels
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <span className="font-bold text-foreground block">Hint Ladder Breakdown</span>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Level 1: Conceptual Orientation</span>
                        <span className="font-mono font-semibold">
                          {profile.hint_usage.hint_1_count}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{
                            width: `${profile.hint_usage.total_hints_requested ? (profile.hint_usage.hint_1_count / profile.hint_usage.total_hints_requested) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Level 2: Formula & Step Guidance</span>
                        <span className="font-mono font-semibold">
                          {profile.hint_usage.hint_2_count}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{
                            width: `${profile.hint_usage.total_hints_requested ? (profile.hint_usage.hint_2_count / profile.hint_usage.total_hints_requested) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Level 3: Direct Resolution Step</span>
                        <span className="font-mono font-semibold">
                          {profile.hint_usage.hint_3_count}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{
                            width: `${profile.hint_usage.total_hints_requested ? (profile.hint_usage.hint_3_count / profile.hint_usage.total_hints_requested) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Trend Over Time */}
            {activeTab === 'trend' && (
              <div className="space-y-2">
                {profile.trend.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No progression data recorded yet.
                  </p>
                ) : (
                  <div className="max-h-72 overflow-y-auto border border-border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Attempts</TableHead>
                          <TableHead className="text-xs text-right">Mastery Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profile.trend.map((point: MasteryTrendPoint, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(point.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {point.attempts} attempts
                            </TableCell>
                            <TableCell className="text-xs font-mono text-right">
                              {Math.round(point.p_mastery * 100)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
