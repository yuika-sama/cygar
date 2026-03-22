import { Bolt, ChartColumn, ChevronRight, Leaf, Recycle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-6 pb-24 pt-24 md:ml-64 md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl">
        <section className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="mb-2 text-4xl font-black tracking-tight text-slate-900">Welcome Back, Julian.</h1>
            <p className="font-medium text-slate-500">Your organic AI guide has identified 12 items today.</p>
          </div>
          <div className="flex gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-800">
              <Leaf size={14} />
              Level 14 Curator
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-800">
              <Bolt size={14} />
              2.4k Points
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="flex flex-col gap-4 md:col-span-4">
            <Link to="/history" className="rounded-2xl bg-slate-200/50 p-6 transition hover:bg-slate-200">
              <div className="mb-4 inline-flex rounded-xl bg-white p-3 text-green-700 shadow-sm">
                <Recycle size={24} />
              </div>
              <h3 className="mb-1 text-xl font-bold">Scan History</h3>
              <p className="text-sm text-slate-500">Review your past 142 identifications</p>
            </Link>
            <Link
              to="/new-session"
              className="rounded-2xl bg-gradient-to-br from-green-700 to-green-500 p-6 text-white shadow-lg shadow-green-900/20"
            >
              <div className="mb-4 inline-flex rounded-xl bg-white/20 p-3">
                <ChartColumn size={24} />
              </div>
              <h3 className="mb-1 text-xl font-bold">New Scan</h3>
              <p className="text-sm text-white/80">Activate the Lens for real-time AI guidance</p>
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-sm md:col-span-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Weekly Recycling Impact</h3>
                <p className="text-sm text-slate-500">CO2 equivalents saved this week</p>
              </div>
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold">Last 7 Days</span>
            </div>
            <div className="mb-6 flex h-40 items-end gap-3">
              <div className="h-[40%] flex-1 rounded-t bg-slate-200" />
              <div className="h-[65%] flex-1 rounded-t bg-slate-200" />
              <div className="h-[85%] flex-1 rounded-t bg-green-600" />
              <div className="h-[45%] flex-1 rounded-t bg-slate-200" />
              <div className="h-[30%] flex-1 rounded-t bg-slate-200" />
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-4 text-center">
              <div>
                <p className="text-2xl font-black text-green-700">12.4kg</p>
                <p className="text-xs uppercase text-slate-500">Plastic Diverted</p>
              </div>
              <div className="border-x border-slate-200">
                <p className="text-2xl font-black text-amber-700">8.1kg</p>
                <p className="text-xs uppercase text-slate-500">Paper Recycled</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">34L</p>
                <p className="text-xs uppercase text-slate-500">Water Saved</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:col-span-12 lg:col-span-7">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">Recent Activity</h3>
              <Link to="/history" className="text-sm font-bold text-green-700">
                View All
              </Link>
            </div>
            <Link to="/session-detail" className="group flex items-center gap-4">
              <img
                src="https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300"
                alt="Detected waste"
                className="h-14 w-14 rounded-xl object-cover"
              />
              <div className="flex-1">
                <p className="font-bold group-hover:text-green-700">PET Bottle identified</p>
                <p className="text-xs text-slate-500">High-grade recyclable • 14 mins ago</p>
              </div>
              <div className="rounded-full bg-green-100 px-3 py-1 text-[10px] font-black text-green-700">+45 PTS</div>
              <ChevronRight size={16} className="text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
