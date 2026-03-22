import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HistoryArchivePage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24 pt-24 md:ml-64 md:pb-12">
      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">History Archive</h1>
            <p className="text-sm text-slate-500">Review and manage your past material recognition sessions.</p>
          </div>
          <button className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm md:self-auto">
            <Filter size={16} />
            Filter
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Session</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img
                        src="https://images.unsplash.com/photo-1523362628745-0c100150b504?w=200"
                        alt="Session preview"
                        className="hidden h-10 w-10 rounded-lg object-cover sm:block"
                      />
                      <div>
                        <Link to="/session-detail" className="text-sm font-bold text-slate-900 hover:text-green-700">
                          Coastal Cleanup #02
                        </Link>
                        <p className="text-[10px] text-slate-500">Point Reyes, CA</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">May 24, 2024</td>
                  <td className="px-6 py-4">
                    <span className="rounded-md bg-green-100 px-2 py-1 text-[10px] font-bold text-green-800">42 Plastic</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <Link to="/session-detail" className="text-sm font-bold text-slate-900 hover:text-green-700">
                        Office Recycling
                      </Link>
                      <p className="text-[10px] text-slate-500">Main St. Hub</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">May 21, 2024</td>
                  <td className="px-6 py-4">
                    <span className="rounded-md bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700">108 Paper</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <p className="text-[10px] font-medium text-slate-500">Showing 1-2 of 124</p>
            <div className="flex gap-1">
              <button disabled className="p-1 text-slate-400">
                <ChevronLeft size={16} />
              </button>
              <button className="p-1 text-slate-600">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
