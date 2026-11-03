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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@bodhai/ui';
import {
  getWebApiClient,
  setAuthSession,
  getCurrentUser,
  getAuthToken,
  getUserDashboardPath,
  syncSessionCookies,
} from '@/lib/api-client';

export default function LoginPage(): React.JSX.Element {
  const t = useTranslations('auth');
  const router = useRouter();
  const apiClient = getWebApiClient();

  const [activeTab, setActiveTab] = React.useState<'teacher' | 'student'>('teacher');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Teacher fields
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');

  // Password reset fields
  const [isResetOpen, setIsResetOpen] = React.useState<boolean>(false);
  const [resetEmail, setResetEmail] = React.useState<string>('');
  const [resetNewPassword, setResetNewPassword] = React.useState<string>('');
  const [resetConfirmPassword, setResetConfirmPassword] = React.useState<string>('');
  const [resetLoading, setResetLoading] = React.useState<boolean>(false);
  const [resetError, setResetError] = React.useState<string | null>(null);

  // Student fields
  const [studentUsername, setStudentUsername] = React.useState<string>('');
  const [studentPin, setStudentPin] = React.useState<string>('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = getCurrentUser();
      const token = getAuthToken();
      if (user && token) {
        syncSessionCookies(token, user);
        const params = new URLSearchParams(window.location.search);
        const redirectParam = params.get('redirect');
        const safeRedirect =
          redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
            ? redirectParam
            : null;
        router.replace(safeRedirect || getUserDashboardPath(user));
        return;
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('registered') === 'true') {
        setSuccessMessage(t('signupSuccess'));
      } else if (params.get('expired') === 'true') {
        setErrorMessage(t('sessionExpired'));
      }
      const prefillEmail = params.get('email');
      if (prefillEmail) {
        setEmail(prefillEmail);
        setResetEmail(prefillEmail);
      }
      if (params.get('reset') === 'true') {
        setIsResetOpen(true);
      }
    }
  }, [t, router]);

  const handleResetPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setResetError(null);

    if (resetNewPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await apiClient.resetPassword({
        email: resetEmail.trim(),
        new_password: resetNewPassword,
      });
      setAuthSession(res.access_token, res.user);
      setSuccessMessage('Password reset successfully! Redirecting to your dashboard...');
      setIsResetOpen(false);
      setTimeout(() => {
        if (res.user.role === 'admin') {
          router.push('/admin/stats');
        } else {
          router.push('/classes');
        }
      }, 500);
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Failed to reset password.';
      if (msg.includes('API Error')) {
        msg = msg.replace(/^API Error \[\d+\]:\s*/, '');
      }
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleDirectResetWithEnteredPassword = async (): Promise<void> => {
    if (!email || !password) return;
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long to save.');
      return;
    }
    setResetLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.resetPassword({
        email: email.trim(),
        new_password: password,
      });
      setAuthSession(res.access_token, res.user);
      setSuccessMessage('Password updated successfully! Redirecting to your classes...');
      setTimeout(() => {
        if (res.user.role === 'admin') {
          router.push('/admin/stats');
        } else {
          router.push('/classes');
        }
      }, 500);
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Failed to update password.';
      if (msg.includes('API Error')) {
        msg = msg.replace(/^API Error \[\d+\]:\s*/, '');
      }
      setErrorMessage(msg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleTeacherSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await apiClient.teacherLogin({ email, password });
      setAuthSession(res.access_token, res.user);

      // Sync authentic live profile directly from PostgreSQL database
      if (typeof window !== 'undefined') {
        try {
          const profileRes = await apiClient.getMyProfile(res.access_token);
          if (profileRes?.profile) {
            localStorage.setItem(
              `bodhai_profile_${res.user.id}`,
              JSON.stringify(profileRes.profile),
            );
          }
          localStorage.removeItem(`bodhai_pending_profile_${email.trim().toLowerCase()}`);
        } catch {
          // ignore profile sync error
        }
      }

      const params =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const redirectParam = params?.get('redirect');
      const cleanPath = redirectParam?.replace(/^\/(?:en|hi)(?=\/|$)/, '') || null;
      const safeRedirect =
        cleanPath && cleanPath.startsWith('/') && !cleanPath.startsWith('//') ? cleanPath : null;

      if (safeRedirect) {
        router.push(safeRedirect);
      } else if (res.user.role === 'admin') {
        router.push('/admin/stats');
      } else {
        router.push('/classes');
      }
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : t('authFailed');
      if (msg.includes('Invalid email or password') || msg.includes('401')) {
        msg = "Invalid email or password. If you don't have an account yet, please sign up below.";
      } else if (msg.includes('API Error')) {
        msg = msg.replace(/^API Error \[\d+\]:\s*/, '');
      }
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
        username: studentUsername.trim(),
        pin: studentPin.trim(),
      });
      setAuthSession(res.access_token, res.user);
      if (typeof window !== 'undefined') {
        try {
          const pRes = await apiClient.getMyProfile(res.access_token);
          const prof = pRes?.profile as Record<string, unknown> | undefined;
          if (prof?.curriculumCode) {
            localStorage.setItem('bodhai_student_curriculum', String(prof.curriculumCode));
          }
        } catch {
          // ignore
        }
      }
      const params =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const redirectParam = params?.get('redirect');
      const cleanPath = redirectParam?.replace(/^\/(?:en|hi)(?=\/|$)/, '') || null;
      const safeRedirect =
        cleanPath && cleanPath.startsWith('/') && !cleanPath.startsWith('//') ? cleanPath : null;

      if (safeRedirect) {
        router.push(safeRedirect);
      } else {
        router.push('/student');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('authFailed');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-canvas-gradient flex flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card">
        <CardHeader className="text-center pb-3">
          <img
            src="/image.png"
            alt="BodhAI"
            className="mx-auto mb-3 h-14 w-14 rounded-full object-contain shrink-0 select-none drop-shadow-sm"
          />
          <CardTitle className="font-serif text-2xl font-black tracking-tight text-ink dark:text-white">
            {t('loginTitle')}
          </CardTitle>
          <CardDescription className="text-xs text-text-secondary dark:text-muted-foreground mt-1">
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
            <TabsList className="grid w-full grid-cols-2 rounded-full border-2 border-ink bg-surface-cream/50 p-1 shadow-xs">
              <TabsTrigger value="teacher" className="rounded-full font-bold text-xs py-2">
                {t('tabTeacher')}
              </TabsTrigger>
              <TabsTrigger value="student" className="rounded-full font-bold text-xs py-2">
                {t('tabStudent')}
              </TabsTrigger>
            </TabsList>

            {successMessage && !errorMessage && (
              <div
                role="status"
                className="mt-4 rounded-2xl border-2 border-ink bg-emerald-100 dark:bg-emerald-950/40 p-3.5 text-xs sm:text-sm text-ink dark:text-emerald-200 font-bold shadow-xs flex items-center gap-2.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-300 border-2 border-ink text-ink font-black text-xs shadow-xs">
                  ✓
                </span>
                <div className="leading-snug">{successMessage}</div>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="mt-4 rounded-2xl border-2 border-ink bg-surface-pink/60 dark:bg-surface-pink/20 p-3.5 text-xs sm:text-sm text-ink dark:text-pink-100 font-bold space-y-2.5 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-pink border-2 border-ink text-ink font-black text-xs shadow-xs">
                    !
                  </span>
                  <div className="leading-snug">{errorMessage}</div>
                </div>
                {email && password && password.length >= 8 && (
                  <div className="pt-2 border-t border-ink/20 space-y-2">
                    <button
                      type="button"
                      onClick={handleDirectResetWithEnteredPassword}
                      disabled={resetLoading || isLoading}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full bg-primary-orange text-white border-2 border-ink hover:bg-primary-orange-dark transition-all cursor-pointer shadow-xs"
                    >
                      {resetLoading
                        ? 'Saving password & signing in...'
                        : '👉 Set entered password as your BodhAI password & Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        // Keep the password the user already entered.
                        setIsLoading(true);
                        setErrorMessage(null);
                        try {
                          const res = await apiClient.teacherLogin({
                            email: email.trim(),
                            password,
                          });
                          setAuthSession(res.access_token, res.user);
                          router.push('/classes');
                        } catch (e: unknown) {
                          setErrorMessage(e instanceof Error ? e.message : 'Login failed');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={resetLoading || isLoading}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full bg-surface-cream text-ink border-2 border-ink hover:bg-surface-yellow transition-all cursor-pointer shadow-xs"
                    >
                      🔐 Retry sign-in with entered password
                    </button>
                  </div>
                )}
                {email && (
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setResetError(null);
                        setIsResetOpen(true);
                      }}
                      className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 cursor-pointer text-ink dark:text-pink-200 font-bold"
                    >
                      Or enter a different new password →
                    </button>
                  </div>
                )}
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
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="teacher-password"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {t('password')}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setResetError(null);
                        setIsResetOpen(true);
                      }}
                      className="text-xs font-medium text-primary hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
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
                  variant="orange"
                  className="w-full cursor-pointer py-3 font-bold rounded-full border-2 border-ink shadow-sm text-base hover:-translate-y-0.5 transition-transform"
                  disabled={isLoading}
                >
                  {isLoading ? t('signingIn') : t('signInButton')}
                </Button>

                <div className="pt-2 text-center text-xs text-muted-foreground">
                  <span>{t('noAccount')} </span>
                  <Link
                    href="/signup"
                    className="font-bold text-primary underline underline-offset-4 hover:opacity-80"
                  >
                    {t('signupLink')}
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="student">
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div className="rounded-xl bg-surface-cream/50 p-3 border-2 border-ink text-xs text-ink font-medium">
                  {t('privacyMinorNote')}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="student-username"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {t('studentUsername')} *
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
                    {t('studentPin')} *
                  </label>
                  <Input
                    id="student-pin"
                    type="password"
                    required
                    maxLength={8}
                    placeholder={t('studentPinPlaceholder')}
                    value={studentPin}
                    onChange={(e) => setStudentPin(e.target.value)}
                    className="text-center tracking-widest font-mono text-lg font-bold"
                  />
                </div>

                <Button
                  type="submit"
                  variant="orange"
                  className="w-full cursor-pointer py-3 font-bold rounded-full border-2 border-ink shadow-sm text-base hover:-translate-y-0.5 transition-transform"
                  disabled={isLoading}
                >
                  {isLoading ? t('signingIn') : t('studentSignInButton')}
                </Button>

                <div className="pt-2 text-center text-xs text-muted-foreground">
                  <span>{t('studentJoinPrompt')} </span>
                  <Link
                    href="/join"
                    className="font-bold text-primary underline underline-offset-4 hover:opacity-80"
                  >
                    {t('studentJoinLink')}
                  </Link>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="max-w-md rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-black text-ink dark:text-white">
              Reset BodhAI Password
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary dark:text-muted-foreground">
              Password recovery is currently unavailable. Contact your school administrator for
              assistance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 pt-2">
            {resetError && (
              <div
                role="alert"
                className="rounded-2xl border-2 border-ink bg-surface-pink/60 dark:bg-surface-pink/20 p-3 text-xs text-ink dark:text-pink-100 font-bold flex items-center gap-2.5 shadow-xs"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-pink border-2 border-ink text-ink font-black text-[10px] shadow-xs">
                  !
                </span>
                <span className="leading-snug">{resetError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="reset-email"
                className="text-xs font-semibold uppercase tracking-wider text-text-secondary"
              >
                Account Email
              </label>
              <Input
                id="reset-email"
                type="email"
                required
                placeholder="teacher@school.edu.in"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="reset-new-password"
                className="text-xs font-semibold uppercase tracking-wider text-text-secondary"
              >
                New Password (min 8 characters)
              </label>
              <Input
                id="reset-new-password"
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="reset-confirm-password"
                className="text-xs font-semibold uppercase tracking-wider text-text-secondary"
              >
                Confirm New Password
              </label>
              <Input
                id="reset-confirm-password"
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={resetConfirmPassword}
                onChange={(e) => setResetConfirmPassword(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsResetOpen(false)}
                disabled={resetLoading}
                className="rounded-full border-2 border-ink font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="orange"
                size="sm"
                disabled
                className="cursor-pointer font-bold rounded-full border-2 border-ink shadow-xs"
              >
                {resetLoading ? 'Updating...' : 'Update & Sign In'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
