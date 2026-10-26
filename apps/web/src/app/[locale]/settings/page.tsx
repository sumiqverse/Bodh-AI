'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from '@bodhai/ui';
import { getWebApiClient, getAuthToken, getCurrentUser, clearAuthSession } from '@/lib/api-client';
import type { UserResponse } from '@bodhai/api-client';

export default function SettingsPage(): React.JSX.Element {
  const t = useTranslations('settings');
  const router = useRouter();
  const apiClient = getWebApiClient();

  const [currentUser, setCurrentUser] = React.useState<UserResponse | null>(null);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const user = getCurrentUser();
    const token = getAuthToken();
    if (!user || !token) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);

    // Fetch latest profile from API
    apiClient
      .getMe(token)
      .then((me) => setCurrentUser(me))
      .catch(() => {
        // Fall back to stored session user
      });
  }, [apiClient, router]);

  const handleExportData = async (): Promise<void> => {
    const token = getAuthToken();
    if (!token || !currentUser) return;

    setErrorMessage(null);
    setStatusMessage(null);
    setIsExporting(true);

    try {
      const data = await apiClient.exportStudentData(currentUser.id, token);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bodhai-data-export-${currentUser.username || currentUser.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('Data export downloaded successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error exporting data';
      setErrorMessage(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    const confirmed = window.confirm(t('deleteConfirm'));
    if (!confirmed) return;

    const token = getAuthToken();
    if (!token || !currentUser) return;

    setErrorMessage(null);
    setStatusMessage(null);
    setIsDeleting(true);

    try {
      await apiClient.deleteStudentData(currentUser.id, token);
      setStatusMessage(t('deleteSuccess'));
      setTimeout(() => {
        clearAuthSession();
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error anonymizing account';
      setErrorMessage(msg);
      setIsDeleting(false);
    }
  };

  const handleLogout = (): void => {
    clearAuthSession();
    router.push('/login');
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 text-center text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="cursor-pointer text-xs"
        >
          Sign Out
        </Button>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300 font-medium"
        >
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium"
        >
          {errorMessage}
        </div>
      )}

      {/* Shared Device Warning Card */}
      <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              ⚠️
            </span>
            <CardTitle className="text-lg font-bold text-amber-900 dark:text-amber-100">
              {t('deviceShareWarningTitle')}
            </CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-200/90 leading-relaxed pt-1">
            {t('deviceShareWarningDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="min-h-[42px] cursor-pointer text-xs font-semibold border-amber-500/40 text-amber-900 dark:text-amber-100 hover:bg-amber-500/10"
          >
            {t('logoutButton')}
          </Button>
        </CardContent>
      </Card>

      {/* Language Preferences Card */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold">{t('changeLanguageTitle')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {t('changeLanguageDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={currentUser.preferred_language === 'en' ? 'primary' : 'outline'}
              size="md"
              onClick={() => {
                router.replace('/settings', { locale: 'en' });
              }}
              className="min-h-[44px] cursor-pointer text-sm font-semibold"
            >
              English
            </Button>
            <Button
              type="button"
              variant={currentUser.preferred_language === 'hi' ? 'primary' : 'outline'}
              size="md"
              onClick={() => {
                router.replace('/settings', { locale: 'hi' });
              }}
              className="min-h-[44px] cursor-pointer text-sm font-semibold"
            >
              हिन्दी (Hindi)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Card */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{t('profileHeading')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('email')}
              </span>
              <p className="mt-1 text-sm font-medium text-foreground">
                {currentUser.email || '— (Minor account with zero email collected)'}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('username')}
              </span>
              <p className="mt-1 text-sm font-medium text-foreground">
                {currentUser.username || '—'}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('role')}
              </span>
              <div className="mt-1">
                <Badge variant="default" className="text-xs uppercase">
                  {currentUser.role}
                </Badge>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('preferredLanguage')}
              </span>
              <p className="mt-1 text-sm font-medium text-foreground uppercase">
                {currentUser.preferred_language || 'en'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statutory Data Rights Card */}
      <Card className="shadow-xs border-border/80">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{t('dataRightsHeading')}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t('dataRightsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer font-medium"
              disabled={isExporting}
              onClick={handleExportData}
            >
              {isExporting ? t('downloading') : t('downloadJson')}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="cursor-pointer font-medium text-destructive hover:bg-destructive/10"
              disabled={isDeleting}
              onClick={handleDeleteAccount}
            >
              {isDeleting ? t('deleting') : t('deleteAccount')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
