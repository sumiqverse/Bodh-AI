'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button, Badge } from '@bodhai/ui';
import { getCurrentUser, getWebApiClient, getAuthToken } from '@/lib/api-client';
import {
  getProfileForUser,
  DEMO_ACCOUNTS,
  loginAsDemoUser,
  type DemoAccount,
  type TeacherProfile,
  type StudentProfile,
} from '@/lib/profiles-data';
import { StudentProfileDetail } from '@/components/profiles/StudentProfileDetail';
import { TeacherProfileDetail } from '@/components/profiles/TeacherProfileDetail';
import { Lock, ShieldCheck, GraduationCap, Users, Sparkles, ArrowRight } from 'lucide-react';

export default function MyProfilePage(): React.JSX.Element {
  const locale = useLocale();
  const apiClient = getWebApiClient();

  const [mounted, setMounted] = React.useState<boolean>(false);
  const [currentUser, setCurrentUser] = React.useState<ReturnType<typeof getCurrentUser>>(null);
  const [liveProfileResult, setLiveProfileResult] = React.useState<
    | { type: 'teacher'; profile: TeacherProfile }
    | { type: 'student'; profile: StudentProfile }
    | null
  >(null);
  const [_loadingLive, setLoadingLive] = React.useState<boolean>(false);

  const fetchLiveProfile = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      setLoadingLive(true);
      const res = await apiClient.getMyProfile(token);
      if (res && res.profile) {
        setLiveProfileResult(res);
      }
    } catch (err) {
      // Fallback cleanly to local profile
      console.warn('Live profile fetch error:', err);
    } finally {
      setLoadingLive(false);
    }
  }, [apiClient]);

  React.useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user) {
      fetchLiveProfile();
    }

    const handleStorageChange = () => {
      const u = getCurrentUser();
      setCurrentUser(u);
      if (u) {
        fetchLiveProfile();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bodhai_auth_change', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bodhai_auth_change', handleStorageChange);
    };
  }, [fetchLiveProfile]);

  const handleSelectDemoPersona = (demoAccount: DemoAccount) => {
    loginAsDemoUser(demoAccount.id);
    const u = getCurrentUser();
    setCurrentUser(u);
    if (u) {
      fetchLiveProfile();
    }
  };

  // Prevent hydration mismatches
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-xs text-muted-foreground">
        Loading profile telemetry...
      </div>
    );
  }

  // 1. Authenticated: Render user's dedicated, individualized profile
  if (currentUser) {
    // Prefer live profile from PostgreSQL, fallback to local profile generator
    const profileResult = liveProfileResult || getProfileForUser(currentUser);
    if (profileResult) {
      if (profileResult.type === 'teacher') {
        return (
          <TeacherProfileDetail
            key={`teacher-${profileResult.profile.id}`}
            profile={profileResult.profile}
            onProfileUpdated={(updated) => {
              setLiveProfileResult({ type: 'teacher', profile: updated });
            }}
          />
        );
      }
      return (
        <StudentProfileDetail
          key={`student-${profileResult.profile.id}`}
          profile={profileResult.profile}
          onProfileUpdated={(updated) => {
            setLiveProfileResult({ type: 'student', profile: updated });
          }}
        />
      );
    }
  }

  // 2. Unauthenticated: Display DPDP-compliant Private Profile Sign-in Gateway
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:py-16 space-y-10">
      {/* Header Security Hero */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4" />
          <span>
            {locale === 'hi'
              ? 'DPDP 2023 अनुपालित निजी प्रोफ़ाइल'
              : 'DPDP Act 2023 Compliant Private Telemetry'}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          {locale === 'hi'
            ? 'आपकी व्यक्तिगत अधिगम प्रोफ़ाइल'
            : 'Your Private Learning & Educator Profile'}
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {locale === 'hi'
            ? 'BodhAI में प्रत्येक छात्र और शिक्षक का डेटा पूरी तरह अलग और सुरक्षित है। केवल अधिकृत उपयोगकर्ता ही अपनी दक्षता मैट्रिक्स, त्रुटि विश्लेषण और प्रगति देख सकते हैं।'
            : 'BodhAI enforces strict individualized telemetry isolation. No public directories exist. Log in to your personal account to access your NCERT competency mastery, misconception insights, and hint ladder.'}
        </p>

        <div className="pt-2">
          <Link href="/login">
            <Button variant="primary" size="lg" className="font-bold text-sm shadow-md gap-2">
              <Lock className="w-4 h-4" />
              {locale === 'hi' ? 'अपने खाते में लॉगिन करें' : 'Sign In to Your Account'}
            </Button>
          </Link>
        </div>
      </div>

      {/* 1-Click Demo Testing Gateway */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {locale === 'hi'
                  ? 'त्वरित डेमो परीक्षण (1-क्लिक लॉगिन)'
                  : 'Quick Demo Sign-In (Test Individual Telemetry)'}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {locale === 'hi'
                ? 'किसी भी छात्र या शिक्षक पर क्लिक करें और देखें कि लॉगिन करने पर उनका निजी डेटा कैसा दिखता है:'
                : 'Click any learner or educator below to instantly simulate their authenticated session:'}
            </p>
          </div>
          <Badge variant="outline" className="text-[11px] font-mono shrink-0">
            {DEMO_ACCOUNTS.length} Test Personas
          </Badge>
        </div>

        {/* Demo Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {DEMO_ACCOUNTS.map((acc) => {
            const isTeacher = acc.role === 'teacher';
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectDemoPersona(acc)}
                className="group p-4 rounded-xl border border-border/80 bg-background hover:border-primary/60 hover:bg-muted/40 transition-all text-left flex flex-col justify-between gap-3 cursor-pointer shadow-2xs hover:shadow-sm"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${acc.avatarGradient} text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0`}
                    >
                      {acc.name.replace('Mr. ', '').replace('Mrs. ', '').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {locale === 'hi' ? acc.nameHi : acc.name}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground block truncate">
                        {acc.badge}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {locale === 'hi' ? acc.descriptionHi : acc.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <span className="flex items-center gap-1 font-medium text-[11px] text-muted-foreground">
                    {isTeacher ? (
                      <>
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        Educator
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                        Learner
                      </>
                    )}
                  </span>
                  <span className="text-primary font-semibold text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    {locale === 'hi' ? 'लॉगिन करें' : 'Log In'}
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
