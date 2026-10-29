'use client';

import * as React from 'react';
import { Card, CardTitle, Button, Badge, Input, Select } from '@bodhai/ui';
import { AdminNav } from '@/components/admin/AdminNav';
import { KatexRenderer } from '@/components/katex-renderer';
import { Plus, Search, Edit3 } from 'lucide-react';

interface QuestionItem {
  id: string;
  code: string;
  skill_id: string;
  skill_name: string;
  topic_name: string;
  difficulty: number;
  question_type: 'mcq' | 'numeric' | 'short_text';
  prompt: string;
  status: 'draft' | 'in_review' | 'published';
  options: Array<{ id: string; text: string; is_correct?: boolean; rationale?: string }>;
  hints: string[];
}

const INITIAL_QUESTIONS: QuestionItem[] = [
  {
    id: 'q-001',
    code: 'M8-RAT-Q01',
    skill_id: 'sk-m8-rat-01',
    skill_name: 'Rational Numbers: Properties & Number Line',
    topic_name: 'Rational Numbers',
    difficulty: 0.35,
    question_type: 'mcq',
    prompt: 'Which of the following rational numbers lies strictly between $\\frac{1}{4}$ and $\\frac{1}{2}$?',
    status: 'published',
    options: [
      { id: 'A', text: '$\\frac{3}{8}$', is_correct: true, rationale: 'Correct common denominator midpoint' },
      { id: 'B', text: '$\\frac{1}{8}$', is_correct: false, rationale: 'Less than 1/4' },
      { id: 'C', text: '$\\frac{5}{8}$', is_correct: false, rationale: 'Greater than 1/2' },
      { id: 'D', text: '$\\frac{2}{6}$', is_correct: false, rationale: 'Added numerators and denominators directly' },
    ],
    hints: [
      'Find a common denominator for $\\frac{1}{4}$ and $\\frac{1}{2}$.',
      '$\\frac{1}{4} = \\frac{2}{8}$ and $\\frac{1}{2} = \\frac{4}{8}$.',
      'Which fraction has a numerator between 2 and 4 with denominator 8?',
    ],
  },
  {
    id: 'q-002',
    code: 'M8-LE-Q04',
    skill_id: 'sk-m8-lineq-02',
    skill_name: 'Linear Equations: Variables on Both Sides',
    topic_name: 'Linear Equations',
    difficulty: 0.65,
    question_type: 'mcq',
    prompt: 'Solve for $x$: $5x - 7 = 2x + 8$',
    status: 'published',
    options: [
      { id: 'A', text: '$x = 5$', is_correct: true, rationale: '3x = 15 => x = 5' },
      { id: 'B', text: '$x = 3$', is_correct: false, rationale: 'Subtracted 7 from 8 instead of adding' },
      { id: 'C', text: '$x = 15$', is_correct: false, rationale: 'Forgot to divide by 3' },
      { id: 'D', text: '$x = -5$', is_correct: false, rationale: 'Sign transposition error' },
    ],
    hints: [
      'Transpose all variable terms to the left-hand side and constants to the right.',
      'Subtract $2x$ from both sides: $5x - 2x = 8 + 7$.',
      '$3x = 15$. Divide both sides by 3 to find $x$.',
    ],
  },
  {
    id: 'q-003',
    code: 'M8-ALG-Q08',
    skill_id: 'sk-m8-alg-02',
    skill_name: 'Standard Algebraic Identities',
    topic_name: 'Algebraic Expressions',
    difficulty: 0.70,
    question_type: 'mcq',
    prompt: 'Expand the expression $(2x + 3y)^2$ using algebraic identities:',
    status: 'in_review',
    options: [
      { id: 'A', text: '$4x^2 + 12xy + 9y^2$', is_correct: true, rationale: 'Applied (a+b)^2 = a^2 + 2ab + b^2' },
      { id: 'B', text: '$4x^2 + 9y^2$', is_correct: false, rationale: 'Omitted middle 2ab term (very common error)' },
      { id: 'C', text: '$4x^2 + 6xy + 9y^2$', is_correct: false, rationale: 'Calculated ab instead of 2ab' },
      { id: 'D', text: '$2x^2 + 12xy + 3y^2$', is_correct: false, rationale: 'Forgot to square coefficients 2 and 3' },
    ],
    hints: [
      'Recall the identity: $(a + b)^2 = a^2 + 2ab + b^2$.',
      'Here, $a = 2x$ and $b = 3y$. Compute $a^2$, $2ab$, and $b^2$ separately.',
      '$(2x)^2 = 4x^2$, $2(2x)(3y) = 12xy$, and $(3y)^2 = 9y^2$.',
    ],
  },
  {
    id: 'q-004',
    code: 'M8-QUAD-Q02',
    skill_id: 'sk-m8-quad-01',
    skill_name: 'Understanding Quadrilaterals: Angles Sum',
    topic_name: 'Quadrilaterals',
    difficulty: 0.45,
    question_type: 'mcq',
    prompt: 'The three angles of a quadrilateral are $75^\\circ$, $90^\\circ$, and $110^\\circ$. What is the measure of the fourth angle?',
    status: 'draft',
    options: [
      { id: 'A', text: '$85^\\circ$', is_correct: true, rationale: '360 - 275 = 85' },
      { id: 'B', text: '$95^\\circ$', is_correct: false, rationale: 'Arithmetic addition error' },
      { id: 'C', text: '$75^\\circ$', is_correct: false, rationale: 'Guessing equal angles' },
      { id: 'D', text: '$105^\\circ$', is_correct: false, rationale: 'Subtracted from 380' },
    ],
    hints: [
      'What is the sum of all interior angles in any quadrilateral?',
      'The sum of angles in a quadrilateral is $360^\\circ$.',
      'Compute $360^\\circ - (75^\\circ + 90^\\circ + 110^\\circ)$.',
    ],
  },
];

export default function QuestionEditorPage(): React.JSX.Element {
  const [questions, setQuestions] = React.useState<QuestionItem[]>(INITIAL_QUESTIONS);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [isEditorOpen, setIsEditorOpen] = React.useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = React.useState<QuestionItem | null>(null);

  // Form state for creating / editing
  const [formCode, setFormCode] = React.useState<string>('');
  const [formSkill, setFormSkill] = React.useState<string>('sk-m8-rat-01');
  const [formDifficulty, setFormDifficulty] = React.useState<number>(0.5);
  const [formPrompt, setFormPrompt] = React.useState<string>('');
  const [optA, setOptA] = React.useState<string>('');
  const [optB, setOptB] = React.useState<string>('');
  const [optC, setOptC] = React.useState<string>('');
  const [optD, setOptD] = React.useState<string>('');
  const [correctOpt, setCorrectOpt] = React.useState<string>('A');
  const [hint1, setHint1] = React.useState<string>('');
  const [hint2, setHint2] = React.useState<string>('');
  const [hint3, setHint3] = React.useState<string>('');
  const [statusToast, setStatusToast] = React.useState<string | null>(null);

  const filteredQuestions = React.useMemo(() => {
    return questions.filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          q.code.toLowerCase().includes(query) ||
          q.prompt.toLowerCase().includes(query) ||
          q.skill_name.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [questions, statusFilter, searchQuery]);

  const handleOpenNew = () => {
    setEditingQuestion(null);
    setFormCode(`M8-NEW-Q0${questions.length + 1}`);
    setFormSkill('sk-m8-rat-01');
    setFormDifficulty(0.5);
    setFormPrompt('Solve for $x$: $2x + 6 = 14$');
    setOptA('$x = 4$');
    setOptB('$x = 10$');
    setOptC('$x = 8$');
    setOptD('$x = 2$');
    setCorrectOpt('A');
    setHint1('Subtract 6 from both sides of the equation.');
    setHint2('$2x = 14 - 6 = 8$.');
    setHint3('Divide both sides by 2 to isolate $x$.');
    setIsEditorOpen(true);
  };

  const handleEdit = (q: QuestionItem) => {
    setEditingQuestion(q);
    setFormCode(q.code);
    setFormSkill(q.skill_id);
    setFormDifficulty(q.difficulty);
    setFormPrompt(q.prompt);
    setOptA(q.options[0]?.text || '');
    setOptB(q.options[1]?.text || '');
    setOptC(q.options[2]?.text || '');
    setOptD(q.options[3]?.text || '');
    const correct = q.options.find((o) => o.is_correct)?.id || 'A';
    setCorrectOpt(correct);
    setHint1(q.hints[0] || '');
    setHint2(q.hints[1] || '');
    setHint3(q.hints[2] || '');
    setIsEditorOpen(true);
  };

  const handleSaveQuestion = (statusToSave: 'draft' | 'in_review' | 'published') => {
    const newQ: QuestionItem = {
      id: editingQuestion ? editingQuestion.id : `q-custom-${Date.now()}`,
      code: formCode.trim() || 'M8-CUSTOM-Q',
      skill_id: formSkill,
      skill_name: formSkill.includes('rat')
        ? 'Rational Numbers: Properties & Number Line'
        : formSkill.includes('lineq')
        ? 'Linear Equations: Variables on Both Sides'
        : 'Algebraic Expressions & Identities',
      topic_name: formSkill.includes('rat') ? 'Rational Numbers' : 'Algebra',
      difficulty: formDifficulty,
      question_type: 'mcq',
      prompt: formPrompt.trim(),
      status: statusToSave,
      options: [
        { id: 'A', text: optA, is_correct: correctOpt === 'A', rationale: 'Option A' },
        { id: 'B', text: optB, is_correct: correctOpt === 'B', rationale: 'Option B' },
        { id: 'C', text: optC, is_correct: correctOpt === 'C', rationale: 'Option C' },
        { id: 'D', text: optD, is_correct: correctOpt === 'D', rationale: 'Option D' },
      ],
      hints: [hint1.trim(), hint2.trim(), hint3.trim()].filter(Boolean),
    };

    if (editingQuestion) {
      setQuestions((prev) => prev.map((item) => (item.id === editingQuestion.id ? newQ : item)));
      setStatusToast(`Question ${newQ.code} updated successfully (${statusToSave.toUpperCase()}).`);
    } else {
      setQuestions((prev) => [newQ, ...prev]);
      setStatusToast(`New question ${newQ.code} created successfully (${statusToSave.toUpperCase()}).`);
    }

    setIsEditorOpen(false);
    setTimeout(() => setStatusToast(null), 3000);
  };

  const getStatusBadge = (status: QuestionItem['status']) => {
    switch (status) {
      case 'published':
        return <Badge variant="success" className="text-[10px]">Published</Badge>;
      case 'in_review':
        return <Badge variant="warning" className="text-[10px]">In Review</Badge>;
      case 'draft':
      default:
        return <Badge variant="outline" className="text-[10px]">Draft</Badge>;
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      <AdminNav />

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">
            Assessment Question Bank & LaTeX Editor
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Calibrate adaptive diagnostic items with LaTeX math syntax, distractor rationales, and 3-level hint ladders.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleOpenNew}
          className="text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Create New Question
        </Button>
      </div>

      {statusToast && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-medium"
        >
          {statusToast}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search code, prompt, or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>
          <div className="w-40">
            <Select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'published', label: 'Published' },
                { value: 'in_review', label: 'In Review' },
                { value: 'draft', label: 'Draft' },
              ]}
            />
          </div>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing {filteredQuestions.length} of {questions.length} calibrated questions
        </span>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((q) => (
          <Card key={q.id} className="p-5 shadow-xs transition-colors hover:border-primary/40">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{q.code}</span>
                  {getStatusBadge(q.status)}
                  <Badge variant="outline" className="text-[10px]">
                    Diff: {Math.round(q.difficulty * 100)}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">• {q.skill_name}</span>
                </div>

                {/* Prompt with LaTeX */}
                <div className="text-sm font-medium text-foreground bg-muted/20 p-3 rounded-xl border border-border/60">
                  <KatexRenderer content={q.prompt} />
                </div>

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        opt.is_correct
                          ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/30 font-semibold'
                          : 'bg-card border-border text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-muted-foreground">{opt.id}.</span>
                        <KatexRenderer content={opt.text} />
                      </div>
                      {opt.is_correct && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                          ✓ Correct
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 3-Level Hints Ladder Display */}
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs space-y-1.5">
                  <span className="font-semibold text-amber-800 dark:text-amber-300 block text-[11px]">
                    3-Level Hint Ladder:
                  </span>
                  {q.hints.map((hint, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-muted-foreground">
                      <span className="font-mono font-bold text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                        L{idx + 1}:
                      </span>
                      <KatexRenderer content={hint} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex md:flex-col items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(q)}
                  className="text-xs gap-1 cursor-pointer w-full"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Question
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Question Editor Drawer / Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-elevated border-border p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <CardTitle className="text-lg font-bold">
                {editingQuestion ? `Edit Question: ${editingQuestion.code}` : 'Author New Assessment Question'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsEditorOpen(false)} className="text-xs">
                ✕
              </Button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="form-code-input" className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Question Code
                  </label>
                  <Input
                    id="form-code-input"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="M8-RAT-Q05"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="form-difficulty-input" className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Difficulty ({Math.round(formDifficulty * 100)}%)
                  </label>
                  <input
                    id="form-difficulty-input"
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(parseFloat(e.target.value))}
                    className="w-full accent-primary mt-2"
                  />
                </div>
              </div>

              {/* Prompt Input with LaTeX live preview */}
              <div className="space-y-1">
                <label htmlFor="form-prompt-textarea" className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Question Prompt (Supports LaTeX like $x^2 + 5 = 9$)
                </label>
                <textarea
                  id="form-prompt-textarea"
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-card p-2 text-foreground font-mono text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                  <span className="text-[10px] text-muted-foreground block mb-1">Live LaTeX Render Preview:</span>
                  <KatexRenderer content={formPrompt} />
                </div>
              </div>

              {/* 4 Options Editor */}
              <div className="space-y-2">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px] block">
                  Options & Correct Answer Key
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg border border-border bg-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">Option A</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="correct-opt"
                          checked={correctOpt === 'A'}
                          onChange={() => setCorrectOpt('A')}
                        />
                        <span className="text-[10px]">Correct Key</span>
                      </label>
                    </div>
                    <Input value={optA} onChange={(e) => setOptA(e.target.value)} placeholder="$\\frac{3}{8}$" />
                  </div>

                  <div className="p-2.5 rounded-lg border border-border bg-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">Option B</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="correct-opt"
                          checked={correctOpt === 'B'}
                          onChange={() => setCorrectOpt('B')}
                        />
                        <span className="text-[10px]">Correct Key</span>
                      </label>
                    </div>
                    <Input value={optB} onChange={(e) => setOptB(e.target.value)} placeholder="$\\frac{1}{8}$" />
                  </div>

                  <div className="p-2.5 rounded-lg border border-border bg-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">Option C</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="correct-opt"
                          checked={correctOpt === 'C'}
                          onChange={() => setCorrectOpt('C')}
                        />
                        <span className="text-[10px]">Correct Key</span>
                      </label>
                    </div>
                    <Input value={optC} onChange={(e) => setOptC(e.target.value)} placeholder="$\\frac{5}{8}$" />
                  </div>

                  <div className="p-2.5 rounded-lg border border-border bg-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">Option D</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="correct-opt"
                          checked={correctOpt === 'D'}
                          onChange={() => setCorrectOpt('D')}
                        />
                        <span className="text-[10px]">Correct Key</span>
                      </label>
                    </div>
                    <Input value={optD} onChange={(e) => setOptD(e.target.value)} placeholder="$\\frac{2}{6}$" />
                  </div>
                </div>
              </div>

              {/* 3-Level Hints Ladder Editor */}
              <div className="space-y-2">
                <span className="font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 text-[10px] block">
                  Scaffolded 3-Level Hints Ladder
                </span>
                <div className="space-y-1.5">
                  <Input
                    value={hint1}
                    onChange={(e) => setHint1(e.target.value)}
                    placeholder="Hint 1: Gentle conceptual nudge..."
                  />
                  <Input
                    value={hint2}
                    onChange={(e) => setHint2(e.target.value)}
                    placeholder="Hint 2: Formula / structural scaffolding..."
                  />
                  <Input
                    value={hint3}
                    onChange={(e) => setHint3(e.target.value)}
                    placeholder="Hint 3: Fully worked intermediate step..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setIsEditorOpen(false)}>
                  Cancel
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSaveQuestion('draft')}>
                  Save as Draft
                </Button>
                <Button variant="primary" size="sm" onClick={() => handleSaveQuestion('in_review')}>
                  Submit for Pedagogical Review
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSaveQuestion('published')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Publish Directly
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
