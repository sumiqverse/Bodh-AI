'use client';

import * as React from 'react';
import { SquirrelWithClock, SquirrelWithTrophy, HexCoinIcon } from './MascotIcons';
import { X, CheckCircle2, HelpCircle, Sparkles, ArrowRight } from 'lucide-react';

interface TodayChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (xpEarned: number) => void;
  skillName?: string;
}

export function TodayChallengeModal({
  isOpen,
  onClose,
  onSuccess,
  skillName = 'Linear Equations in One Variable',
}: TodayChallengeModalProps): React.JSX.Element | null {
  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = React.useState<boolean>(false);
  const [isCorrect, setIsCorrect] = React.useState<boolean>(false);
  const [showHint, setShowHint] = React.useState<boolean>(false);

  // Challenge Question from NCERT Mathematics (Class 8)
  const question = {
    prompt: 'Solve for x:  3x − 7 = 14',
    options: [
      { id: 'A', text: 'x = 5' },
      { id: 'B', text: 'x = 7' },
      { id: 'C', text: 'x = 9' },
      { id: 'D', text: 'x = 21' },
    ],
    correctOption: 'B',
    explanation:
      'Step 1: Add 7 to both sides → 3x = 14 + 7 = 21. Step 2: Divide both sides by 3 → x = 21 / 3 = 7.',
    hint: 'First, eliminate the −7 by adding 7 to both sides of the equation. Then divide by the coefficient of x (3).',
  };

  const handleCheck = () => {
    if (!selectedOption) return;
    const correct = selectedOption === question.correctOption;
    setIsCorrect(correct);
    setIsSubmitted(true);
    if (correct) {
      onSuccess(50);
    }
  };

  const handleReset = () => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setIsCorrect(false);
    setShowHint(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-shell p-6 sm:p-7 space-y-5 text-ink dark:text-white select-none">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Challenge"
          className="absolute top-4 right-4 h-8 w-8 rounded-full border-2 border-ink bg-surface-cream hover:bg-surface-yellow flex items-center justify-center transition-colors cursor-pointer text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          {isSubmitted && isCorrect ? (
            <SquirrelWithTrophy className="w-14 h-14 shrink-0" />
          ) : (
            <SquirrelWithClock className="w-14 h-14 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-ink/40 bg-surface-yellow text-ink">
                Daily Quest
              </span>
              <span className="flex items-center gap-1 text-xs font-extrabold text-primary-orange">
                <HexCoinIcon className="w-3.5 h-3.5" />
                +50 XP
              </span>
            </div>
            <h2 className="text-xl font-black text-ink dark:text-white mt-1">Today's Challenge</h2>
            <p className="text-xs text-text-secondary dark:text-muted-foreground">
              Competency: <span className="font-bold">{skillName}</span>
            </p>
          </div>
        </div>

        {/* Question Box */}
        <div className="rounded-2xl border-2 border-ink bg-surface-cream/50 dark:bg-muted/40 p-4 space-y-3">
          <p className="font-mono font-bold text-base sm:text-lg text-ink dark:text-white">
            {question.prompt}
          </p>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {question.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              let btnClass =
                'border-2 border-ink bg-surface-white dark:bg-card hover:bg-surface-cream text-ink dark:text-white';
              if (isSelected) {
                btnClass = 'border-2 border-ink bg-primary-orange text-white shadow-xs';
              }
              if (isSubmitted && opt.id === question.correctOption) {
                btnClass = 'border-2 border-ink bg-emerald-600 text-white shadow-xs';
              } else if (isSubmitted && isSelected && !isCorrect) {
                btnClass = 'border-2 border-ink bg-rose-500 text-white shadow-xs';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isSubmitted && isCorrect}
                  onClick={() => setSelectedOption(opt.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${btnClass}`}
                >
                  <span
                    className={`h-6 w-6 rounded-full border border-ink flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSelected ? 'bg-white text-ink' : 'bg-surface-cream text-ink'
                    }`}
                  >
                    {opt.id}
                  </span>
                  <span>{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hint Section */}
        {!isSubmitted && (
          <div className="flex items-center justify-between text-xs">
            {showHint ? (
              <div className="p-3 rounded-xl border border-ink/30 bg-surface-yellow/40 text-ink leading-relaxed">
                💡 <span className="font-semibold">{question.hint}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowHint(true)}
                className="flex items-center gap-1.5 font-bold text-text-secondary hover:text-ink cursor-pointer"
              >
                <HelpCircle className="h-4 w-4 text-amber-500" />
                <span>Need a hint?</span>
              </button>
            )}
          </div>
        )}

        {/* Result Feedback Banner */}
        {isSubmitted && (
          <div
            className={`rounded-2xl border-2 border-ink p-4 space-y-2 text-xs font-bold ${
              isCorrect
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
                : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100'
            }`}
          >
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm">Awesome job! That is 100% correct! 🎉</span>
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  <span className="text-sm">Not quite! Check the explanation below.</span>
                </>
              )}
            </div>
            <p className="font-medium text-[11px] leading-relaxed opacity-90">
              {question.explanation}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {!isSubmitted ? (
            <button
              type="button"
              disabled={!selectedOption}
              onClick={handleCheck}
              className={`py-2.5 px-6 rounded-full border-2 border-ink font-bold text-sm shadow-card flex items-center gap-2 transition-all ${
                selectedOption
                  ? 'bg-primary-orange text-white hover:bg-primary-orange-dark cursor-pointer'
                  : 'bg-muted text-muted-foreground opacity-60 cursor-not-allowed'
              }`}
            >
              <span>Submit Answer</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : isCorrect ? (
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-6 rounded-full border-2 border-ink bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-card flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Claim +50 XP & Continue</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReset}
              className="py-2 px-5 rounded-full border-2 border-ink bg-surface-yellow hover:bg-surface-yellow-dark text-ink font-bold text-xs shadow-xs cursor-pointer"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
