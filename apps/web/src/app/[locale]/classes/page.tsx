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
  Input,
  Select,
  Badge,
} from '@bodhai/ui';
import { getWebApiClient, getAuthToken, getCurrentUser } from '@/lib/api-client';
import type { ClassResponse } from '@bodhai/api-client';

export default function ClassesPage(): React.JSX.Element {
  const t = useTranslations('classes');
  const router = useRouter();
  const apiClient = getWebApiClient();

  const [classesList, setClassesList] = React.useState<ClassResponse[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isCreating, setIsCreating] = React.useState<boolean>(false);
  const [rotatingId, setRotatingId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // New class form state
  const [className, setClassName] = React.useState<string>('');
  const [grade, setGrade] = React.useState<string>('8');
  const [section, setSection] = React.useState<string>('A');
  const [academicYear, setAcademicYear] = React.useState<string>('2024-2025');

  const fetchClasses = React.useCallback(async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setIsLoading(true);
      const data = await apiClient.listClasses(token);
      setClassesList(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load classes';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, router]);

  React.useEffect(() => {
    const user = getCurrentUser();
    if (user && user.role === 'admin') {
      router.push('/admin/stats');
      return;
    }
    void fetchClasses();
  }, [fetchClasses, router]);

  const handleCreateClass = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    setErrorMessage(null);
    setIsCreating(true);

    try {
      const newClass = await apiClient.createClass(
        {
          name: className.trim(),
          grade: parseInt(grade, 10),
          section: section.trim() || 'A',
          academic_year: academicYear.trim(),
        },
        token,
      );
      setClassesList((prev) => [newClass, ...prev]);
      setClassName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating class';
      setErrorMessage(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRotateCode = async (classId: string): Promise<void> => {
    const token = getAuthToken();
    if (!token) return;

    setRotatingId(classId);
    try {
      const res = await apiClient.rotateClassJoinCode(classId, token);
      setClassesList((prev) =>
        prev.map((c) => (c.id === classId ? { ...c, join_code: res.join_code } : c)),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error rotating code';
      setErrorMessage(msg);
    } finally {
      setRotatingId(null);
    }
  };

  const gradeOptions = [
    { value: '6', label: 'Class 6' },
    { value: '7', label: 'Class 7' },
    { value: '8', label: 'Class 8' },
    { value: '9', label: 'Class 9' },
    { value: '10', label: 'Class 10' },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium"
        >
          {errorMessage}
        </div>
      )}

      {/* Create Class Section */}
      <Card className="shadow-xs border-border/80">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{t('createNewClass')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleCreateClass}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end"
          >
            <div className="space-y-1.5 lg:col-span-2">
              <label
                htmlFor="new-class-name"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('className')}
              </label>
              <Input
                id="new-class-name"
                required
                placeholder={t('classNamePlaceholder')}
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-class-grade"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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

            <div className="space-y-1.5">
              <label
                htmlFor="new-class-section"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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

            <div className="space-y-1.5">
              <label
                htmlFor="new-class-academic-year"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('academicYear')}
              </label>
              <Input
                id="new-class-academic-year"
                placeholder={t('academicYearPlaceholder')}
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full cursor-pointer py-2 font-semibold"
                disabled={isCreating}
              >
                {isCreating ? t('creating') : t('createButton')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Classrooms List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading classrooms...</div>
        ) : classesList.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-muted-foreground">{t('noClasses')}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classesList.map((cls) => (
              <Card
                key={cls.id}
                className="flex flex-col justify-between shadow-xs hover:border-primary/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg font-bold truncate">{cls.name}</CardTitle>
                    <Badge variant="outline" className="shrink-0 font-medium">
                      Class {cls.grade}
                      {cls.section ? `-${cls.section}` : ''}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    {cls.academic_year || '2024-2025'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {t('joinCodeLabel')}
                      </span>
                      <div className="font-mono text-xl font-extrabold tracking-wider text-primary">
                        {cls.join_code}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer text-xs"
                      onClick={() => handleRotateCode(cls.id)}
                      disabled={rotatingId === cls.id}
                    >
                      {rotatingId === cls.id ? t('rotating') : t('rotateCode')}
                    </Button>
                  </div>

                  <Link href={`/classes/${cls.id}`} className="block w-full">
                    <Button variant="outline" size="sm" className="w-full cursor-pointer">
                      {t('viewRoster')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
