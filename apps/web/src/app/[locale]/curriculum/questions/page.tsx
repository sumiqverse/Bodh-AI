'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { CurriculumTabs } from '@/components/curriculum-tabs';
import { Button, Badge, Card, Input, Skeleton } from '@bodhai/ui';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Edit3,
  PlusCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { getWebApiClient, getAuthToken } from '@/lib/api-client';
import { KatexRenderer } from '@/components/katex-renderer';
import type { QuestionDetailResponse } from '@bodhai/api-client';

function QuestionReviewContent(): React.JSX.Element {
  const t = useTranslations('curriculum');
  const searchParams = useSearchParams();
  const initialSkillId = searchParams.get('skill_id') || undefined;

  const [loading, setLoading] = React.useState<boolean>(true);
  const [questions, setQuestions] = React.useState<QuestionDetailResponse[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [reviewRequiredFilter, setReviewRequiredFilter] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [actionInProgress, setActionInProgress] = React.useState<string | null>(null);

  // Review modal state
  const [reviewModalQuestion, setReviewModalQuestion] =
    React.useState<QuestionDetailResponse | null>(null);
  const [targetStatus, setTargetStatus] = React.useState<'draft' | 'reviewed' | 'published'>(
    'reviewed',
  );
  const [reviewNotes, setReviewNotes] = React.useState<string>('');

  const client = React.useMemo(() => getWebApiClient(), []);

  // Fetch questions from educator management endpoint
  const loadQuestions = React.useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken() || undefined;
      const data = await client.listManageQuestions(
        {
          skill_id: initialSkillId,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          needs_teacher_review: reviewRequiredFilter ? true : undefined,
          limit: 100,
        },
        token,
      );
      setQuestions(data);
    } catch (err) {
      console.error('Failed to load questions for review:', err);
    } finally {
      setLoading(false);
    }
  }, [client, initialSkillId, statusFilter, reviewRequiredFilter]);

  React.useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Handle Review Workflow Transition (draft -> reviewed -> published)
  const handleStatusTransition = async () => {
    if (!reviewModalQuestion) return;
    setActionInProgress(reviewModalQuestion.id);
    try {
      const token = getAuthToken() || undefined;
      const updated = await client.updateQuestionStatus(
        reviewModalQuestion.id,
        targetStatus,
        reviewNotes.trim() || undefined,
        token,
      );
      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setReviewModalQuestion(null);
      setReviewNotes('');
    } catch (err) {
      console.error('Failed to update question review status:', err);
      alert('Failed to update review status. Ensure you are signed in as a teacher or admin.');
    } finally {
      setActionInProgress(null);
    }
  };

  const openReviewModal = (
    q: QuestionDetailResponse,
    nextStatus: 'draft' | 'reviewed' | 'published',
  ) => {
    setReviewModalQuestion(q);
    setTargetStatus(nextStatus);
    setReviewNotes('');
  };

  // Filter questions based on search query
  const filteredQuestions = React.useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter((item) => {
      const codeMatch = item.code.toLowerCase().includes(q);
      const enText = item.translations.find((t) => t.language === 'en')?.question_text || '';
      const hiText = item.translations.find((t) => t.language === 'hi')?.question_text || '';
      return codeMatch || enText.toLowerCase().includes(q) || hiText.toLowerCase().includes(q);
    });
  }, [questions, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Banner */}
      <section className="bg-card border-b border-border pt-8 pb-6">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs font-mono">
                  Review & Publish Lifecycle
                </Badge>
                <Badge variant="default" className="text-xs">
                  Teacher Verified
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t('questionsTitle')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {t('questionsSubtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/curriculum/questions/new">
                <Button variant="primary" size="sm" className="gap-2 shadow-xs">
                  <PlusCircle className="h-4 w-4" />
                  <span>Draft New Question</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="container mx-auto px-4 max-w-7xl">
        <CurriculumTabs />
      </div>

      {/* Filters and Table */}
      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-card p-4 rounded-lg border border-border">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search question code or text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-medium text-muted-foreground">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="all">{t('statusAll')}</option>
                <option value="draft">{t('statusDraft')}</option>
                <option value="reviewed">{t('statusReviewed')}</option>
                <option value="published">{t('statusPublished')}</option>
              </select>
            </div>

            {/* Needs Teacher Review Toggle */}
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none bg-muted/40 px-3 py-1.5 rounded-md border border-border">
              <input
                type="checkbox"
                checked={reviewRequiredFilter}
                onChange={(e) => setReviewRequiredFilter(e.target.checked)}
                className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                {t('reviewFlagged')}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground self-end lg:self-auto font-mono">
            Showing {filteredQuestions.length} Items
          </div>
        </div>

        {/* Security & Answer-Leak Notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3.5 flex items-center gap-3 text-xs">
          <ShieldAlert className="h-5 w-5 text-primary shrink-0" />
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground font-semibold">
              Statutory Security Guarantee:{' '}
            </strong>
            Students only ever receive questions marked as{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Published</span>.
            Verified answers and worked solutions are strictly stripped from student API responses
            prior to submission.
          </p>
        </div>

        {/* Questions Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-5 w-1/4 mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Questions Found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              No questions matched your filter criteria. Try clearing filters or create a new
              question.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setReviewRequiredFilter(false);
                setSearchQuery('');
              }}
              className="mt-4"
            >
              Reset Filters
            </Button>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Question Prompt (EN / HI)</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Diff</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Teacher Review</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQuestions.map((q) => {
                  const enTrans = q.translations.find((t) => t.language === 'en');
                  const hiTrans = q.translations.find((t) => t.language === 'hi');

                  return (
                    <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-primary whitespace-nowrap align-top">
                        {q.code}
                      </td>

                      {/* Prompt */}
                      <td className="py-3.5 px-4 max-w-md align-top">
                        <div className="space-y-1">
                          <KatexRenderer
                            content={enTrans?.question_text || 'No English text'}
                            className="text-xs font-medium text-foreground line-clamp-2"
                          />
                          {hiTrans && (
                            <KatexRenderer
                              content={hiTrans.question_text}
                              className="text-xs text-muted-foreground line-clamp-1 italic"
                            />
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs uppercase font-mono font-medium text-muted-foreground align-top">
                        {q.question_type}
                      </td>

                      {/* Difficulty */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-amber-600 dark:text-amber-400 align-top">
                        {q.difficulty}/5
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                            q.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : q.status === 'reviewed'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>

                      {/* Needs Teacher Review Flag */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        {q.needs_teacher_review ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Review Needed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Cleared</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap align-top space-x-1">
                        {/* Status Transition Quick Action */}
                        {q.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionInProgress === q.id}
                            onClick={() => openReviewModal(q, 'reviewed')}
                            className="h-7 text-xs border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                          >
                            Mark Reviewed
                          </Button>
                        )}

                        {q.status === 'reviewed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionInProgress === q.id}
                            onClick={() => openReviewModal(q, 'published')}
                            className="h-7 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                          >
                            Publish
                          </Button>
                        )}

                        {q.status === 'published' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionInProgress === q.id}
                            onClick={() => openReviewModal(q, 'draft')}
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          >
                            Unpublish
                          </Button>
                        )}

                        {/* Edit Button */}
                        <Link href={`/curriculum/questions/${q.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Edit Question"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Review Modal Dialog */}
      {reviewModalQuestion && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">Editorial Review Workflow</h2>
              <Badge variant="outline" className="font-mono text-xs">
                {reviewModalQuestion.code}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Transition from:</span>
                <span className="font-mono font-semibold capitalize text-foreground">
                  {reviewModalQuestion.status}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono font-semibold capitalize text-primary">
                  {targetStatus}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Reviewer Notes & Verification Rationale:
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Verified mathematical steps, formulas, and progressive hints conform to NCERT standards."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="rounded bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
                This transition will be recorded as a formal revision snapshot in the
                question&apos;s version audit trail.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setReviewModalQuestion(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStatusTransition}
                disabled={actionInProgress !== null}
              >
                {actionInProgress ? 'Saving...' : 'Confirm Transition'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function QuestionReviewPage(): React.JSX.Element {
  return (
    <React.Suspense
      fallback={
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <Skeleton className="h-10 w-1/3 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <QuestionReviewContent />
    </React.Suspense>
  );
}
