'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { CurriculumTabs } from '@/components/curriculum-tabs';
import { Button, Badge, Card, Input, Skeleton } from '@bodhai/ui';
import { Save, ArrowLeft, Eye, History, Sparkles } from 'lucide-react';
import { getWebApiClient, getAuthToken } from '@/lib/api-client';
import { KatexRenderer } from '@/components/katex-renderer';
import type { QuestionDetailResponse, QuestionTranslationDetail } from '@bodhai/api-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function QuestionEditorPage({ params }: PageProps): React.JSX.Element {
  const t = useTranslations('curriculum');

  const [questionId, setQuestionId] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [activeLang, setActiveLang] = React.useState<'en' | 'hi'>('en');

  // Form State
  const [code, setCode] = React.useState<string>('');
  const [questionType, setQuestionType] = React.useState<string>('mcq');
  const [difficulty, setDifficulty] = React.useState<number>(3);
  const [status, setStatus] = React.useState<'draft' | 'reviewed' | 'published'>('draft');
  const [needsReview, setNeedsReview] = React.useState<boolean>(true);
  const [reviewNotes, setReviewNotes] = React.useState<string>('');

  // Translations State
  const [enText, setEnText] = React.useState<string>('');
  const [hiText, setHiText] = React.useState<string>('');
  const [enAnswer, setEnAnswer] = React.useState<string>('');
  const [hiAnswer, setHiAnswer] = React.useState<string>('');
  const [enSolution, setEnSolution] = React.useState<string>('');
  const [hiSolution, setHiSolution] = React.useState<string>('');
  const [enExplanation, setEnExplanation] = React.useState<string>('');
  const [hiExplanation, setHiExplanation] = React.useState<string>('');

  const [enHints, setEnHints] = React.useState<string[]>(['', '', '']);
  const [hiHints, setHiHints] = React.useState<string[]>(['', '', '']);

  // MCQ Options for EN and HI
  const [enOptions, setEnOptions] = React.useState<
    Array<{ id: string; text: string; is_correct: boolean }>
  >([
    { id: 'A', text: '', is_correct: true },
    { id: 'B', text: '', is_correct: false },
    { id: 'C', text: '', is_correct: false },
    { id: 'D', text: '', is_correct: false },
  ]);

  const [hiOptions, setHiOptions] = React.useState<
    Array<{ id: string; text: string; is_correct: boolean }>
  >([
    { id: 'A', text: '', is_correct: true },
    { id: 'B', text: '', is_correct: false },
    { id: 'C', text: '', is_correct: false },
    { id: 'D', text: '', is_correct: false },
  ]);

  // Version audit log
  const [versionHistory, setVersionHistory] = React.useState<QuestionDetailResponse['versions']>(
    [],
  );

  const client = React.useMemo(() => getWebApiClient(), []);

  // Unwrap params and load question details
  React.useEffect(() => {
    async function init() {
      const resolved = await params;
      setQuestionId(resolved.id);

      if (resolved.id === 'new') {
        setCode(`MATH-08-${Date.now().toString().slice(-4)}`);
        setEnText('If $x + \\frac{1}{x} = 5$, find the value of $x^2 + \\frac{1}{x^2}$.');
        setEnAnswer('23');
        setEnSolution(
          'Squaring both sides:\n$$\\left(x + \\frac{1}{x}\\right)^2 = 5^2$$\n$$x^2 + 2 + \\frac{1}{x^2} = 25$$\n$$x^2 + \\frac{1}{x^2} = 25 - 2 = 23$$',
        );
        setEnHints([
          'Recall the algebraic identity $(a + b)^2 = a^2 + 2ab + b^2$.',
          'Square both sides of $x + \\frac{1}{x} = 5$.',
          'Note that $2 \\cdot x \\cdot \\frac{1}{x} = 2$, so subtract $2$ from $25$.',
        ]);
        setEnOptions([
          { id: 'A', text: '23', is_correct: true },
          { id: 'B', text: '25', is_correct: false },
          { id: 'C', text: '27', is_correct: false },
          { id: 'D', text: '21', is_correct: false },
        ]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const token = getAuthToken() || undefined;
        const q = await client.getQuestionDetail(resolved.id, token);
        setCode(q.code);
        setQuestionType(q.question_type);
        setDifficulty(q.difficulty);
        setStatus(q.status);
        setNeedsReview(q.needs_teacher_review);
        setVersionHistory(q.versions || []);

        const en = q.translations.find((t) => t.language === 'en');
        if (en) {
          setEnText(en.question_text || '');
          setEnAnswer(en.verified_answer || '');
          setEnSolution(en.worked_solution || '');
          setEnExplanation(en.explanation || '');
          if (en.hints && en.hints.length === 3) setEnHints(en.hints);
          if (en.options && en.options.length > 0) {
            setEnOptions(
              en.options.map((o) => ({
                id: o.id,
                text: o.text,
                is_correct: o.id === en.verified_answer,
              })),
            );
          }
        }

        const hi = q.translations.find((t) => t.language === 'hi');
        if (hi) {
          setHiText(hi.question_text || '');
          setHiAnswer(hi.verified_answer || '');
          setHiSolution(hi.worked_solution || '');
          setHiExplanation(hi.explanation || '');
          if (hi.hints && hi.hints.length === 3) setHiHints(hi.hints);
          if (hi.options && hi.options.length > 0) {
            setHiOptions(
              hi.options.map((o) => ({
                id: o.id,
                text: o.text,
                is_correct: o.id === hi.verified_answer,
              })),
            );
          }
        }
      } catch (err) {
        console.error('Failed to load question details:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [params, client]);

  // Handle MCQ option selection
  const handleCorrectOptionChange = (lang: 'en' | 'hi', optionId: string) => {
    if (lang === 'en') {
      setEnOptions((prev) =>
        prev.map((opt) => ({
          ...opt,
          is_correct: opt.id === optionId,
        })),
      );
      setEnAnswer(optionId);
    } else {
      setHiOptions((prev) =>
        prev.map((opt) => ({
          ...opt,
          is_correct: opt.id === optionId,
        })),
      );
      setHiAnswer(optionId);
    }
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getAuthToken() || undefined;

      const translationsPayload: QuestionTranslationDetail[] = [
        {
          language: 'en',
          question_text: enText,
          options:
            questionType === 'mcq'
              ? enOptions.map((o) => ({ id: o.id, text: o.text, is_correct: o.is_correct }))
              : null,
          verified_answer: enAnswer,
          worked_solution: enSolution,
          explanation: enExplanation,
          hints: enHints,
        },
      ];

      if (hiText.trim()) {
        translationsPayload.push({
          language: 'hi',
          question_text: hiText,
          options:
            questionType === 'mcq'
              ? hiOptions.map((o) => ({ id: o.id, text: o.text, is_correct: o.is_correct }))
              : null,
          verified_answer: hiAnswer || enAnswer,
          worked_solution: hiSolution,
          explanation: hiExplanation,
          hints: hiHints,
        });
      }

      const updated = await client.updateQuestion(
        questionId,
        {
          question_type: questionType,
          difficulty,
          status,
          needs_teacher_review: needsReview,
          review_notes: reviewNotes.trim() || undefined,
          translations: translationsPayload,
        },
        token,
      );

      setVersionHistory(updated.versions || []);
      setReviewNotes('');
      alert('Question and revision snapshot saved successfully!');
    } catch (err) {
      console.error('Failed to save question:', err);
      alert('Error saving question. Ensure all 3 hints and verified answers are filled.');
    } finally {
      setSaving(false);
    }
  };

  // Cheat Sheet Quick Insert
  const insertFormula = (formula: string) => {
    if (activeLang === 'en') {
      setEnText((prev) => `${prev} ${formula} `);
    } else {
      setHiText((prev) => `${prev} ${formula} `);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const currentText = activeLang === 'en' ? enText : hiText;
  const currentOptions = activeLang === 'en' ? enOptions : hiOptions;
  const currentHints = activeLang === 'en' ? enHints : hiHints;
  const currentSolution = activeLang === 'en' ? enSolution : hiSolution;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Banner */}
      <section className="bg-card border-b border-border pt-6 pb-4">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/curriculum/questions">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-primary">{code}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {status}
                  </Badge>
                </div>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                  {t('editorTitle')}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-2 shadow-xs"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : t('saveQuestion')}</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="container mx-auto px-4 max-w-7xl">
        <CurriculumTabs />
      </div>

      {/* Main Dual-Pane Editor & Preview */}
      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Form Controls */}
          <div className="space-y-6">
            {/* Metadata Bar */}
            <Card className="p-4 bg-card border-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Question Type
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="mcq">MCQ (Multiple Choice)</option>
                    <option value="numeric">Numeric Answer</option>
                    <option value="short_text">Short Text</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Difficulty (1–5)
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background p-2 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((d) => (
                      <option key={d} value={d}>
                        Level {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Workflow State
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as 'draft' | 'reviewed' | 'published')
                    }
                    className="w-full rounded-md border border-input bg-background p-2 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              {/* Teacher Review Checkbox */}
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-2 border-t border-border/60">
                <input
                  type="checkbox"
                  checked={needsReview}
                  onChange={(e) => setNeedsReview(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  Flag as &apos;Needs Teacher Review&apos;
                </span>
              </label>
            </Card>

            {/* Language Switch Tabs */}
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setActiveLang('en')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                  activeLang === 'en'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                English (Primary)
              </button>
              <button
                type="button"
                onClick={() => setActiveLang('hi')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                  activeLang === 'hi'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                Hindi (हिन्दी अनुवाद)
              </button>
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  {t('prompt')} ({activeLang.toUpperCase()})
                </label>
                <span className="text-[11px] text-muted-foreground">
                  LaTeX formulas supported: <code>$formula$</code> or <code>$$block$$</code>
                </span>
              </div>
              <textarea
                value={activeLang === 'en' ? enText : hiText}
                onChange={(e) => {
                  if (activeLang === 'en') setEnText(e.target.value);
                  else setHiText(e.target.value);
                }}
                rows={4}
                placeholder="Enter question text with LaTeX formula like $x^2 + 5x + 6 = 0$..."
                className="w-full rounded-md border border-input bg-background p-3 text-sm font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

            {/* MCQ Options (if type === mcq) */}
            {questionType === 'mcq' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-foreground block">
                  {t('options')} (Select radio for verified correct answer)
                </label>

                <div className="space-y-2">
                  {currentOptions.map((opt) => (
                    <div
                      key={opt.id}
                      className={`flex items-center gap-3 p-2.5 rounded-md border transition-colors ${
                        opt.is_correct
                          ? 'border-emerald-500 bg-emerald-500/5'
                          : 'border-border bg-card'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`correct-option-${activeLang}`}
                        checked={opt.is_correct}
                        onChange={() => handleCorrectOptionChange(activeLang, opt.id)}
                        className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span className="font-mono text-xs font-bold text-muted-foreground w-4">
                        {opt.id}.
                      </span>
                      <Input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeLang === 'en') {
                            setEnOptions((prev) =>
                              prev.map((o) => (o.id === opt.id ? { ...o, text: val } : o)),
                            );
                          } else {
                            setHiOptions((prev) =>
                              prev.map((o) => (o.id === opt.id ? { ...o, text: val } : o)),
                            );
                          }
                        }}
                        placeholder={`Option ${opt.id} text (e.g. $23$)`}
                        className="text-xs flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Non-MCQ Verified Answer */}
            {questionType !== 'mcq' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  {t('verifiedAnswer')}
                </label>
                <Input
                  type="text"
                  value={activeLang === 'en' ? enAnswer : hiAnswer}
                  onChange={(e) => {
                    if (activeLang === 'en') setEnAnswer(e.target.value);
                    else setHiAnswer(e.target.value);
                  }}
                  placeholder="e.g. 23 or rational"
                  className="text-sm font-mono"
                />
              </div>
            )}

            {/* 3 Progressive Hints */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground block">{t('hints')}</label>

              {[0, 1, 2].map((idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    Hint {idx + 1}:
                  </span>
                  <textarea
                    value={activeLang === 'en' ? enHints[idx] : hiHints[idx]}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (activeLang === 'en') {
                        setEnHints((prev) => {
                          const next = [...prev];
                          next[idx] = val;
                          return next;
                        });
                      } else {
                        setHiHints((prev) => {
                          const next = [...prev];
                          next[idx] = val;
                          return next;
                        });
                      }
                    }}
                    rows={2}
                    placeholder={`Hint ${idx + 1} content...`}
                    className="w-full rounded-md border border-input bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}
            </div>

            {/* Worked Solution */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                {t('workedSolution')}
              </label>
              <textarea
                value={activeLang === 'en' ? enSolution : hiSolution}
                onChange={(e) => {
                  if (activeLang === 'en') setEnSolution(e.target.value);
                  else setHiSolution(e.target.value);
                }}
                rows={4}
                placeholder="Step-by-step mathematical solution with formulas..."
                className="w-full rounded-md border border-input bg-background p-3 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

            {/* Review Notes Snapshot */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                Review / Revision Audit Notes:
              </label>
              <Input
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Brief rationale of changes made for version snapshot..."
                className="text-xs"
              />
            </div>
          </div>

          {/* Right Column: Live KaTeX Preview & Formula Palette */}
          <div className="space-y-6 lg:sticky lg:top-6">
            {/* Formula Helper Palette */}
            <Card className="p-4 bg-muted/30 border-border space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>KaTeX Quick Formula Palette (Click to insert):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Fraction', latex: '$\\frac{a}{b}$' },
                  { label: 'Square', latex: '$x^2$' },
                  { label: 'Square Root', latex: '$\\sqrt{x}$' },
                  { label: 'Plus-Minus', latex: '$\\pm$' },
                  { label: 'Times', latex: '$\\times$' },
                  { label: 'Division', latex: '$\\div$' },
                  { label: 'Leq', latex: '$\\le$' },
                  { label: 'Geq', latex: '$\\ge$' },
                  { label: 'Pi', latex: '$\\pi$' },
                  { label: 'Delta', latex: '$\\Delta$' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => insertFormula(item.latex)}
                    className="px-2 py-1 bg-card hover:bg-primary/10 border border-border rounded text-xs font-mono transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* Live Rendered Preview Card */}
            <Card className="p-6 bg-card border-border shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">
                    {t('mathPreview')} ({activeLang.toUpperCase()})
                  </h2>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  Live KaTeX
                </Badge>
              </div>

              {/* Rendered Prompt */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Question Prompt:
                </span>
                <div className="p-4 rounded-lg bg-muted/20 border border-border/80">
                  <KatexRenderer
                    content={currentText || 'Type formula in left pane to see preview...'}
                  />
                </div>
              </div>

              {/* Rendered MCQ Options */}
              {questionType === 'mcq' && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Options:
                  </span>
                  <div className="space-y-2">
                    {currentOptions.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-md border flex items-center gap-3 ${
                          opt.is_correct
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-border/80 bg-card'
                        }`}
                      >
                        <span className="font-mono text-xs font-bold text-primary w-4">
                          {opt.id}.
                        </span>
                        <div className="flex-1">
                          <KatexRenderer content={opt.text || '(empty)'} />
                        </div>
                        {opt.is_correct && (
                          <Badge variant="default" className="text-[10px] bg-emerald-600">
                            Correct
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rendered 3 Progressive Hints */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Scaffolded Hints:
                </span>
                <div className="space-y-2">
                  {currentHints.map((hint, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-md bg-muted/30 border border-border/60 space-y-1"
                    >
                      <span className="text-[11px] font-bold text-muted-foreground">
                        Hint {idx + 1}:
                      </span>
                      <KatexRenderer content={hint || '(No hint specified)'} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Rendered Worked Solution */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Worked Solution:
                </span>
                <div className="p-4 rounded-lg bg-muted/30 border border-border/60">
                  <KatexRenderer content={currentSolution || '(No solution specified)'} />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Version & Review Audit History */}
        <section className="mt-12 pt-8 border-t border-border space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">{t('revisionHistory')}</h2>
          </div>

          {versionHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No previous version revisions recorded. Saving changes creates revision snapshots.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">Rev</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Reviewer ID</th>
                    <th className="py-2.5 px-4">Review Notes</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {versionHistory.map((ver) => (
                    <tr key={ver.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-4 font-mono font-bold text-primary">
                        v{ver.version_number}
                      </td>
                      <td className="py-2.5 px-4 capitalize font-medium">{ver.status}</td>
                      <td className="py-2.5 px-4 font-mono text-muted-foreground">
                        {ver.reviewer_id || 'System / Importer'}
                      </td>
                      <td className="py-2.5 px-4 text-foreground">
                        {ver.review_notes || 'Initial import'}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(ver.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
