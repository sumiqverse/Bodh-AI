import { AdminNav } from '@/components/admin/AdminNav';

export default function EvaluationDashboardPage(): React.JSX.Element {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <AdminNav />
      <h1 className="text-2xl font-bold">Model evaluation</h1>
      <p>
        Evaluation results are not available yet. They will appear here when an evaluation has been
        run on recorded data.
      </p>
    </main>
  );
}
