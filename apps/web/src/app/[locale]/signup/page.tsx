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

  const languageOptions = [
    { value: 'en', label: t('langEnglish') },
    { value: 'hi', label: t('langHindi') },
  ];

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg items-center justify-center px-4 py-12">
      <Card className="w-full shadow-floating">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl font-bold tracking-tight text-foreground">
            {t('signupTitle')}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t('signupSubtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium space-y-2"
              >
                <div>{errorMessage}</div>
                {(errorMessage.includes('already exists') || errorMessage.includes('409')) && (
                  <div className="flex flex-wrap items-center gap-3 pt-1.5 border-t border-destructive/20 mt-1">
                    <Link
                      href={`/login?email=${encodeURIComponent(email.trim())}`}
                      className="text-xs font-semibold text-primary dark:text-primary-foreground underline underline-offset-2 hover:opacity-80"
                    >
                      Sign in with this account →
                    </Link>
                    <Link
                      href={`/login?email=${encodeURIComponent(email.trim())}&reset=true`}
                      className="text-xs font-semibold text-primary dark:text-primary-foreground underline underline-offset-2 hover:opacity-80"
                    >
                      Forgot / Reset Password →
                    </Link>
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
              variant="primary"
              className="w-full cursor-pointer py-2.5 font-semibold"
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
