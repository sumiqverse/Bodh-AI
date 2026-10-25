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
} from '@bodhai/ui';
import { getWebApiClient, getAuthToken } from '@/lib/api-client';
import type { ClassDetailResponse, StudentRosterItem } from '@bodhai/api-client';

interface PageProps {
  readonly params: Promise<{ id: string; locale: string }>;
}

export default function ClassDetailPage({ params }: PageProps): React.JSX.Element {
  const resolvedParams = React.use(params);
  const classId = resolvedParams.id;
  const t = useTranslations('classes');
  const router = useRouter();
  const apiClient = getWebApiClient();

  const [classDetail, setClassDetail] = React.useState<ClassDetailResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = React.useState<string | null>(null);

  const fetchClassDetails = React.useCallback(async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setIsLoading(true);
      const data = await apiClient.getClassDetails(classId, token);
      setClassDetail(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load class details';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, classId, router]);

  React.useEffect(() => {
    void fetchClassDetails();
  }, [fetchClassDetails]);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error approving student';
      setErrorMessage(msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error removing student';
      setErrorMessage(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRotate = async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await apiClient.rotateClassJoinCode(classId, token);
      setClassDetail((prev) => {
        if (!prev) return null;
        return { ...prev, join_code: res.join_code };
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error rotating code';
      setErrorMessage(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12 text-center text-muted-foreground">
        Loading class roster...
      </div>
    );
  }

  if (!classDetail) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12 text-center">
        <p className="text-destructive font-medium">{errorMessage || 'Class not found'}</p>
        <Link href="/classes" className="mt-4 inline-block">
          <Button variant="outline">Back to Classes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/classes">
              <Button variant="ghost" size="sm" className="cursor-pointer">
                ← {t('title')}
              </Button>
            </Link>
            <Badge variant="outline">
              Class {classDetail.grade}
              {classDetail.section ? `-${classDetail.section}` : ''}
            </Badge>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-foreground">
            {classDetail.name}
          </h1>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground">
              {t('joinCodeLabel')}
            </span>
            <div className="font-mono text-xl font-extrabold text-primary">
              {classDetail.join_code}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRotate}
            className="cursor-pointer text-xs"
          >
            {t('rotateCode')}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium"
        >
          {errorMessage}
        </div>
      )}

      {/* Roster Table */}
      <Card className="shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">{t('rosterTitle')}</CardTitle>
              <CardDescription className="text-xs">
                {classDetail.students.length} {t('studentsCount')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {classDetail.students.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('emptyRoster')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('studentName')}</TableHead>
                  <TableHead>{t('studentUsername')}</TableHead>
                  <TableHead>{t('rollNo')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classDetail.students.map((student: StudentRosterItem) => (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium text-foreground">
                      {student.full_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{student.username}</TableCell>
                    <TableCell>{student.roll_number || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={student.status === 'active' ? 'success' : 'outline'}
                        className="text-xs"
                      >
                        {student.status === 'active' ? t('active') : t('pending')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {student.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="cursor-pointer text-xs"
                            disabled={actionInProgressId === student.student_id}
                            onClick={() => handleApprove(student.student_id)}
                          >
                            {actionInProgressId === student.student_id
                              ? t('approving')
                              : t('approve')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer text-xs text-destructive hover:bg-destructive/10"
                          disabled={actionInProgressId === student.student_id}
                          onClick={() => handleRemove(student.student_id)}
                        >
                          {actionInProgressId === student.student_id ? t('removing') : t('remove')}
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
    </div>
  );
}
