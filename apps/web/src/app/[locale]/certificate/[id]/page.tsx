'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@/i18n/routing';
import { getAuthToken, getWebApiClient } from '@/lib/api-client';

function Certificate({ id }: { id: string }): React.JSX.Element {
  const classId = useSearchParams().get('classId');
  const certificate = useQuery({
    queryKey: ['certificate', classId, id],
    queryFn: () => getWebApiClient().getMyCertificate(classId!, id, getAuthToken() || undefined),
    enabled: !!classId,
  });
  if (!classId) return <p className="p-8">Classroom is required to view this certificate.</p>;
  if (certificate.isLoading) return <p className="p-8">Loading certificate…</p>;
  if (certificate.isError || !certificate.data)
    return (
      <p role="alert" className="p-8">
        This certificate could not be loaded.
      </p>
    );
  const data = certificate.data;
  return (
    <main className="min-h-screen bg-surface-cream p-6 flex items-center justify-center">
      <article className="w-full max-w-3xl border-4 border-ink bg-white p-10 sm:p-16 text-center space-y-6 text-ink shadow-card">
        <p className="uppercase tracking-widest font-bold">BodhAI</p>
        <h1 className="text-3xl sm:text-4xl font-bold">Certificate of Completion</h1>
        <p>This certifies that</p>
        <p className="text-2xl font-bold">{data.student_name}</p>
        <p>has completed the chapter</p>
        <h2 className="text-2xl font-bold">{data.title}</h2>
        <p>
          {data.class_name} · {new Date(data.earned_at).toLocaleDateString('en-IN')}
        </p>
        <p className="text-xs">Certificate ID: {data.id}</p>
        <div className="flex justify-center gap-4 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-primary-orange text-white px-5 py-2 font-bold"
          >
            Print or save PDF
          </button>
          <Link href="/student" className="underline">
            Back
          </Link>
        </div>
      </article>
    </main>
  );
}

export default function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.JSX.Element {
  const { id } = React.use(params);
  return (
    <React.Suspense fallback={<p>Loading certificate…</p>}>
      <Certificate id={id} />
    </React.Suspense>
  );
}
