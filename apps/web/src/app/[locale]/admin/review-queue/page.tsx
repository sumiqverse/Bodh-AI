'use client';

import * as React from 'react';
import type { EditorialQuestion } from '@bodhai/api-client';
import { AdminNav } from '@/components/admin/AdminNav';
import { getAuthToken, getWebApiClient } from '@/lib/api-client';

export default function ReviewQueuePage(): React.JSX.Element {
  const api = getWebApiClient();
  const [items, setItems] = React.useState<EditorialQuestion[]>([]);
  const [offset, setOffset] = React.useState(0);
  const [pendingOnly, setPendingOnly] = React.useState(true);
  const [selected, setSelected] = React.useState<EditorialQuestion | null>(null);
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(async () => {
    setBusy(true);
    try {
      setItems(await api.listReviewQuestions(offset, getAuthToken() || undefined, pendingOnly));
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the review queue.');
    } finally {
      setBusy(false);
    }
  }, [api, offset, pendingOnly]);
  React.useEffect(() => {
    void load();
  }, [load]);
  function choose(item: EditorialQuestion) {
    const correct = item.options?.find((option) => option.is_correct === true);
    setSelected({
      ...item,
      verified_answer: item.verified_answer || (correct ? String(correct.id) : ''),
    });
    setMessage('');
  }
  async function save(publish: boolean) {
    if (!selected) return;
    setBusy(true);
    try {
      const answer = selected.verified_answer.trim();
      if (!selected.prompt.trim() || !answer)
        throw new Error('Enter a question and correct answer.');
      if (
        selected.options?.length &&
        !selected.options.some((option) => String(option.id) === answer)
      ) {
        throw new Error('Choose a correct answer from the available options.');
      }
      await api.saveReviewQuestion(
        selected.id,
        {
          prompt: selected.prompt,
          options:
            selected.options?.map((option) => ({
              ...option,
              is_correct: String(option.id) === answer,
            })) ?? null,
          verified_answer: answer,
          worked_solution: selected.worked_solution,
          explanation: selected.explanation,
          difficulty: selected.difficulty,
        },
        getAuthToken() || undefined,
      );
      if (publish) await api.publishReviewedQuestion(selected.id, getAuthToken() || undefined);
      setSelected(null);
      await load();
      setMessage(
        publish
          ? 'Question saved and published.'
          : selected.status === 'published'
            ? 'Changes saved to the published question.'
            : 'Changes saved. The question remains in review.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the question.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="container mx-auto max-w-5xl space-y-5 px-4 py-8">
      <AdminNav />
      <h1 className="text-2xl font-bold">Question review queue</h1>
      <p>
        Review the question, answer, options and solution before publishing. Shared questions
        require an administrator.
      </p>
      {message && (
        <p role="status" className="rounded border p-3">
          {message}
        </p>
      )}
      {selected ? (
        <section className="space-y-4 rounded border p-4">
          <h2 className="font-bold">
            {selected.code} · Skill {selected.skill_id}
          </h2>
          {selected.status === 'published' && (
            <p>Changes to this question will be visible to students when saved.</p>
          )}
          <label className="block">
            Question
            <textarea
              className="block w-full rounded border p-2"
              rows={4}
              value={selected.prompt}
              onChange={(e) => setSelected({ ...selected, prompt: e.target.value })}
            />
          </label>
          {selected.options?.map((option, index) => (
            <label className="block" key={index}>
              Option {String(option.id ?? index + 1)}
              <input
                className="block w-full rounded border p-2"
                value={String(option.text ?? '')}
                onChange={(e) =>
                  setSelected({
                    ...selected,
                    options:
                      selected.options?.map((entry, i) =>
                        i === index ? { ...entry, text: e.target.value } : entry,
                      ) ?? null,
                  })
                }
              />
            </label>
          ))}
          <label className="block">
            Correct answer
            {selected.options?.length ? (
              <select
                className="block w-full rounded border p-2"
                value={selected.verified_answer}
                onChange={(e) => setSelected({ ...selected, verified_answer: e.target.value })}
              >
                <option value="">Select an option</option>
                {selected.options.map((option, index) => (
                  <option key={index} value={String(option.id)}>
                    {String(option.id)}: {String(option.text)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="block w-full rounded border p-2"
                value={selected.verified_answer}
                onChange={(e) => setSelected({ ...selected, verified_answer: e.target.value })}
              />
            )}
          </label>
          <label className="block">
            Worked solution
            <textarea
              className="block w-full rounded border p-2"
              rows={4}
              value={selected.worked_solution}
              onChange={(e) => setSelected({ ...selected, worked_solution: e.target.value })}
            />
          </label>
          <label className="block">
            Explanation
            <textarea
              className="block w-full rounded border p-2"
              rows={3}
              value={selected.explanation ?? ''}
              onChange={(e) => setSelected({ ...selected, explanation: e.target.value })}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border px-3 py-2"
              disabled={busy}
              onClick={() => void save(false)}
            >
              {selected.status === 'published' ? 'Save changes' : 'Save draft'}
            </button>
            {selected.status !== 'published' && (
              <button
                type="button"
                className="rounded bg-primary px-3 py-2 text-primary-foreground"
                disabled={busy}
                onClick={() => void save(true)}
              >
                Approve and publish
              </button>
            )}
            <button
              type="button"
              className="rounded border px-3 py-2"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Back
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-3" aria-label="Questions awaiting review">
          <label>
            Show{' '}
            <select
              className="rounded border p-2"
              value={pendingOnly ? 'pending' : 'all'}
              onChange={(e) => {
                setPendingOnly(e.target.value === 'pending');
                setOffset(0);
              }}
            >
              <option value="pending">Awaiting review</option>
              <option value="all">All questions</option>
            </select>
          </label>
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => choose(item)}
              className="block w-full rounded border p-3 text-left hover:bg-muted"
            >
              <strong>{item.code}</strong> <span className="text-sm">({item.status})</span>
              <p>{item.prompt}</p>
            </button>
          ))}
          {!busy && items.length === 0 && <p>No questions found on this page.</p>}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border px-3 py-2"
              disabled={busy || offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 50))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded border px-3 py-2"
              disabled={busy || items.length < 50}
              onClick={() => setOffset(offset + 50)}
            >
              Next
            </button>
            <span>Page {offset / 50 + 1}</span>
          </div>
        </section>
      )}
    </main>
  );
}
