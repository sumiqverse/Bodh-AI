'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AdminNav } from '@/components/admin/AdminNav';
import { TrendingUp, Target, Users, ShieldCheck, CheckCircle2, HelpCircle } from 'lucide-react';

interface CalibrationBinData {
  bin_index: number;
  lower_bound: number;
  upper_bound: number;
  sample_count: number;
  avg_confidence: number;
  avg_accuracy: number;
  bin_error: number;
}

interface EvaluationData {
  auc: number;
  ece: number;
  brier_score: number;
  sample_count: number;
  student_count: number;
  train_student_count: number;
  test_student_count: number;
  bins: CalibrationBinData[];
}

/** Baseline evaluation demonstration state for pilots */
const INITIAL_EVALUATION: EvaluationData = {
  auc: 0.814,
  ece: 0.042,
  brier_score: 0.165,
  sample_count: 148,
  student_count: 50,
  train_student_count: 35,
  test_student_count: 15,
  bins: [
    {
      bin_index: 0,
      lower_bound: 0.0,
      upper_bound: 0.1,
      sample_count: 12,
      avg_confidence: 0.06,
      avg_accuracy: 0.08,
      bin_error: 0.02,
    },
    {
      bin_index: 1,
      lower_bound: 0.1,
      upper_bound: 0.2,
      sample_count: 16,
      avg_confidence: 0.15,
      avg_accuracy: 0.19,
      bin_error: 0.04,
    },
    {
      bin_index: 2,
      lower_bound: 0.2,
      upper_bound: 0.3,
      sample_count: 14,
      avg_confidence: 0.26,
      avg_accuracy: 0.29,
      bin_error: 0.03,
    },
    {
      bin_index: 3,
      lower_bound: 0.3,
      upper_bound: 0.4,
      sample_count: 15,
      avg_confidence: 0.35,
      avg_accuracy: 0.33,
      bin_error: 0.02,
    },
    {
      bin_index: 4,
      lower_bound: 0.4,
      upper_bound: 0.5,
      sample_count: 18,
      avg_confidence: 0.44,
      avg_accuracy: 0.44,
      bin_error: 0.0,
    },
    {
      bin_index: 5,
      lower_bound: 0.5,
      upper_bound: 0.6,
      sample_count: 17,
      avg_confidence: 0.56,
      avg_accuracy: 0.59,
      bin_error: 0.03,
    },
    {
      bin_index: 6,
      lower_bound: 0.6,
      upper_bound: 0.7,
      sample_count: 20,
      avg_confidence: 0.64,
      avg_accuracy: 0.7,
      bin_error: 0.06,
    },
    {
      bin_index: 7,
      lower_bound: 0.7,
      upper_bound: 0.8,
      sample_count: 16,
      avg_confidence: 0.75,
      avg_accuracy: 0.75,
      bin_error: 0.0,
    },
    {
      bin_index: 8,
      lower_bound: 0.8,
      upper_bound: 0.9,
      sample_count: 12,
      avg_confidence: 0.86,
      avg_accuracy: 0.83,
      bin_error: 0.03,
    },
    {
      bin_index: 9,
      lower_bound: 0.9,
      upper_bound: 1.0,
      sample_count: 8,
      avg_confidence: 0.94,
      avg_accuracy: 1.0,
      bin_error: 0.06,
    },
  ],
};

export default function EvaluationDashboardPage(): React.ReactElement {
  const t = useTranslations('evaluation');
  const [data] = useState<EvaluationData>(INITIAL_EVALUATION);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminNav />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('statusCalibrated')}
          </span>
          <span className="text-xs text-zinc-500">BKT / IRT Next-Response Prediction</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t('subtitle')}</p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* ROC-AUC */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t('rocAuc')}
            </span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {data.auc.toFixed(3)}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              High Discrimination
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t('rocAucDesc')}</p>
        </div>

        {/* ECE */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t('ece')}</span>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Target className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {(data.ece * 100).toFixed(1)}%
            </span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Excellent Calibration
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t('eceDesc')}</p>
        </div>

        {/* Brier Score */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t('brierScore')}
            </span>
            <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <HelpCircle className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {data.brier_score.toFixed(3)}
            </span>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              MSE Forecast
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t('brierDesc')}</p>
        </div>

        {/* Holdout Split */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t('holdoutSplit')}
            </span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {data.test_student_count}
            </span>
            <span className="text-xs text-zinc-500">/ {data.student_count} students</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {t('splitDetails', {
              testStudents: data.test_student_count,
              samples: data.sample_count,
              trainStudents: data.train_student_count,
            })}
          </p>
        </div>
      </div>

      {/* Reliability Diagram & Bins Table */}
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {t('calibrationTitle')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  {t('binRange')}
                </th>
                <th scope="col" className="px-6 py-3">
                  {t('samples')}
                </th>
                <th scope="col" className="px-6 py-3">
                  {t('confidence')}
                </th>
                <th scope="col" className="px-6 py-3">
                  {t('accuracy')}
                </th>
                <th scope="col" className="px-6 py-3">
                  {t('calibrationError')}
                </th>
                <th scope="col" className="px-6 py-3">
                  Visual Alignment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.bins.map((bin) => (
                <tr key={bin.bin_index} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="whitespace-nowrap px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    [{bin.lower_bound.toFixed(1)} – {bin.upper_bound.toFixed(1)}]
                  </td>
                  <td className="whitespace-nowrap px-6 py-3">{bin.sample_count}</td>
                  <td className="whitespace-nowrap px-6 py-3">
                    {(bin.avg_confidence * 100).toFixed(1)}%
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {(bin.avg_accuracy * 100).toFixed(1)}%
                  </td>
                  <td className="whitespace-nowrap px-6 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                        bin.bin_error <= 0.05
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}
                    >
                      {(bin.bin_error * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-3 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(bin.avg_accuracy * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Leakage Guard Notice */}
      <div className="mt-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
          aria-hidden="true"
        />
        <p>{t('leakageNotice')}</p>
      </div>
    </div>
  );
}
