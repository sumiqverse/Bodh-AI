'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@bodhai/ui';
import { AdminNav } from '@/components/admin/AdminNav';
import { getWebApiClient, getAuthToken, getCurrentUser } from '@/lib/api-client';
import type { AdminSchoolStatsResponse } from '@bodhai/api-client';

export default function AdminStatsPage(): React.JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();
  const apiClient = getWebApiClient();

  const [stats, setStats] = React.useState<AdminSchoolStatsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const user = getCurrentUser();
    const token = getAuthToken();
    if (!user || !token) {
      router.push('/login');
      return;
    }

    if (user.role !== 'admin') {
      router.push('/classes');
      return;
    }

    apiClient
      .getSchoolStats(token)
      .then((data) => setStats(data))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Error fetching stats';
        setErrorMessage(msg);
      })
      .finally(() => setIsLoading(false));
  }, [apiClient, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12 text-center text-muted-foreground">
        {t('loadingStats')}
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <AdminNav />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div>
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
          >
            {t('privacyBadge')}
          </Badge>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium"
        >
          {errorMessage}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('totalSchools')}
                </CardDescription>
                <CardTitle className="font-serif text-3xl font-extrabold text-primary">
                  {stats.total_schools}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('totalClasses')}
                </CardDescription>
                <CardTitle className="font-serif text-3xl font-extrabold text-foreground">
                  {stats.total_classes}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('totalStudents')}
                </CardDescription>
                <CardTitle className="font-serif text-3xl font-extrabold text-foreground">
                  {stats.total_students}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('totalAttempts')}
                </CardDescription>
                <CardTitle className="font-serif text-3xl font-extrabold text-foreground">
                  {stats.total_attempts}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-lg font-bold">{t('averageMastery')}</CardTitle>
                <CardDescription className="text-xs">
                  Bayesian Knowledge Tracing skill mastery index
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="font-serif text-4xl font-extrabold text-primary">
                    {(stats.average_mastery * 100).toFixed(1)}%
                  </div>
                  <div className="h-3 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, stats.average_mastery * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-lg font-bold">{t('gradeDistribution')}</CardTitle>
                <CardDescription className="text-xs">
                  Student distribution across grade levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.grade_distribution).map(([gradeKey, count]) => (
                    <div key={gradeKey} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-muted-foreground">{gradeKey}</span>
                      <Badge variant="outline" className="font-mono">
                        {count} students
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
