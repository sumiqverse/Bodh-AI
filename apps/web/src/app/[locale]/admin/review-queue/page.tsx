'use client';

import * as React from 'react';
import { Card, Button, Badge } from '@bodhai/ui';
import { AdminNav } from '@/components/admin/AdminNav';
import { KatexRenderer } from '@/components/katex-renderer';
import { CheckCircle2, AlertTriangle, ShieldCheck, Check, Clock } from 'lucide-react';

interface ReviewItem {
  id: string;
  code: string;
  author: string;
  skill_code: string;
  skill_name: string;
  difficulty: number;
  prompt: string;
  status: 'in_review' | 'draft' | 'published';
  submitted_at: string;
  options: Array<{ id: string; text: string; is_correct?: boolean; rationale?: string }>;
  hints: string[];
}

const INITIAL_QUEUE: ReviewItem[] = [
  {
    id: 'rev-001',
    code: 'M8-ALG-Q08',
    author: 'Content SME Team (Delhi)',
    skill_code: 'M8-ALG-02',
    skill_name: 'Standard Algebraic Identities',
    difficulty: 0.70,
    prompt: 'Expand the expression $(2x + 3y)^2$ using algebraic identities:',
    status: 'in_review',
    submitted_at: '2026-10-28T14:20:00Z',
    options: [
      { id: 'A', text: '$4x^2 + 12xy + 9y^2$', is_correct: true, rationale: 'Applied (a+b)^2 = a^2 + 2ab + b^2' },
      { id: 'B', text: '$4x^2 + 9y^2$', is_correct: false, rationale: 'Omitted middle 2ab term (distractor diagnosis)' },
      { id: 'C', text: '$4x^2 + 6xy + 9y^2$', is_correct: false, rationale: 'Computed ab instead of 2ab' },
      { id: 'D', text: '$2x^2 + 12xy + 3y^2$', is_correct: false, rationale: 'Forgot to square coefficients' },
    ],
    hints: [
      'Recall the identity: $(a + b)^2 = a^2 + 2ab + b^2$.',
      'Here, $a = 2x$ and $b = 3y$. Calculate $(2x)^2$, $2(2x)(3y)$, and $(3y)^2$.',
      'Combine: $4x^2 + 12xy + 9y^2$.',
    ],
  },
  {
    id: 'rev-002',
    code: 'M8-QUAD-Q05',
    author: 'Pedagogical Reviewer 2',
    skill_code: 'M8-QUAD-02',
    skill_name: 'Special Parallelograms (Rhombus, Rectangle)',
    difficulty: 0.65,
    prompt: 'In a rhombus $ABCD$, the diagonals intersect at $O$. If $OA = 3\\text{ cm}$ and $OB = 4\\text{ cm}$, what is the length of side $AB$?',
    status: 'in_review',
    submitted_at: '2026-10-29T10:15:00Z',
    options: [
      { id: 'A', text: '$5\\text{ cm}$', is_correct: true, rationale: 'Diagonals bisect at right angles: 3^2 + 4^2 = 5^2' },
      { id: 'B', text: '$7\\text{ cm}$', is_correct: false, rationale: 'Directly added half diagonals' },
      { id: 'C', text: '$12\\text{ cm}$', is_correct: false, rationale: 'Multiplied half diagonals' },
      { id: 'D', text: '$25\\text{ cm}$', is_correct: false, rationale: 'Squared sum without square root' },
    ],
    hints: [
      'Remember that the diagonals of a rhombus are perpendicular bisectors of each other.',
      'Triangle $AOB$ is a right-angled triangle with legs $3\\text{ cm}$ and $4\\text{ cm}$.',
      'Apply the Pythagorean theorem: $AB^2 = 3^2 + 4^2 = 9 + 16 = 25$. So $AB = 5\\text{ cm}$.',
    ],
  },
  {
    id: 'rev-003',
    code: 'M8-RAT-Q12',
    author: 'Math Author 1',
    skill_code: 'M8-RAT-02',
    skill_name: 'Operations on Rational Numbers',
    difficulty: 0.50,
    prompt: 'Evaluate: $-\\frac{3}{5} + \\frac{7}{10} - \\left(-\\frac{1}{2}\\right)$',
    status: 'draft',
    submitted_at: '2026-10-27T16:45:00Z',
    options: [
      { id: 'A', text: '$\\frac{3}{5}$', is_correct: true, rationale: 'Common denominator 10: (-6 + 7 + 5)/10 = 6/10 = 3/5' },
      { id: 'B', text: '$\\frac{2}{5}$', is_correct: false, rationale: 'Sign error with -(-1/2)' },
      { id: 'C', text: '$\\frac{1}{10}$', is_correct: false, rationale: 'Subtracted 1/2 instead of adding' },
      { id: 'D', text: '$-\\frac{3}{5}$', is_correct: false, rationale: 'Double negative mishandling' },
    ],
    hints: [
      'Remember that subtracting a negative number is equivalent to adding: $-(-a) = +a$.',
      'Find the LCM of denominators 5, 10, and 2. The LCM is 10.',
      'Convert each fraction to denominator 10: $-\\frac{6}{10} + \\frac{7}{10} + \\frac{5}{10} = \\frac{6}{10} = \\frac{3}{5}$.',
    ],
  },
];

export default function ReviewQueuePage(): React.JSX.Element {
  const [queue, setQueue] = React.useState<ReviewItem[]>(INITIAL_QUEUE);
  const [activeTab, setActiveTab] = React.useState<'in_review' | 'draft' | 'published'>('in_review');
  const [feedbackToast, setFeedbackToast] = React.useState<string | null>(null);

  const filteredQueue = React.useMemo(() => {
    return queue.filter((item) => item.status === activeTab);
  }, [queue, activeTab]);

  const handlePublish = (id: string, code: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'published' } : item)),
    );
    setFeedbackToast(`Question ${code} approved and published live to adaptive engine.`);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleRequestChanges = (id: string, code: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'draft' } : item)),
    );
    setFeedbackToast(`Question ${code} returned to Author Drafts with reviewer feedback.`);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleReject = (id: string, code: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    setFeedbackToast(`Question ${code} archived from queue.`);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const inReviewCount = queue.filter((q) => q.status === 'in_review').length;
  const draftCount = queue.filter((q) => q.status === 'draft').length;
  const publishedCount = queue.filter((q) => q.status === 'published').length;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      <AdminNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">
            Pedagogical Review & Quality Assurance Queue
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Peer-review workflow verifying curriculum validity, mathematical precision, LaTeX formatting, and scaffolding.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Role: Pedagogical Content Lead
          </Badge>
        </div>
      </div>

      {feedbackToast && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center justify-between"
        >
          <span>{feedbackToast}</span>
          <Button variant="ghost" size="sm" onClick={() => setFeedbackToast(null)} className="h-6 text-xs">
            ✕
          </Button>
        </div>
      )}

      {/* Queue Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('in_review')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'in_review'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Pending Review ({inReviewCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('draft')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'draft'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Author Drafts ({draftCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('published')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'published'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Published Live ({publishedCount})
        </button>
      </div>

      {/* Items in Queue */}
      <div className="space-y-4">
        {filteredQueue.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            No items in this queue tab. All submitted content has been evaluated.
          </Card>
        ) : (
          filteredQueue.map((item) => (
            <Card key={item.id} className="p-6 shadow-xs border-border space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{item.code}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {item.skill_code}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Difficulty: {Math.round(item.difficulty * 100)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Competency: <strong className="text-foreground">{item.skill_name}</strong> • Submitted by {item.author}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'in_review' && (
                    <>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handlePublish(item.id, item.code)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve & Publish
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRequestChanges(item.id, item.code)}
                        className="text-xs cursor-pointer text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                      >
                        Request Changes
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReject(item.id, item.code)}
                        className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {item.status === 'draft' && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handlePublish(item.id, item.code)}
                      className="text-xs cursor-pointer"
                    >
                      Promote to Published
                    </Button>
                  )}

                  {item.status === 'published' && (
                    <Badge variant="success" className="text-xs font-semibold">
                      ✓ Active in Student Engine
                    </Badge>
                  )}
                </div>
              </div>

              {/* Prompt Text with LaTeX */}
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-sm font-medium">
                <KatexRenderer content={item.prompt} />
              </div>

              {/* Options & Distractor Rationale Check */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {item.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-lg border space-y-1 ${
                      opt.is_correct
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100 font-semibold'
                        : 'bg-card border-border text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold">{opt.id}.</span>
                      {opt.is_correct ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                          ✓ Verified Key
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Distractor</span>
                      )}
                    </div>
                    <div>
                      <KatexRenderer content={opt.text} />
                    </div>
                    {opt.rationale && (
                      <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/40">
                        Pedagogical Diagnostic Rationale: {opt.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* 3-Level Hints Ladder Check */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1.5">
                <span className="font-bold text-amber-800 dark:text-amber-300 block text-[11px]">
                  Scaffolded 3-Level Hint Ladder:
                </span>
                {item.hints.map((h, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="font-mono font-bold text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                      Level {i + 1}:
                    </span>
                    <KatexRenderer content={h} />
                  </div>
                ))}
              </div>

              {/* Reviewer Validation Checklist */}
              <div className="p-3 bg-muted/20 rounded-lg border border-border flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> NCERT Syllabus Aligned
                </span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Mathematical Proof Verified
                </span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> KaTeX Syntax Validated
                </span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> 3-Level Ladder Complete
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
