import { Aperture } from 'lucide-react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NewSessionPage() {
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate('/recognize');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-6 pt-24 md:ml-64 md:p-12">
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-green-200/40 blur-3xl" />
      <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 items-center gap-12 pb-20 lg:grid-cols-12 md:pb-0">
        <div className="space-y-6 lg:col-span-5">
          <span className="inline-block rounded-full bg-green-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-green-800">
            New Session
          </span>
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-slate-900">
            Initiate <span className="italic text-green-700">Precision</span> Scan.
          </h1>
          <p className="text-lg text-slate-600">
            Configure your session metadata. The Living Lens uses neural networks to identify materials accurately.
          </p>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2">
                <label className="ml-1 block text-sm font-semibold text-slate-800">Session Title</label>
                <input
                  type="text"
                  placeholder="e.g., Sunday Park Cleanup"
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 outline-none ring-green-300 focus:ring-2"
                />
              </div>
              <div className="space-y-2">
                <label className="ml-1 block text-sm font-semibold text-slate-800">Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe the context..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 outline-none ring-green-300 focus:ring-2"
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-green-700 to-green-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-green-900/20"
              >
                <Aperture size={18} />
                Start Recognition
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
