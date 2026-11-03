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
    <div className="min-h-[calc(100vh-8rem)] bg-canvas-gradient flex flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card">
        <CardHeader className="text-center pb-4">
          <img
            src="/image.png"
            alt="BodhAI"
            className="mx-auto mb-3 h-14 w-14 rounded-full object-contain shrink-0 select-none drop-shadow-sm"
          />
          <CardTitle className="font-serif text-2xl font-black tracking-tight text-ink dark:text-white">
            {t('joinTitle')}
          </CardTitle>
          <CardDescription className="text-xs text-text-secondary mt-1">
            {t('joinSubtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl bg-surface-cream/50 p-3 border-2 border-ink text-xs text-ink font-medium">
              {t('privacyMinorNote')}
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-2xl border-2 border-ink bg-surface-pink/60 dark:bg-surface-pink/20 p-3.5 text-xs sm:text-sm text-ink dark:text-pink-100 font-bold flex items-center gap-2.5 shadow-xs"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-pink border-2 border-ink text-ink font-black text-xs shadow-xs">
                  !
                </span>
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="rounded-2xl border-2 border-ink bg-emerald-100 dark:bg-emerald-950/40 p-3.5 text-xs sm:text-sm text-ink dark:text-emerald-200 font-bold flex items-center gap-2.5 shadow-xs"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-300 border-2 border-ink text-ink font-black text-xs shadow-xs">
                  ✓
                </span>
                <span className="leading-snug">{successMessage}</span>
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
                className="text-center tracking-widest font-mono font-bold"
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
              variant="orange"
              className="w-full cursor-pointer py-3 font-bold rounded-full border-2 border-ink shadow-sm text-base hover:-translate-y-0.5 transition-transform"
              disabled={isLoading}
            >
              {isLoading ? t('joining') : t('joinButton')}
            </Button>

            <div className="pt-2 text-center text-xs text-muted-foreground">
              <span>{t('alreadyHaveAccount')} </span>
              <Link
                href="/login"
                className="font-bold text-primary underline underline-offset-4 hover:opacity-80"
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
