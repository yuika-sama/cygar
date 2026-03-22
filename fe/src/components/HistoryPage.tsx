import { MOCK_HISTORY } from '../data/mockHistory';

export default function HistoryPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Lịch sử phân loại</h2>
      <div className="space-y-4">
        {MOCK_HISTORY.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl flex items-center space-x-4 border border-slate-100">
            <img src={item.image} className="w-16 h-16 rounded-xl object-cover" alt="history item" />
            <div className="flex-1">
              <h4 className="font-bold">{item.name}</h4>
              <p className="text-sm text-slate-500">22 Tháng 3, 2024 • {item.type}</p>
            </div>
            <span className="text-green-600 font-bold">+{item.confidence * 10} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
