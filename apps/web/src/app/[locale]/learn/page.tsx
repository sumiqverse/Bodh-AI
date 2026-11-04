'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/routing';
import { getAuthToken, getWebApiClient } from '@/lib/api-client';
import { KatexRenderer } from '@/components/katex-renderer';
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

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
    retry: false,
  });

  return (
    <main className="min-h-screen bg-canvas-gradient px-4 py-8 sm:py-12 flex justify-center text-ink selection:bg-surface-cream selection:text-ink">
      <div className="w-full max-w-3xl space-y-6">
        <Link
          href="/student"
          className="inline-flex items-center gap-2 text-xs font-bold rounded-full border-2 border-ink bg-surface-white dark:bg-card px-4 py-1.5 shadow-xs hover:bg-surface-cream transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Classroom
        </Link>

        {!classId || !skillId ? (
          <div className="rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-8 text-center shadow-card space-y-3">
            <h2 className="text-lg font-bold text-ink dark:text-white">Select a Skill</h2>
            <p className="text-xs text-text-secondary">
              Please choose a classroom and a skill from your dashboard to view lesson materials.
            </p>
            <Link
              href="/student"
              className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-primary-orange text-white px-5 py-2 text-xs font-bold shadow-xs hover:bg-primary-orange-dark"
            >
              Go to Classroom
            </Link>
          </div>
        ) : lesson.isLoading ? (
          <div className="rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-12 text-center shadow-card space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-ink bg-surface-cream flex items-center justify-center mx-auto shadow-xs animate-spin">
              <Sparkles className="w-6 h-6 text-primary-orange" />
            </div>
            <p className="text-xs font-bold text-text-secondary">Loading lesson materials...</p>
          </div>
        ) : lesson.isError ? (
          <div className="rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-8 sm:p-12 text-center shadow-card relative overflow-hidden space-y-6">
            {/* Decorative corner accent circles (design.md Section 5) */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-surface-cream pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-surface-butter/50 pointer-events-none" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-full border-2 border-ink bg-surface-cream flex items-center justify-center mx-auto shadow-xs">
                <Sparkles className="w-8 h-8 text-primary-orange" />
              </div>
            </div>

            <div className="relative z-10 space-y-3 max-w-md mx-auto">
              <span className="inline-block text-[10px] font-black uppercase tracking-wider rounded-full border-2 border-ink bg-surface-yellow px-3 py-0.5 text-ink shadow-xs">
                Adaptive Learning Mode
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-black text-ink dark:text-white tracking-tight">
                No Lecture Notes Yet
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Your teacher hasn&apos;t published custom written notes for this skill yet. You can
                master this competency directly through{' '}
                <strong>Interactive Adaptive Practice</strong> with progressive 3-tier hints!
              </p>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={`/solve?skillId=${encodeURIComponent(skillId)}`}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-primary-orange text-white px-6 py-2.5 text-xs font-bold shadow-xs hover:bg-primary-orange-dark cursor-pointer transition-colors"
                >
                  Start Practice with Hints <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/student"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-surface-white dark:bg-card px-5 py-2.5 text-xs font-bold text-ink dark:text-white shadow-xs hover:bg-surface-cream cursor-pointer transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        ) : (
          lesson.data && (
            <article className="rounded-[24px] border-2 border-ink bg-surface-white dark:bg-card p-6 sm:p-8 shadow-card space-y-6">
              <div className="flex items-center justify-between border-b-2 border-dashed border-ink/20 pb-4">
                <span className="text-xs font-black uppercase tracking-wider rounded-full border-2 border-ink bg-surface-yellow px-3 py-1 text-ink shadow-xs">
                  Difficulty Level {lesson.data.difficulty}
                </span>
                <span className="text-xs font-bold text-text-secondary">Classroom Lesson</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-black text-ink dark:text-white">
                {lesson.data.title}
              </h1>
              <div className="whitespace-pre-wrap leading-relaxed text-sm text-ink dark:text-gray-100">
                <KatexRenderer content={lesson.data.body} />
              </div>
              <div className="pt-4 border-t-2 border-dashed border-ink/20 flex justify-end">
                <Link
                  href={`/solve?skillId=${encodeURIComponent(skillId)}`}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-primary-orange text-white px-6 py-2.5 text-xs font-bold shadow-xs hover:bg-primary-orange-dark cursor-pointer"
                >
                  Practice this skill with hints <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          )
        )}
      </div>
    </main>
  );
}

export default function LearnPage(): React.JSX.Element {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-canvas-gradient p-10 text-center">
          <p className="text-xs font-bold">Loading lesson…</p>
        </div>
      }
    >
      <LessonPage />
    </React.Suspense>
  );
}
