'use client';

import * as React from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { getCurrentUser, getWebApiClient, getAuthToken } from '@/lib/api-client';
import type { TeacherProfile, StudentProfile } from '@/lib/profiles-data';
import { StudentProfileDetail } from '@/components/profiles/StudentProfileDetail';
import { TeacherProfileDetail } from '@/components/profiles/TeacherProfileDetail';

export default function MyProfilePage(): React.JSX.Element {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [user, setUser] = React.useState<ReturnType<typeof getCurrentUser>>(null);
  const [profile, setProfile] = React.useState<
    | { type: 'teacher'; profile: TeacherProfile }
    | { type: 'student'; profile: StudentProfile }
    | null
  >(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const current = getCurrentUser();
    setUser(current);
    const token = getAuthToken();
    if (!current || !token) {
      router.replace('/login?redirect=%2Fprofile');
      return;
    }
    setLoading(true);
    getWebApiClient()
      .getMyProfile(token)
      .then((result) => setProfile(result as unknown as typeof profile))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [router]);

  if (!mounted || loading) return <p className="p-8">Loading profile…</p>;
  if (!user)
    return (
      <main className="p-8">
        <p>Sign in to view your profile.</p>
        <Link href="/login" className="font-bold underline">
          Sign in
        </Link>
      </main>
    );
  if (error || !profile)
    return (
      <p role="alert" className="p-8">
        Could not load your profile. Please try again.
      </p>
    );
  if (profile.type === 'teacher')
    return (
      <TeacherProfileDetail
        profile={profile.profile}
        onProfileUpdated={(updated) => setProfile({ type: 'teacher', profile: updated })}
      />
    );
  return (
    <StudentProfileDetail
      profile={profile.profile}
      onProfileUpdated={(updated) => setProfile({ type: 'student', profile: updated })}
    />
  );
}
