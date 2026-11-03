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
} from '@bodhai/ui';
import {
  getWebApiClient,
  getCurrentUser,
  getAuthToken,
  getUserDashboardPath,
  syncSessionCookies,
  setAuthSession,
} from '@/lib/api-client';

export default function SignupPage(): React.JSX.Element {
  const t = useTranslations('auth');
  const router = useRouter();
  const apiClient = getWebApiClient();

  const [fullName, setFullName] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [schoolName, setSchoolName] = React.useState<string>('');
  const [experienceYears, setExperienceYears] = React.useState<string>('5');
  const [title, setTitle] = React.useState<string>('Secondary Mathematics Educator');
  const [preferredLanguage, setPreferredLanguage] = React.useState<string>('en');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = getCurrentUser();
      const token = getAuthToken();
      if (user && token) {
        syncSessionCookies(token, user);
        router.replace(getUserDashboardPath(user));
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await apiClient.teacherSignup({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        preferred_language: preferredLanguage,
      });

      // Save user's custom profile data for immediate linking upon login
      if (typeof window !== 'undefined') {
        const pendingProfile = {
          fullName: fullName.trim(),
          schoolName: schoolName.trim() || 'School',
          experienceYears: Number(experienceYears) || 0,
          title: title.trim() || 'Educator',
        };
        localStorage.setItem(
          `bodhai_pending_profile_${email.trim().toLowerCase()}`,
          JSON.stringify(pendingProfile),
        );
      }

      router.push(`/login?registered=true&email=${encodeURIComponent(email.trim())}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('authFailed');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectResetWithEnteredPassword = async (): Promise<void> => {
    if (!email || !password) return;
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.resetPassword({
        email: email.trim(),
        new_password: password,
      });
      setAuthSession(res.access_token, res.user);

      // Persist profile metadata
      if (typeof window !== 'undefined') {
        const pendingProfile = {
          fullName: fullName.trim() || res.user.full_name,
          schoolName: schoolName.trim() || 'School',
          experienceYears: Number(experienceYears) || 0,
          title: title.trim() || 'Educator',
        };
        localStorage.setItem(
          `bodhai_pending_profile_${email.trim().toLowerCase()}`,
          JSON.stringify(pendingProfile),
        );
      }

      router.push('/classes');
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : t('authFailed');
      if (msg.includes('API Error')) {
        msg = msg.replace(/^API Error \[\d+\]:\s*/, '');
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const languageOptions = [
    { value: 'en', label: t('langEnglish') },
    { value: 'hi', label: t('langHindi') },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-canvas-gradient flex flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card">
        <CardHeader className="text-center pb-4">
          <img
            src="/image.png"
            alt="BodhAI"
            className="mx-auto mb-3 h-14 w-14 rounded-full object-contain shrink-0 select-none drop-shadow-sm"
          />
          <CardTitle className="font-serif text-2xl font-black tracking-tight text-ink dark:text-white">
            {t('signupTitle')}
          </CardTitle>
          <CardDescription className="text-xs text-text-secondary dark:text-muted-foreground mt-1">
            {t('signupSubtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="rounded-2xl border-2 border-ink bg-surface-pink/60 dark:bg-surface-pink/20 p-3.5 text-xs sm:text-sm text-ink dark:text-pink-100 font-bold space-y-2.5 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-pink border-2 border-ink text-ink font-black text-xs shadow-xs">
                    !
                  </span>
                  <div className="leading-snug">{errorMessage}</div>
                </div>
                {(errorMessage.includes('already exists') || errorMessage.includes('409')) && (
                  <div className="space-y-2 pt-2 border-t border-ink/20 mt-1">
                    {password && password.length >= 8 && (
                      <button
                        type="button"
                        onClick={handleDirectResetWithEnteredPassword}
                        disabled={isLoading}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full bg-primary-orange text-white border-2 border-ink hover:bg-primary-orange-dark transition-all cursor-pointer shadow-xs"
                      >
                        {isLoading
                          ? 'Updating & Signing in...'
                          : '👉 Account exists: Set this password & Sign In'}
                      </button>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <Link
                        href={`/login?email=${encodeURIComponent(email.trim())}`}
                        className="font-bold text-ink underline underline-offset-2 hover:opacity-80"
                      >
                        Sign in with this account →
                      </Link>
                      <Link
                        href={`/login?email=${encodeURIComponent(email.trim())}&reset=true`}
                        className="font-bold text-ink underline underline-offset-2 hover:opacity-80"
                      >
                        Forgot / Reset Password →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="teacher-name"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('fullName')} *
              </label>
              <Input
                id="teacher-name"
                type="text"
                required
                placeholder={t('fullNamePlaceholder')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="teacher-signup-email"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('email')} *
              </label>
              <Input
                id="teacher-signup-email"
                type="email"
                required
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label
                  htmlFor="teacher-school"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  School / Institution *
                </label>
                <Input
                  id="teacher-school"
                  type="text"
                  required
                  placeholder="e.g. Kendriya Vidyalaya No. 1"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="teacher-exp"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Teaching Experience (Years) *
                </label>
                <Input
                  id="teacher-exp"
                  type="number"
                  min="0"
                  max="50"
                  required
                  placeholder="e.g. 5"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="teacher-title"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Subject / Designation
              </label>
              <Input
                id="teacher-title"
                type="text"
                placeholder="e.g. Secondary Mathematics Educator"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="teacher-signup-password"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('password')} *
              </label>
              <Input
                id="teacher-signup-password"
                type="password"
                required
                minLength={8}
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="teacher-lang"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t('preferredLanguage')}
              </label>
              <Select
                id="teacher-lang"
                options={languageOptions}
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="orange"
              className="w-full cursor-pointer py-3 font-bold rounded-full border-2 border-ink shadow-sm text-base hover:-translate-y-0.5 transition-transform"
              disabled={isLoading}
            >
              {isLoading ? t('signingUp') : t('signUpButton')}
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
