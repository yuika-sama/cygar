import { X } from 'lucide-react';

interface ChatbotWindowProps {
  onClose: () => void;
}

export default function ChatbotWindow({ onClose }: ChatbotWindowProps) {
  return (
    <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col z-50">
      <div className="p-4 bg-green-600 text-white flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">🤖</div>
          <span className="font-bold">Eco Assistant</span>
        </div>
        <button onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 h-80 p-4 overflow-y-auto space-y-4 bg-slate-50">
        <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm border border-slate-100 max-w-[80%]">
          Chào bạn! Tôi có thể giúp gì cho việc phân loại rác hôm nay?
        </div>
      </div>
      <div className="p-4 border-t bg-white">
        <input
          className="w-full bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 ring-green-500"
          placeholder="Hỏi về cách tái chế..."
        />
      </div>
    </div>
  );
}
