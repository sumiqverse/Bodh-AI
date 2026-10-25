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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@bodhai/ui';
import { getWebApiClient, setAuthSession } from '@/lib/api-client';

export default function LoginPage(): React.JSX.Element {
  const t = useTranslations('auth');
  const router = useRouter();
  const apiClient = getWebApiClient();

  const [activeTab, setActiveTab] = React.useState<'teacher' | 'student'>('teacher');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Teacher fields
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');

  // Student fields
  const [joinCode, setJoinCode] = React.useState<string>('');
  const [studentUsername, setStudentUsername] = React.useState<string>('');
  const [studentPin, setStudentPin] = React.useState<string>('');

  const handleTeacherSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await apiClient.teacherLogin({ email, password });
      setAuthSession(res.access_token, res.user);
      if (res.user.role === 'admin') {
        router.push('/admin/stats');
      } else {
        router.push('/classes');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('authFailed');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await apiClient.studentLogin({
        join_code: joinCode.trim().toUpperCase(),
        username: studentUsername.trim(),
        pin: studentPin.trim(),
      });
      setAuthSession(res.access_token, res.user);
      router.push('/consent');
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
            {t('loginTitle')}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t('loginSubtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as 'teacher' | 'student');
              setErrorMessage(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="teacher">{t('tabTeacher')}</TabsTrigger>
              <TabsTrigger value="student">{t('tabStudent')}</TabsTrigger>
            </TabsList>

            {errorMessage && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium"
              >
                {errorMessage}
              </div>
            )}

            <TabsContent value="teacher">
              <form onSubmit={handleTeacherSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="teacher-email"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {t('email')}
                  </label>
                  <Input
                    id="teacher-email"
                    type="email"
                    required
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="teacher-password"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {t('password')}
                  </label>
                  <Input
                    id="teacher-password"
                    type="password"
                    required
                    placeholder={t('passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full cursor-pointer py-2.5 font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? t('signingIn') : t('signInButton')}
                </Button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <span className="relative bg-card px-2 text-xs uppercase tracking-wider text-muted-foreground">
                    {t('orContinueWith')}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full cursor-pointer py-2 text-sm font-medium"
                  onClick={() => {
                    setErrorMessage('Google OAuth redirect initiated (Mock provider)');
                  }}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  {t('googleSignIn')}
                </Button>

                <div className="pt-2 text-center text-xs text-muted-foreground">
                  <span>{t('noAccount')} </span>
                  <Link
                    href="/signup"
                    className="font-semibold text-primary underline underline-offset-4 hover:opacity-80"
                  >
                    {t('signupLink')}
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="student">
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div className="rounded-lg bg-primary/5 p-3 border border-primary/10 text-xs text-muted-foreground">
                  {t('privacyMinorNote')}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="student-join-code"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {t('studentJoinCode')}
                  </label>
                  <Input
                    id="student-join-code"
                    type="text"
                    required
                    maxLength={6}
                    placeholder={t('studentJoinCodePlaceholder')}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase tracking-widest text-center"
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
                    value={studentUsername}
                    onChange={(e) => setStudentUsername(e.target.value)}
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
                    value={studentPin}
                    onChange={(e) => setStudentPin(e.target.value)}
                    className="text-center tracking-widest"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full cursor-pointer py-2.5 font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? t('signingIn') : t('studentSignInButton')}
                </Button>

                <div className="pt-2 text-center text-xs text-muted-foreground">
                  <span>{t('studentJoinPrompt')} </span>
                  <Link
                    href="/join"
                    className="font-semibold text-primary underline underline-offset-4 hover:opacity-80"
                  >
                    {t('studentJoinLink')}
                  </Link>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
