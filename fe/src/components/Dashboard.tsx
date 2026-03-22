import { Camera } from 'lucide-react';

interface DashboardProps {
  onStart: () => void;
}

export default function Dashboard({ onStart }: DashboardProps) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">Chào buổi sáng, User! 👋</h1>
        <p className="text-slate-500">Hôm nay bạn đã cứu được 2.5kg CO2 rồi đấy.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-600 p-6 rounded-3xl text-white shadow-lg shadow-green-200">
          <p className="opacity-80 mb-2">Tổng rác đã thu gom</p>
          <h3 className="text-4xl font-bold">128</h3>
          <p className="mt-4 text-sm bg-white/20 inline-block px-2 py-1 rounded">+12 tuần này</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 mb-2">Điểm Eco-Coin</p>
          <h3 className="text-4xl font-bold text-slate-800">2,450</h3>
          <button className="mt-4 text-green-600 font-medium text-sm">Đổi quà ngay →</button>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center">
          <button onClick={onStart} className="flex flex-col items-center group">
            <div className="p-4 bg-green-50 rounded-full text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
              <Camera size={32} />
            </div>
            <span className="mt-2 font-bold text-slate-700">Bắt đầu quét</span>
          </button>
        </div>
      </div>
    </div>
  );
}
