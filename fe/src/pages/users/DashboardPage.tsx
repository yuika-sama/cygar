
import { ChartColumn, ChevronRight, Eye, History, Recycle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '../../features/useDashboardData';

export default function DashboardPage() {
  const { data, loading, error } = useDashboardData();

  return (
    <main className="min-h-screen px-6 pb-24 pt-24 md:ml-64 md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl">
        <section className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="mb-2 text-4xl font-black tracking-tight text-slate-900">
              {loading ? 'Đang tải...' : error ? 'Có lỗi xảy ra' : `Xin chào, ${data?.username || ''}`}
            </h1>
            <p className="font-medium text-slate-500">
              {loading
                ? 'Đang tải dữ liệu tổng quan...'
                : error
                ? 'Không thể tải dữ liệu bảng điều khiển.'
                : `Bạn đã thực hiện ${data?.usageCount ?? 0} lượt sử dụng và xem ${data?.viewedHistoryCount ?? 0} mục lịch sử.`}
            </p>
          </div>
          <div className="flex gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-800">
              <History size={14} />
              {loading || error ? '-- lượt dùng' : `${data?.usageCount} lượt dùng`}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-800">
              <Eye size={14} />
              {loading || error ? '-- đã xem' : `${data?.viewedHistoryCount} đã xem`}
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="flex flex-col gap-4 md:col-span-4">
            <Link to="/history" className="rounded-2xl bg-slate-200/50 p-6 transition hover:bg-slate-200">
              <div className="mb-4 inline-flex rounded-xl bg-white p-3 text-green-700 shadow-sm">
                <Recycle size={24} />
              </div>
              <h3 className="mb-1 text-xl font-bold">Lịch sử phiên quét</h3>
              <p className="text-sm text-slate-500">Xem lại các phiên nhận diện trước đó</p>
            </Link>
            <Link
              to="/new-session"
              className="rounded-2xl bg-gradient-to-br from-green-700 to-green-500 p-6 text-white shadow-lg shadow-green-900/20"
            >
              <div className="mb-4 inline-flex rounded-xl bg-white/20 p-3">
                <ChartColumn size={24} />
              </div>
              <h3 className="mb-1 text-xl font-bold">Phiên quét mới</h3>
              <p className="text-sm text-white/80">Bắt đầu nhận diện ảnh để nhận gợi ý tái chế ngay</p>
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-sm md:col-span-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Chỉ số tổng quan</h3>
                <p className="text-sm text-slate-500">Dữ liệu lấy trực tiếp từ backend</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng lượt sử dụng</p>
                <p className="text-2xl font-black text-green-700">
                  {loading || error ? '--' : `${data?.usageCount ?? 0}`}
                </p>
                <p className="mt-1 text-xs text-slate-500">Số lần bạn đã chạy các phiên nhận diện</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lịch sử đã xem</p>
                <p className="text-2xl font-black text-amber-700">
                  {loading || error ? '--' : `${data?.viewedHistoryCount ?? 0}`}
                </p>
                <p className="mt-1 text-xs text-slate-500">Số mục lịch sử bạn đã mở xem</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:col-span-12 lg:col-span-7">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">Hoạt động gần đây</h3>
              <Link to="/history" className="text-sm font-bold text-green-700">
                Xem tất cả
              </Link>
            </div>
            {loading && <div>Đang tải...</div>}
            {error && <div className="text-red-500">Không thể tải hoạt động.</div>}
            {!loading && !error && data?.recentActivities?.length === 0 && (
              <div>Chưa có hoạt động nào.</div>
            )}
            {!loading && !error && data?.recentActivities?.map((activity) => (
              <div key={activity.id} className="group flex items-center gap-4 py-2">
                <img
                  src="https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300"
                  alt="Vật liệu đã nhận diện"
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <p className="font-bold group-hover:text-green-700">{activity.action}</p>
                  <p className="text-xs text-slate-500">Đối tượng: {activity.targetName}</p>
                  <p className="text-xs text-slate-500">Ngày: {activity.date}</p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-700">{activity.id.slice(0, 6)}</div>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
