export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-8 py-10 text-xs text-slate-500 md:ml-64">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="text-center md:text-left">
          <p className="font-bold text-slate-800">The Living Lens</p>
          <p className="mt-1">© 2026 The Living Lens. Organic AI Precision.</p>
        </div>
        <div className="flex gap-6">
          <a href="#" className="transition hover:text-green-700">
            Privacy Policy
          </a>
          <a href="#" className="transition hover:text-green-700">
            Terms of Service
          </a>
          <a href="#" className="transition hover:text-green-700">
            Carbon Report
          </a>
        </div>
      </div>
    </footer>
  );
}
