import { AdminNav } from '@/components/admin/AdminNav';
import { Link } from '@/i18n/routing';

export default function QuestionEditorPage(): React.JSX.Element {
  return (
    <main className="container mx-auto max-w-5xl space-y-5 px-4 py-8">
      <AdminNav />
      <h1 className="text-2xl font-bold">Question management</h1>
      <p>
        Review and edit shared questions in the review queue. Teachers can create classroom
        questions from their classroom.
      </p>
      <Link href="/admin/review-queue" className="inline-block rounded border px-4 py-2">
        Open review queue
      </Link>
    </main>
  );
}
