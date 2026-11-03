'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/routing';
import { getAuthToken, getWebApiClient } from '@/lib/api-client';
import { KatexRenderer } from '@/components/katex-renderer';

function LessonPage(): React.JSX.Element {
  const params = useSearchParams();
  const skillId = params.get('skillId');
  const locale = useLocale() === 'hi' ? 'hi' : 'en';
  const [classId, setClassId] = React.useState<string | null>(null);
  React.useEffect(() => {
    setClassId(localStorage.getItem('bodhai_selected_class_id'));
  }, []);
  const lesson = useQuery({
    queryKey: ['classroom-lesson', classId, skillId, locale],
    queryFn: () =>
      getWebApiClient().getClassLesson(classId!, skillId!, locale, getAuthToken() || undefined),
    enabled: !!classId && !!skillId,
  });
  return (
    <main className="min-h-screen bg-canvas-gradient px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/student" className="font-bold underline">
          ← Back to classroom
        </Link>
        {!classId || !skillId ? (
          <p>Select a classroom and a skill to start learning.</p>
        ) : lesson.isLoading ? (
          <p>Loading lesson…</p>
        ) : lesson.isError ? (
          <p role="alert">
            {'status' in lesson.error && lesson.error.status === 404
              ? 'No lesson is available for this skill and language yet. Ask your teacher to add one.'
              : 'Could not load the lesson. Check your connection and classroom access.'}
          </p>
        ) : (
          lesson.data && (
            <article className="rounded-card border-2 border-ink bg-surface-white p-6 shadow-card space-y-4">
              <p className="text-sm font-bold">Difficulty level {lesson.data.difficulty}</p>
              <h1 className="text-2xl font-bold">{lesson.data.title}</h1>
              <div className="whitespace-pre-wrap leading-relaxed">
                <KatexRenderer content={lesson.data.body} />
              </div>
              <Link
                href={`/solve?skillId=${encodeURIComponent(skillId)}`}
                className="inline-block rounded-full bg-primary-orange text-white px-5 py-2 font-bold"
              >
                Practice this skill →
              </Link>
            </article>
          )
        )}
      </div>
    </main>
  );
}

export default function LearnPage(): React.JSX.Element {
  return (
    <React.Suspense fallback={<p>Loading lesson…</p>}>
      <LessonPage />
    </React.Suspense>
  );
}
