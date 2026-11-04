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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
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

  const [activeTab, setActiveTab] = React.useState<'student' | 'teacher'>('student');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Teacher fields
  const [teacherFullName, setTeacherFullName] = React.useState<string>('');
  const [teacherEmail, setTeacherEmail] = React.useState<string>('');
  const [teacherPassword, setTeacherPassword] = React.useState<string>('');
  const [schoolName, setSchoolName] = React.useState<string>('');
  const [experienceYears, setExperienceYears] = React.useState<string>('5');
  const [title, setTitle] = React.useState<string>('Secondary Mathematics Educator');
  const [teacherLanguage, setTeacherLanguage] = React.useState<string>('en');

  // Student fields
  const [studentFullName, setStudentFullName] = React.useState<string>('');
  const [studentJoinCode, setStudentJoinCode] = React.useState<string>('');
  const [studentUsername, setStudentUsername] = React.useState<string>('');
  const [studentPin, setStudentPin] = React.useState<string>('');
  const [studentLanguage, setStudentLanguage] = React.useState<string>('en');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = getCurrentUser();
      const token = getAuthToken();
      if (user && token) {
        syncSessionCookies(token, user);
        router.replace(getUserDashboardPath(user));
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role');
      if (roleParam === 'teacher' || roleParam === 'student') {
        setActiveTab(roleParam);
      }
      const codeParam = params.get('code');
      if (codeParam) {
        setStudentJoinCode(codeParam.toUpperCase());
        setActiveTab('student');
      }
    }
  }, [router]);

  // Handle Teacher registration
  const handleTeacherSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await apiClient.teacherSignup({
        email: teacherEmail.trim(),
        password: teacherPassword,
        full_name: teacherFullName.trim(),
        preferred_language: teacherLanguage,
      });

      if (typeof window !== 'undefined') {
        const pendingProfile = {
          fullName: teacherFullName.trim(),
          schoolName: schoolName.trim() || 'School',
          experienceYears: Number(experienceYears) || 0,
          title: title.trim() || 'Educator',
        };
        localStorage.setItem(
          `bodhai_pending_profile_${teacherEmail.trim().toLowerCase()}`,
          JSON.stringify(pendingProfile),
        );
      }

      router.push(`/login?registered=true&email=${encodeURIComponent(teacherEmail.trim())}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('authFailed');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Student registration / onboarding
  const handleStudentSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const cleanJoinCode = studentJoinCode.trim().toUpperCase() || undefined;
      const res = await apiClient.studentJoin({
        join_code: cleanJoinCode,
        username: studentUsername.trim(),
        pin: studentPin.trim(),
        full_name: studentFullName.trim(),
        preferred_language: studentLanguage,
      });

      setAuthSession(res.access_token, res.user);

      if (typeof window !== 'undefined') {
        try {
          const pRes = await apiClient.getMyProfile(res.access_token);
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

      router.push('/student');
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : t('authFailed');
      if (msg.includes('already exists') || msg.includes('409')) {
        msg =
          "This username is already taken. Please choose another username, or sign in if it's yours.";
      } else if (msg.includes('Class with join code') || msg.includes('404')) {
        msg = `Classroom code "${studentJoinCode.trim().toUpperCase()}" not found. Please double-check with your teacher, or leave it blank to register for self-study.`;
      } else if (msg.includes('API Error')) {
        msg = msg.replace(/^API Error \[\d+\]:\s*/, '');
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectResetWithEnteredPassword = async (): Promise<void> => {
    if (!teacherEmail || !teacherPassword) return;
    if (teacherPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.resetPassword({
        email: teacherEmail.trim(),
        new_password: teacherPassword,
      });
      setAuthSession(res.access_token, res.user);

      if (typeof window !== 'undefined') {
        const pendingProfile = {
          fullName: teacherFullName.trim() || res.user.full_name,
          schoolName: schoolName.trim() || 'School',
          experienceYears: Number(experienceYears) || 0,
          title: title.trim() || 'Educator',
        };
        localStorage.setItem(
          `bodhai_pending_profile_${teacherEmail.trim().toLowerCase()}`,
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
            {activeTab === 'student' ? t('studentSignupTitle') : t('signupTitle')}
          </CardTitle>
          <CardDescription className="text-xs text-text-secondary dark:text-muted-foreground mt-1">
            {activeTab === 'student' ? t('studentSignupSubtitle') : t('signupSubtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Role Switching Tabs: Student vs Teacher */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as 'student' | 'teacher');
              setErrorMessage(null);
            }}
            className="w-full mb-6"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-full border-2 border-ink bg-surface-cream p-1 mb-6">
              <TabsTrigger
                value="student"
                className="rounded-full font-bold data-[state=active]:bg-primary-orange data-[state=active]:text-white transition-all cursor-pointer text-xs sm:text-sm py-1.5"
              >
                {t('tabStudent')}
              </TabsTrigger>
              <TabsTrigger
                value="teacher"
                className="rounded-full font-bold data-[state=active]:bg-primary-orange data-[state=active]:text-white transition-all cursor-pointer text-xs sm:text-sm py-1.5"
              >
                {t('tabTeacher')}
              </TabsTrigger>
            </TabsList>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-2xl border-2 border-ink bg-surface-pink/60 dark:bg-surface-pink/20 p-3.5 text-xs sm:text-sm text-ink dark:text-pink-100 font-bold space-y-2.5 shadow-xs mb-4"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-pink border-2 border-ink text-ink font-black text-xs shadow-xs">
                    !
                  </span>
                  <div className="leading-snug">{errorMessage}</div>
                </div>
                {activeTab === 'teacher' &&
                  (errorMessage.includes('already exists') || errorMessage.includes('409')) && (
                    <div className="space-y-2 pt-2 border-t border-ink/20 mt-1">
                      {teacherPassword && teacherPassword.length >= 8 && (
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
                          href={`/login?email=${encodeURIComponent(teacherEmail.trim())}`}
                          className="font-bold text-ink underline underline-offset-2 hover:opacity-80"
                        >
                          Sign in with this account →
                        </Link>
                        <Link
                          href={`/login?email=${encodeURIComponent(teacherEmail.trim())}&reset=true`}
                          className="font-bold text-ink underline underline-offset-2 hover:opacity-80"
                        >
                          Forgot / Reset Password →
                        </Link>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* ============================================================== */}
            {/* STUDENT SIGNUP TAB CONTENT                                     */}
            {/* ============================================================== */}
            <TabsContent value="student">
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div className="rounded-xl bg-surface-cream/50 dark:bg-card border-2 border-ink p-3 text-xs text-ink dark:text-foreground font-medium">
                  {t('privacyMinorNote')}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="student-signup-name"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {t('fullName')} *
                  </label>
                  <Input
                    id="student-signup-name"
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={studentFullName}
                    onChange={(e) => setStudentFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="student-signup-code"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between"
                  >
                    <span>{t('studentJoinCode')}</span>
                    <span className="text-[10px] lowercase font-normal opacity-80">
                      (optional if self-studying)
                    </span>
                  </label>
                  <Input
                    id="student-signup-code"
                    type="text"
                    placeholder="e.g. MATH8A, SCIE9B (issued by teacher)"
                    value={studentJoinCode}
                    onChange={(e) => setStudentJoinCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase tracking-wider"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Have a code from your teacher? Enter it to join your classroom roster directly.
                    If learning independently, leave blank.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label
                      htmlFor="student-signup-username"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {t('studentUsername')} *
                    </label>
                    <Input
                      id="student-signup-username"
                      type="text"
                      required
                      minLength={3}
                      maxLength={50}
                      placeholder={t('studentUsernamePlaceholder')}
                      value={studentUsername}
                      onChange={(e) =>
                        setStudentUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="student-signup-pin"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {t('studentPin')} *
                    </label>
                    <Input
                      id="student-signup-pin"
                      type="password"
                      inputMode="numeric"
                      required
                      minLength={4}
                      maxLength={8}
                      placeholder={t('studentPinPlaceholder')}
                      value={studentPin}
                      onChange={(e) => setStudentPin(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="student-signup-lang"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {t('preferredLanguage')}
                  </label>
                  <Select
                    id="student-signup-lang"
                    options={languageOptions}
                    value={studentLanguage}
                    onChange={(e) => setStudentLanguage(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  variant="orange"
                  className="w-full cursor-pointer py-3 font-bold rounded-full border-2 border-ink shadow-sm text-base hover:-translate-y-0.5 transition-transform"
                  disabled={isLoading}
                >
                  {isLoading ? t('studentSigningUp') : t('studentSignUpButton')}
                </Button>
              </form>
            </TabsContent>

            {/* ============================================================== */}
            {/* TEACHER SIGNUP TAB CONTENT                                     */}
            {/* ============================================================== */}
            <TabsContent value="teacher">
              <form onSubmit={handleTeacherSubmit} className="space-y-4">
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
                    value={teacherFullName}
                    onChange={(e) => setTeacherFullName(e.target.value)}
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
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
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
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
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
                    value={teacherLanguage}
                    onChange={(e) => setTeacherLanguage(e.target.value)}
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
              </form>
            </TabsContent>
          </Tabs>

          <div className="pt-2 text-center text-xs text-muted-foreground border-t border-ink/10 mt-4">
            <span>{t('alreadyHaveAccount')} </span>
            <Link
              href="/login"
              className="font-semibold text-primary underline underline-offset-4 hover:opacity-80"
            >
              {t('loginLink')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
