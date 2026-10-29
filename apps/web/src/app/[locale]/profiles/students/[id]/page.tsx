'use client';

import * as React from 'react';
import { Link } from '@/i18n/routing';
import { Card, Button } from '@bodhai/ui';
import { getStudentProfileById, getAllStudents } from '@/lib/profiles-data';
import { StudentProfileDetail } from '@/components/profiles/StudentProfileDetail';
import { GraduationCap } from 'lucide-react';

interface StudentProfilePageProps {
  readonly params: Promise<{ id: string; locale: string }>;
}

export default function StudentProfilePage({ params }: StudentProfilePageProps): React.JSX.Element {
  const resolvedParams = React.use(params);
  const studentId = resolvedParams.id;

  const studentProfile = React.useMemo(() => {
    return getStudentProfileById(studentId);
  }, [studentId]);

  if (!studentProfile) {
    const fallbackStudent = getAllStudents()[0];
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <Card className="p-8 border-destructive/30 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Student Profile Not Found / विद्यार्थी प्रोफ़ाइल नहीं मिली
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No active student profile matches the identifier &ldquo;{studentId}&rdquo;. You can view the profiles directory or inspect a recommended student profile.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/profile">
              <Button variant="outline" size="sm" className="gap-1.5 font-semibold">
                Go to My Profile
              </Button>
            </Link>
            {fallbackStudent && (
              <Link href={`/profiles/students/${fallbackStudent.slug}`}>
                <Button variant="primary" size="sm" className="font-semibold">
                  View {fallbackStudent.fullName}&apos;s Profile
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return <StudentProfileDetail profile={studentProfile} />;
}
