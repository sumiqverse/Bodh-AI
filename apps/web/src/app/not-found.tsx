import Link from 'next/link';

export default function GlobalNotFound(): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-8 bg-canvas-gradient text-ink font-sans">
        <div className="text-center space-y-4 max-w-md p-8 rounded-card border-2 border-ink bg-surface-white shadow-card">
          <img
            src="/image.png"
            alt="BodhAI"
            className="mx-auto h-16 w-16 rounded-full object-contain shrink-0 select-none drop-shadow-sm"
          />
          <h1 className="text-4xl font-black text-[#E8800A]">404</h1>
          <h2 className="text-2xl font-black">Page Not Found</h2>
          <p className="text-sm text-text-secondary">The requested page could not be located.</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-6 py-2.5 bg-[#E8800A] text-white rounded-full text-sm font-bold border-2 border-ink shadow-sm hover:bg-[#C96A00] transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
