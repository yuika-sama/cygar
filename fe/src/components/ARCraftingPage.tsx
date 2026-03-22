import { Box } from 'lucide-react';

export default function ARCraftingPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">3D Crafting Studio</h2>
        <div className="flex space-x-2">
          <span className="px-3 py-1 bg-white rounded-full text-sm shadow-sm border">Chai nhựa: 2</span>
          <span className="px-3 py-1 bg-white rounded-full text-sm shadow-sm border">Nắp chai: 5</span>
        </div>
      </div>
      <div className="flex-1 bg-slate-900 rounded-3xl relative overflow-hidden flex items-center justify-center">
        <div className="text-white text-center">
          <Box size={64} className="mx-auto mb-4 animate-bounce text-green-400" />
          <p className="text-slate-400">Đang tải môi trường 3D...</p>
          <p className="text-xs mt-2 text-slate-500">(Dùng Three.js để render mô hình tái chế tại đây)</p>
        </div>
        <div className="absolute bottom-6 left-6 right-6 flex justify-center space-x-4">
          <button className="bg-white/10 backdrop-blur-md text-white px-6 py-2 rounded-full border border-white/20">Xoay</button>
          <button className="bg-green-600 text-white px-6 py-2 rounded-full font-bold">Thử ghép đồ</button>
        </div>
      </div>
    </div>
  );
}
