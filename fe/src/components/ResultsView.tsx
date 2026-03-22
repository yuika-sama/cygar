import { Info, Play } from 'lucide-react';
import type { Recipe } from '../types/waste';

interface ResultsViewProps {
  onShowRecipe: (recipe: Recipe) => void;
}

export default function ResultsView({ onShowRecipe }: ResultsViewProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Kết quả phân tích</h2>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <img
            src="https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400"
            className="w-full rounded-2xl mb-4"
            alt="Waste"
          />
          <div className="flex justify-between items-center mb-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold uppercase">Nhựa (Plastic)</span>
            <span className="text-green-500 font-bold">98% Match</span>
          </div>
          <h3 className="text-xl font-bold text-slate-800">Chai nhựa PET</h3>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h3 className="font-bold text-slate-700">Gợi ý công thức tái chế:</h3>
          {[1, 2].map((item) => (
            <div
              key={item}
              className="bg-white p-4 rounded-2xl flex items-center justify-between border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                  <Play />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Chậu cây tự tưới từ chai nhựa</h4>
                  <p className="text-sm text-slate-500 text-blue-500">Độ khó: Dễ • Thời gian: 15p</p>
                </div>
              </div>
              <button
                onClick={() =>
                  onShowRecipe({
                    id: 1,
                    title: 'Chậu cây tự tưới',
                    difficulty: 'Easy',
                    description: 'B1: Cắt chai... B2: Luồn dây...'
                  })
                }
                className="p-2 bg-slate-100 rounded-full hover:bg-green-100 text-slate-600 hover:text-green-600"
              >
                <Info />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
