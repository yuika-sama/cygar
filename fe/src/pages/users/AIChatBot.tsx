import { useRef, useState, useEffect, FormEvent } from 'react';
import { Send, ChevronRight, Play, Square } from 'lucide-react';
import ModelCanvas from '../../hooks/useThreeModel';
import Loading from '../../components/Loading';

export default function AIChatBot() {
  const LIVE3D_MODEL_URL = '/runtime/eida.vrm';
  
  // Danh sách các file VRMA bạn đã chuẩn bị
  const VRMA_MOTIONS = [
    { label: 'Nghỉ ngơi', url: '/runtime/VRMA/Idle.vrma' },
    { label: 'Suy nghĩ', url: '/runtime/VRMA/Thinking.vrma' },
    { label: 'Vẫy tay', url: '/runtime/VRMA/Goodbye.vrma' },
    { label: 'Thư giãn', url: '/runtime/VRMA/Relax.vrma' },
    { label: 'Clapping', url: '/runtime/VRMA/Clapping.vrma' },
  ];

  const [messages, setMessages] = useState([{ from: 'ai' as const, text: 'Chào Đức Anh! Yuika đã sẵn sàng.' }]);
  const [input, setInput] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedVrma, setSelectedVrma] = useState(VRMA_MOTIONS[0].url);
  const modelRef = useRef<any>(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Tự động chạy Idle khi load xong
  useEffect(() => {
    if (isLoaded) {
      // start idle loop
      modelRef.current?.playMotion(VRMA_MOTIONS[0].url, { loop: true });
    }
  }, [isLoaded]);

  // Mapping backend gesture keys to VRMA / local motion identifiers
  const GESTURE_MAP: Record<string, string> = {
    neutral_idle: '/runtime/VRMA/Idle.vrma',
    greet_wave: '/runtime/VRMA/Goodbye.vrma',
    bow_polite: '/runtime/VRMA/Idle.vrma',
    explain_point: '/runtime/VRMA/LookAround.vrma',
    think_tilt: '/runtime/VRMA/Thinking.vrma',
    suggest_action: '/runtime/VRMA/Relax.vrma',
    show_project: '/runtime/VRMA/LookAround.vrma',
    list_items: '/runtime/VRMA/LookAround.vrma',
    highlight_materials: '/runtime/VRMA/Blush.vrma',
    navigate_next: '/runtime/VRMA/Jump.vrma',
    navigate_prev: '/runtime/VRMA/Jump.vrma',
    open_link_hand: '/runtime/VRMA/Goodbye.vrma',
    celebrate_success: '/runtime/VRMA/Clapping.vrma',
    empathy_soft: '/runtime/VRMA/Sad.vrma',
    ask_clarify: '/runtime/VRMA/Thinking.vrma',
    error_shrug: '/runtime/VRMA/Surprised.vrma',
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg = { from: 'user' as const, text: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');

    // Start thinking motion while waiting (loop)
    const thinkingMotion = GESTURE_MAP['think_tilt'] || '/runtime/VRMA/Thinking.vrma';
    try {
      setMessages((prev) => [...prev, { from: 'ai', text: '' }] );
      // play thinking (loop)
      modelRef.current?.playMotion(thinkingMotion, { loop: true });

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text })),
        }),
      });

      const json = await res.json();
      const reply = json?.text ?? json?.content ?? 'AI không có phản hồi.';

      // stop thinking before running backend motion
      modelRef.current?.stopAll();

      if (json?.gesture) {
        const mapped = GESTURE_MAP[json.gesture] || GESTURE_MAP['neutral_idle'];
        // play backend motion once (await duration) then return to idle
        try {
          const dur = await modelRef.current?.playMotion(mapped, { loop: false });
          // after the motion, go back to idle
          await modelRef.current?.playMotion(GESTURE_MAP['neutral_idle'], { loop: true });
        } catch (e) {
          // fallback to idle if error
          modelRef.current?.playMotion(GESTURE_MAP['neutral_idle'], { loop: true });
        }
      } else {
        // no gesture -> ensure idle
        modelRef.current?.playMotion(GESTURE_MAP['neutral_idle'], { loop: true });
      }

      // update the AI message text
      setMessages((prev) => {
        const copy = [...prev];
        const aiIndex = copy.findIndex((m) => m.from === 'ai' && m.text === '');
        if (aiIndex >= 0) copy[aiIndex] = { from: 'ai', text: reply };
        return copy;
      });
    } catch (err: any) {
      modelRef.current?.stopAll();
      modelRef.current?.playMotion(GESTURE_MAP['neutral_idle'], { loop: true });
      setMessages((prev) => {
        const copy = [...prev];
        const aiIndex = copy.findIndex((m) => m.from === 'ai' && m.text === '');
        if (aiIndex >= 0) copy[aiIndex] = { from: 'ai', text: `Lỗi kết nối: ${err?.message || err}` };
        return copy;
      });
    }
  };

  return (
    <main className="min-h-screen px-6 pb-24 pt-24 md:ml-64 bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl flex gap-6 h-[80vh]">
        
        {/* VIEWPORT MODEL */}
        <div className="flex-1 relative bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <ModelCanvas
            ref={modelRef}
            modelUrl={LIVE3D_MODEL_URL}
            onLoaded={() => setIsLoaded(true)}
            className="w-full h-full"
          />

          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
              <Loading text="Đang khởi tạo nhân vật..." />
            </div>
          )}

          {/* DROPDOWN ĐIỀU KHIỂN MOTION */}
          <div className="absolute top-4 left-4 z-40 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl w-64">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Chuyển động (VRMA)</h4>
            <div className="space-y-3">
              <select
                value={selectedVrma}
                onChange={(e) => setSelectedVrma(e.target.value)}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 ring-green-500"
              >
                {VRMA_MOTIONS.map((m) => (
                  <option key={m.url} value={m.url}>{m.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => modelRef.current?.playMotion(selectedVrma)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold transition-all"
                >
                  <Play size={14} /> CHẠY
                </button>
                <button
                  onClick={() => modelRef.current?.stopAll()}
                  className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-all"
                >
                  <Square size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CHAT BOX (Giữ nguyên cấu trúc của bạn) */}
        <div className="w-96 flex flex-col bg-black/40 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <span className="text-sm font-bold">Trò chuyện với Yuika</span>
            <div className={`w-2 h-2 rounded-full ${isLoaded ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${m.from === 'user' ? 'bg-green-600' : 'bg-white/10'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập nội dung..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
            <button type="submit" className="p-2 bg-green-600 rounded-xl hover:scale-105 transition-transform">
              <Send size={18} />
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}