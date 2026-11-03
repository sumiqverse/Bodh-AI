'use client';

import * as React from 'react';

interface LearningEfficiencyCardProps {
  quizAccuracy: number;
  totalAttempts: number;
  activeLearning: number;
  incompleteTasks: number;
}

export function LearningEfficiencyCard({
  quizAccuracy,
  totalAttempts,
  activeLearning,
  incompleteTasks,
}: LearningEfficiencyCardProps): React.JSX.Element {
  return (
    <section className="rounded-card border-2 border-ink bg-surface-white dark:bg-card shadow-card p-5 space-y-3">
      <h3 className="text-base font-bold text-ink dark:text-white">Learning progress</h3>
      <p className="text-sm">
        Answer accuracy: <strong>{totalAttempts ? `${quizAccuracy}%` : 'No attempts yet'}</strong>
      </p>
      <p className="text-sm">
        Skills in progress: <strong>{activeLearning}%</strong>
      </p>
      <p className="text-sm">
        Skills not started: <strong>{incompleteTasks}%</strong>
      </p>
    </section>
  );
}
