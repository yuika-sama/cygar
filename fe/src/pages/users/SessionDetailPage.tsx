import { Leaf, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SessionDetailPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 pb-24 pt-24 md:ml-64 md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-2">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-700">
              <Sparkles size={14} />
              <span>Session #8824</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              Single-Use <span className="italic text-green-700">Transformation</span>
            </h1>
          </div>
          <Link
            to="/crafting"
            className="rounded-full bg-green-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-green-900/20"
          >
            Start Crafting
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="relative min-h-[400px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:col-span-7">
            <img
              src="https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=1200"
              alt="Detected material"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-2xl border border-white/30 bg-white/20 p-5 backdrop-blur">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/80">Detected Material</p>
                <h3 className="text-xl font-bold text-white">Clear Silica Glass</h3>
              </div>
              <div className="rounded-full bg-green-700/90 px-3 py-1.5 text-xs font-bold text-white">98.2% Match</div>
            </div>
          </div>

          <div className="flex flex-col gap-6 md:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Properties</h4>
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-100 p-3 font-bold">Recyclable</div>
                <div className="rounded-xl bg-slate-100 p-3 font-bold">Glass Bottle</div>
              </div>
            </div>

            <div className="rounded-3xl border border-green-200 bg-green-50 p-6">
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-green-800">Recommended Project</h4>
              <div className="flex items-center gap-4 rounded-2xl bg-white p-3">
                <img
                  src="https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=400"
                  alt="Recommended project"
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div>
                  <h5 className="text-sm font-bold text-slate-900">Self-Watering Garden</h5>
                  <p className="text-xs text-slate-500">45 mins • Intermediate</p>
                </div>
                <Leaf size={16} className="ml-auto text-green-700" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
