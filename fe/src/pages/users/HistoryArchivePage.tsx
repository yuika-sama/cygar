
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHistorySessions } from '../../features/useHistorySessions';

export default function HistoryArchivePage() {
  const { data, loading, error } = useHistorySessions();

  return (
    <main className="min-h-screen bg-slate-50 pb-24 pt-24 md:ml-64 md:pb-12">
      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Kho lưu trữ lịch sử</h1>
            <p className="text-sm text-slate-500">Xem và quản lý các phiên nhận diện vật liệu đã thực hiện.</p>
          </div>
          {/* <button className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm md:self-auto">
            <Filter size={16} />
            Lọc
          </button> */}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[600px] w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Phiên</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ngày</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Vật liệu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400">Đang tải...</td>
                  </tr>
                )}
                {error && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-red-500">{error}</td>
                  </tr>
                )}
                {data && data.length === 0 && !loading && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400">Chưa có lịch sử.</td>
                  </tr>
                )}
                {data && data.map((session) => (
                  <tr className="hover:bg-slate-50" key={session.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {session.imageUrl && (
                          <img
                            src={session.imageUrl}
                            alt="Ảnh xem trước phiên"
                            className="hidden h-10 w-10 rounded-lg object-cover sm:block"
                          />
                        )}
                        <div>
                          <Link to="/session-detail" className="text-sm font-bold text-slate-900 hover:text-green-700">
                            {session.title}
                          </Link>
                          <p className="text-[10px] text-slate-500">{session.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">{session.date}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-md bg-green-100 px-2 py-1 text-[10px] font-bold text-green-800">{session.items}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <p className="text-[10px] font-medium text-slate-500">
              {data
                ? data.length > 0
                  ? `Hiển thị 1-${data.length} trên ${data.length}`
                  : 'Hiển thị 0 trên 0'
                : ''}
            </p>
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
