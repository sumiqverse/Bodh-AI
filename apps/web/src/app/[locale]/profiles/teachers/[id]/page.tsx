'use client';

import * as React from 'react';
import { Link } from '@/i18n/routing';
import { Card, buttonVariants } from '@bodhai/ui';
import { getTeacherProfileById, getAllTeachers } from '@/lib/profiles-data';
import { TeacherProfileDetail } from '@/components/profiles/TeacherProfileDetail';
import { Users } from 'lucide-react';

interface TeacherProfilePageProps {
  readonly params: Promise<{ id: string; locale: string }>;
}

export default function TeacherProfilePage({ params }: TeacherProfilePageProps): React.JSX.Element {
  const resolvedParams = React.use(params);
  const teacherId = resolvedParams.id;

  const teacherProfile = React.useMemo(() => {
    return getTeacherProfileById(teacherId);
  }, [teacherId]);

  if (!teacherProfile) {
    const fallbackTeacher = getAllTeachers()[0];
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <Card className="p-8 border-destructive/30 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Teacher Profile Not Found / शिक्षक प्रोफ़ाइल नहीं मिली
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No active educator profile matches the identifier &ldquo;{teacherId}&rdquo;. You can
            view all teacher profiles in the directory.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/profile"
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className: 'gap-1.5 font-semibold inline-flex items-center',
              })}
            >
              Go to My Profile
            </Link>
            {fallbackTeacher && (
              <Link
                href={`/profiles/teachers/${fallbackTeacher.slug}`}
                className={buttonVariants({
                  variant: 'primary',
                  size: 'sm',
                  className: 'font-semibold inline-flex items-center',
                })}
              >
                View {fallbackTeacher.fullName}&apos;s Profile
              </Link>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return <TeacherProfileDetail profile={teacherProfile} />;
}
