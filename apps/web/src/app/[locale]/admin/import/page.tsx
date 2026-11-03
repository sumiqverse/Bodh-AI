'use client';

import * as React from 'react';
import { AdminNav } from '@/components/admin/AdminNav';
import { getAuthToken, getWebApiClient } from '@/lib/api-client';
import type { ImportResponse } from '@bodhai/api-client';

export default function ContentImportPage(): React.JSX.Element {
  const api = getWebApiClient();
  const [content, setContent] = React.useState('');
  const [validated, setValidated] = React.useState('');
  const [result, setResult] = React.useState<ImportResponse | null>(null);
  const [message, setMessage] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function run(dryRun: boolean) {
    setBusy(true);
    setMessage('');
    try {
      const parsed: unknown = JSON.parse(content);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('The content pack must be a JSON object.');
      const response = await api.importContentPack(
        parsed as Record<string, unknown>,
        dryRun,
        getAuthToken() || undefined,
      );
      setResult(response);
      setValidated(dryRun ? content : '');
      setMessage(
        dryRun ? 'Server validation completed. No changes were saved.' : 'Content pack imported.',
      );
    } catch (error) {
      setValidated('');
      setResult(null);
      setMessage(error instanceof Error ? error.message : 'Content import failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container mx-auto max-w-5xl space-y-5 px-4 py-8">
      <AdminNav />
      <h1 className="text-2xl font-bold">Import curriculum content</h1>
      <p>Paste a content pack as JSON. Validate it with the server before importing.</p>
      <label className="block">
        Content pack
        <textarea
          className="mt-2 block w-full rounded border p-3 font-mono text-sm"
          rows={18}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setValidated('');
            setResult(null);
          }}
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded border px-4 py-2"
          disabled={busy || !content.trim()}
          onClick={() => void run(true)}
        >
          Validate without saving
        </button>
        <button
          type="button"
          className="rounded bg-primary px-4 py-2 text-primary-foreground"
          disabled={busy || !validated || validated !== content}
          onClick={() => void run(false)}
        >
          Import validated pack
        </button>
      </div>
      {message && (
        <p role="status" className="rounded border p-3">
          {message}
        </p>
      )}
      {result && (
        <section className="rounded border p-4">
          <h2 className="font-bold">{result.curriculum_code}</h2>
          <p>
            {result.total_mutations} changes {validated ? 'planned' : 'applied'}.
          </p>
          <ul className="list-disc pl-5">
            {result.details.map((detail, index) => (
              <li key={index}>{detail}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
