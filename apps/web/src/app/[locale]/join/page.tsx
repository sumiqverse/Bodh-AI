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
} from '@bodhai/ui';
import { getWebApiClient, setAuthSession } from '@/lib/api-client';

export default function StudentJoinPage(): React.JSX.Element {
  const t = useTranslations('auth');
  const router = useRouter();
  const apiClient = getWebApiClient();

  const [joinCode, setJoinCode] = React.useState<string>('');
  const [username, setUsername] = React.useState<string>('');
  const [pin, setPin] = React.useState<string>('');
  const [fullName, setFullName] = React.useState<string>('');
  const [rollNumber, setRollNumber] = React.useState<string>('');

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const joinRes = await apiClient.studentJoin({
        join_code: joinCode.trim().toUpperCase(),
        username: username.trim(),
        pin: pin.trim(),
        full_name: fullName.trim(),
        preferred_language: 'en',
      });

      if (joinRes?.access_token && joinRes?.user) {
        setAuthSession(joinRes.access_token, joinRes.user);
        if (typeof window !== 'undefined') {
          try {
            const pRes = await apiClient.getMyProfile(joinRes.access_token);
            const prof = pRes?.profile as Record<string, unknown> | undefined;
            if (prof?.curriculumCode) {
              localStorage.setItem('bodhai_student_curriculum', String(prof.curriculumCode));
            }
            if (prof?.classId) {
              localStorage.setItem('bodhai_selected_class_id', String(prof.classId));
            }
          } catch {
            // ignore
          }
        }
      }

      setSuccessMessage(t('joinSuccess'));
      setTimeout(() => {
        router.push('/student');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('authFailed');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center justify-center px-4 py-12">
      <Card className="w-full shadow-floating">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl font-bold tracking-tight text-foreground">
            {t('joinTitle')}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t('joinSubtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg bg-primary/5 p-3 border border-primary/10 text-xs text-muted-foreground">
              {t('privacyMinorNote')}
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium"
              >
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300 font-medium"
              >
                {successMessage}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="join-code"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('studentJoinCode')}
              </label>
              <Input
                id="join-code"
                type="text"
                required
                maxLength={6}
                placeholder={t('studentJoinCodePlaceholder')}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="font-mono uppercase tracking-widest text-center text-lg font-bold"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="student-username"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('studentUsername')}
              </label>
              <Input
                id="student-username"
                type="text"
                required
                placeholder={t('studentUsernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="student-pin"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('studentPin')}
              </label>
              <Input
                id="student-pin"
                type="password"
                required
                maxLength={8}
                placeholder={t('studentPinPlaceholder')}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="text-center tracking-widest"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="student-full-name"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('fullName')}
              </label>
              <Input
                id="student-full-name"
                type="text"
                required
                placeholder={t('fullNamePlaceholder')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="student-roll-no"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('rollNumber')}
              </label>
              <Input
                id="student-roll-no"
                type="text"
                placeholder={t('rollNumberPlaceholder')}
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full cursor-pointer py-2.5 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? t('joining') : t('joinButton')}
            </Button>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              <span>{t('alreadyHaveAccount')} </span>
              <Link
                href="/login"
                className="font-semibold text-primary underline underline-offset-4 hover:opacity-80"
              >
                {t('loginLink')}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
