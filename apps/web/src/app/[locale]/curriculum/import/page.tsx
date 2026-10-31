'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { CurriculumTabs } from '@/components/curriculum-tabs';
import { Button, buttonVariants, Badge, Card } from '@bodhai/ui';
import {
  UploadCloud,
  FileCode,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  BookOpen,
  Network,
} from 'lucide-react';
import { getWebApiClient, getAuthToken } from '@/lib/api-client';
import type { ImportResponse } from '@bodhai/api-client';

export default function BulkImportPage(): React.JSX.Element {
  const t = useTranslations('curriculum');
  const [packText, setPackText] = React.useState<string>('');
  const [isRunning, setIsRunning] = React.useState<boolean>(false);
  const [importResult, setImportResult] = React.useState<ImportResponse | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);

  const client = React.useMemo(() => getWebApiClient(), []);

  // Pre-fill sample content pack
  const loadSamplePack = () => {
    const sample = {
      curriculum: {
        code: 'NCERT-MATH-08',
        board: 'NCERT',
        grade: 8,
        subject: 'mathematics',
        version: '2024.1',
        name: 'NCERT Class 8 Mathematics',
        description: 'Comprehensive NCERT Class 8 Mathematics curriculum aligned with NEP 2020.',
      },
      topics: [
        {
          code: 'MATH-08-01',
          name: 'Rational Numbers',
          description: 'Properties, representation, and operations on rational numbers.',
          order_index: 1,
        },
      ],
      skills: [
        {
          code: 'MATH-08-01-001',
          name: 'Identify rational numbers in p/q form',
          description: 'Recognize rational numbers where p and q are integers and q is non-zero.',
          topic_code: 'MATH-08-01',
          difficulty: 1,
          blooms_level: 'remember',
          prerequisites: [],
        },
        {
          code: 'MATH-08-01-002',
          name: 'Closure property of rational numbers',
          description: 'Test and apply closure properties under basic arithmetic operations.',
          topic_code: 'MATH-08-01',
          difficulty: 2,
          blooms_level: 'understand',
          prerequisites: [
            {
              skill_code: 'MATH-08-01-001',
              relationship_type: 'prerequisite',
            },
          ],
        },
      ],
      questions: [
        {
          code: 'Q-MATH-08-01-001-01',
          skill_code: 'MATH-08-01-001',
          question_type: 'mcq',
          difficulty: 1,
          status: 'draft',
          needs_teacher_review: true,
          translations: [
            {
              language: 'en',
              question_text: 'Which of the following numbers is NOT a rational number?',
              options: [
                { id: 'A', text: '$\\frac{3}{4}$', is_correct: false },
                { id: 'B', text: '$-7$', is_correct: false },
                { id: 'C', text: '$\\frac{5}{0}$', is_correct: true },
                { id: 'D', text: '$0$', is_correct: false },
              ],
              verified_answer: 'C',
              worked_solution:
                'Division by zero is undefined, so $\\frac{5}{0}$ cannot be written in $p/q$ form with non-zero $q$.',
              explanation: 'A rational number requires $q \\neq 0$.',
              hints: [
                'Recall the definition of a rational number $p/q$.',
                'Look at the denominator of each option.',
                'A denominator of zero makes an expression undefined.',
              ],
            },
          ],
        },
      ],
      glossary: [
        {
          term: 'Rational Number',
          term_hi: 'परिमेय संख्या',
          definition_en:
            'A number that can be expressed in the form p/q where p and q are integers and q is not zero.',
          definition_hi:
            'ऐसी संख्या जिसे p/q के रूप में व्यक्त किया जा सके जहाँ p और q पूर्णांक हैं और q शून्य नहीं है।',
        },
      ],
    };
    setPackText(JSON.stringify(sample, null, 2));
    setParseError(null);
    setImportResult(null);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPackText(content);
      setParseError(null);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  // Run Import (Dry Run or Commit)
  const handleExecute = async (dryRun: boolean) => {
    setParseError(null);
    setImportResult(null);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(packText);
    } catch (err) {
      setParseError(`JSON Syntax Error: ${(err as Error).message}`);
      return;
    }

    setIsRunning(true);
    try {
      const token = getAuthToken() || undefined;
      const res = await client.importContentPack(parsed, dryRun, token);
      setImportResult(res);
    } catch (err) {
      console.error('Import execution error:', err);
      setParseError(`API Error: ${(err as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Banner */}
      <section className="bg-card border-b border-border pt-8 pb-6">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs font-mono">
                  CLI & API Importer
                </Badge>
                <Badge variant="default" className="text-xs">
                  Idempotent Upsert
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t('importTitle')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{t('importSubtitle')}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSamplePack}
                className="gap-2 text-xs"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Load Sample Pack</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="container mx-auto px-4 max-w-7xl">
        <CurriculumTabs />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: File upload & JSON editor */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-4 bg-card border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <FileCode className="h-4 w-4 text-primary" />
                  <span>{t('packJsonLabel')}</span>
                </div>

                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                  <UploadCloud className="h-4 w-4" />
                  <span>Upload .json/.yaml</span>
                  <input
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                value={packText}
                onChange={(e) => setPackText(e.target.value)}
                rows={18}
                placeholder="Paste content pack JSON here or click 'Load Sample Pack' above..."
                className="w-full rounded-md border border-input bg-muted/20 p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />

              {parseError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2 text-xs text-destructive">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!packText.trim() || isRunning}
                  onClick={() => handleExecute(true)}
                  className="gap-2 text-xs"
                >
                  <Play className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{isRunning ? 'Validating...' : t('dryRun')}</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={!packText.trim() || isRunning}
                  onClick={() => handleExecute(false)}
                  className="gap-2 text-xs shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isRunning ? 'Importing...' : t('executeImport')}</span>
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Diff & Validation Result */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 bg-card border-border shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-sm font-bold text-foreground">{t('importDiff')}</h2>
                {importResult && (
                  <Badge
                    variant={importResult.is_valid ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {importResult.is_valid ? 'Validation Passed' : 'Validation Failed'}
                  </Badge>
                )}
              </div>

              {!importResult ? (
                <div className="text-center py-12 space-y-2 text-muted-foreground">
                  <UploadCloud className="mx-auto h-10 w-10 opacity-40" />
                  <p className="text-xs">
                    Run a dry-run simulation or commit import to view the schema validation and
                    database diff.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Callout */}
                  <div
                    className={`rounded-lg p-3 text-xs leading-relaxed ${
                      importResult.is_valid
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-destructive/10 text-destructive border border-destructive/30'
                    }`}
                  >
                    {importResult.summary}
                  </div>

                  {/* Diff Metrics Grid */}
                  {importResult.diff && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                        Entities Breakdown:
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded bg-muted/40 border border-border/60">
                          <span className="text-muted-foreground block">Curriculum</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{importResult.diff.curriculum_created}
                          </span>{' '}
                          <span className="text-muted-foreground text-[11px]">
                            (~{importResult.diff.curriculum_updated})
                          </span>
                        </div>

                        <div className="p-2.5 rounded bg-muted/40 border border-border/60">
                          <span className="text-muted-foreground block">Topics</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{importResult.diff.topics_created}
                          </span>{' '}
                          <span className="text-muted-foreground text-[11px]">
                            (~{importResult.diff.topics_updated})
                          </span>
                        </div>

                        <div className="p-2.5 rounded bg-muted/40 border border-border/60">
                          <span className="text-muted-foreground block">Skills (KCs)</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{importResult.diff.skills_created}
                          </span>{' '}
                          <span className="text-muted-foreground text-[11px]">
                            (~{importResult.diff.skills_updated})
                          </span>
                        </div>

                        <div className="p-2.5 rounded bg-muted/40 border border-border/60">
                          <span className="text-muted-foreground block">Prerequisites (DAG)</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{importResult.diff.prerequisites_created}
                          </span>
                        </div>

                        <div className="p-2.5 rounded bg-muted/40 border border-border/60">
                          <span className="text-muted-foreground block">Questions</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{importResult.diff.questions_created}
                          </span>{' '}
                          <span className="text-muted-foreground text-[11px]">
                            (~{importResult.diff.questions_updated})
                          </span>
                        </div>

                        <div className="p-2.5 rounded bg-muted/40 border border-border/60">
                          <span className="text-muted-foreground block">Glossary Terms</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{importResult.diff.glossary_created}
                          </span>{' '}
                          <span className="text-muted-foreground text-[11px]">
                            (~{importResult.diff.glossary_updated})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Errors List */}
                  {importResult.errors.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-destructive flex items-center gap-1">
                        <XCircle className="h-4 w-4" />
                        <span>Validation Rejections ({importResult.errors.length}):</span>
                      </span>
                      <div className="rounded bg-destructive/10 border border-destructive/20 p-2.5 max-h-48 overflow-y-auto space-y-1">
                        {importResult.errors.map((err, i) => (
                          <p key={i} className="text-xs text-destructive font-mono">
                            • {err}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings List */}
                  {importResult.warnings.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Warnings ({importResult.warnings.length}):</span>
                      </span>
                      <div className="rounded bg-amber-500/10 border border-amber-500/20 p-2.5 max-h-36 overflow-y-auto space-y-1">
                        {importResult.warnings.map((w, i) => (
                          <p
                            key={i}
                            className="text-xs text-amber-600 dark:text-amber-400 font-mono"
                          >
                            • {w}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Steps on Success */}
                  {importResult.is_valid && (
                    <div className="pt-2 border-t border-border flex items-center gap-3">
                      <Link
                        href="/curriculum"
                        className={buttonVariants({
                          variant: 'outline',
                          size: 'sm',
                          className: 'flex-1 gap-2 text-xs inline-flex items-center justify-center',
                        })}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Browse Curriculum</span>
                      </Link>
                      <Link
                        href="/curriculum/graph"
                        className={buttonVariants({
                          variant: 'primary',
                          size: 'sm',
                          className:
                            'flex-1 gap-2 text-xs shadow-xs inline-flex items-center justify-center',
                        })}
                      >
                        <Network className="h-3.5 w-3.5" />
                        <span>View Graph</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
