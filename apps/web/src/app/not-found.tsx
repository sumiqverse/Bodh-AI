import Link from 'next/link';

export default function GlobalNotFound(): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-8 bg-zinc-50 text-zinc-900 font-sans">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-4xl font-extrabold text-indigo-600">404</h1>
          <h2 className="text-2xl font-bold">Page Not Found</h2>
          <p className="text-sm text-zinc-600">The requested page could not be located.</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
            >
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
