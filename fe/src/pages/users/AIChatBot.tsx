import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Send, Mic, ChevronDown, RefreshCw, ChevronRight } from 'lucide-react';

const SAMPLE_MESSAGES: Array<{ from: 'user' | 'ai'; text: string }> = [
  { from: 'ai', text: 'Xin chào! Mình là Ami — một trợ lý mẫu.' },
  { from: 'user', text: 'Chào Ami!' },
];

export default function AIChatBot() {
  const [messages, setMessages] = useState(SAMPLE_MESSAGES);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastGesture, setLastGesture] = useState('neutral_idle');
  const [chatOpen, setChatOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const streamingAbortRef = useRef<AbortController | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendToAI = async (nextMessages: Array<{ from: 'user' | 'ai'; text: string }>) => {
    if (isStreaming) return;
    setIsStreaming(true);

    const token = localStorage.getItem('token');
    const payload = {
      model: 'all-MiniLM-L6-v2',
      messages: nextMessages.map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text })),
    };

    // placeholder AI reply entry
    const aiIndex = nextMessages.length;
    setMessages((prev) => [...prev, { from: 'ai', text: '' }]);

    const controller = new AbortController();
    streamingAbortRef.current = controller;

    const applySseData = (rawData: string) => {
      let content = rawData;
      try {
        const parsed = JSON.parse(rawData);
        if (parsed?.gesture) {
          setLastGesture(String(parsed.gesture));
        }
        if (parsed?.error) {
          content = `Loi AI: ${String(parsed.error)}`;
        } else if (typeof parsed?.content === 'string') {
          content = parsed.content;
        } else {
          content = JSON.stringify(parsed);
        }
      } catch {
        // Keep backward compatibility for plain text SSE data.
      }

      setMessages((prev) => {
        const copy = [...prev];
        copy[aiIndex] = { from: 'ai', text: (copy[aiIndex]?.text || '') + content };
        return copy;
      });
    };

    try {
      const res = await fetch(`${API_BASE}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      // debug: log response status and content-type
      console.debug('AI stream response', res.status, res.statusText, res.headers.get('content-type'));

      if (!res.ok) {
        // fallback to synchronous endpoint
        const fallback = await fetch(`${API_BASE}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!fallback.ok) {
          const txt = await fallback.text();
          throw new Error(txt || 'AI request failed');
        }
        const json = await fallback.json();
        const reply = json?.content || json?.message?.content || JSON.stringify(json);
        if (json?.gesture) {
          setLastGesture(String(json.gesture));
        }
        setMessages((prev) => {
          const copy = [...prev];
          copy[aiIndex] = { from: 'ai', text: reply };
          return copy;
        });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        const json = await res.json();
        const reply = json?.content || json?.message?.content || JSON.stringify(json);
        if (json?.gesture) {
          setLastGesture(String(json.gesture));
        }
        setMessages((prev) => {
          const copy = [...prev];
          copy[aiIndex] = { from: 'ai', text: reply };
          return copy;
        });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });

          // normalize CRLF to LF to handle servers that emit \r\n
          buffer = buffer.replace(/\r\n/g, '\n');

          let sepIndex = buffer.indexOf('\n\n');
          while (sepIndex !== -1) {
            const raw = buffer.slice(0, sepIndex);
            buffer = buffer.slice(sepIndex + 2);
            const lines = raw.split('\n');
            for (const line of lines) {
              const l = line.trim();
              if (l.startsWith('data:')) {
                const content = l.slice(5).trim();
                // debug: log parsed SSE data chunk
                console.debug('sse data chunk', content);
                applySseData(content);
              }
            }
            sepIndex = buffer.indexOf('\n\n');
          }
        }
        if (done) break;
      }

      if (buffer.trim()) {
        buffer = buffer.replace(/\r\n/g, '\n');
        const lines = buffer.split('\n');
        for (const line of lines) {
          const l = line.trim();
          if (l.startsWith('data:')) {
            const content = l.slice(5).trim();
            console.debug('sse leftover', content);
            applySseData(content);
          }
        }
      }
    } catch (err: unknown) {
      console.error('AI stream error', err);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessages((prev) => {
          const copy = [...prev];
          copy[aiIndex] = { from: 'ai', text: (copy[aiIndex]?.text || '') + ' [stream aborted]' };
          return copy;
        });
      } else {
        const errMessage = err instanceof Error ? err.message : String(err);
        setMessages((prev) => {
          const copy = [...prev];
          copy[aiIndex] = { from: 'ai', text: 'Có lỗi khi gọi AI: ' + errMessage };
          return copy;
        });
      }
    } finally {
      streamingAbortRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg = { from: 'user' as const, text: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    void sendToAI(nextMessages);
  };

  return (
    <main className="min-h-screen px-6 pb-24 pt-24 md:ml-64 md:px-8 md:pb-12 relative">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-center">
          <div className="relative w-full">
            <div className="flex items-start justify-center gap-6">
              {/* Center placeholder area for the avatar / canvas */}
              <div className="flex-1 flex justify-center">
                <div className="w-[62%] max-w-4xl">
                  <div className="rounded-3xl overflow-hidden shadow-2xl bg-white/10 border border-white/5">
                    <div className="w-full h-[78vh] bg-gradient-to-b from-zinc-900 to-zinc-800 flex items-end justify-center">
                      <div className="text-white/70 p-6">Live2D canvas placeholder</div>
                    </div>

                    <div className="p-3 bg-black/20 flex flex-wrap gap-2">
                      <button className="rounded-lg bg-white/10 px-3 py-1 text-sm text-white">Play Idle</button>
                      <button className="rounded-lg bg-white/10 px-3 py-1 text-sm text-white">Reload Model</button>

                      <div className="flex items-center gap-2">
                        <select disabled value="" className="rounded-md bg-white/5 px-2 py-1 text-xs text-white outline-none">
                          <option value="">Chọn motion...</option>
                        </select>
                        <button className="rounded-md bg-white/10 px-3 py-1 text-sm text-white">Play</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right chat panel */}
              <div className={`transition-transform ${chatOpen ? 'translate-x-0' : 'translate-x-36'}`}>
                <div className="w-96">
                  <div className="relative rounded-2xl bg-black/70 backdrop-blur-sm text-white shadow-2xl border border-white/10 flex flex-col h-[78vh] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <div>
                        <div className="text-sm font-semibold">Cuộc trò chuyện</div>
                        <div className="text-xs text-green-300 flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-green-400" /> Sẵn sàng
                        </div>
                        <div className="text-[11px] text-cyan-300">Gesture: {lastGesture}</div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <button title="Làm mới" className="p-1 rounded-md hover:bg-white/5">
                          <RefreshCw size={16} />
                        </button>
                        <button title="Thu gọn" onClick={() => setChatOpen((s) => !s)} className="p-1 rounded-md hover:bg-white/5">
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </div>

                    <div ref={scrollRef} className="px-3 py-4 overflow-y-auto flex-1 space-y-4">
                      {messages.length === 0 && <div className="text-sm text-white/70">Nhấn ENTER để chat với Ami</div>}

                      {messages.map((m, i) => (
                        <div key={i} className={`flex items-start gap-3 ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {m.from === 'ai' && <img src={`https://i.pravatar.cc/40?u=ami`} alt="Ami" className="h-9 w-9 rounded-full object-cover" />}
                          <div className={`${m.from === 'user' ? 'bg-green-700 text-white self-end' : 'bg-white/6 text-white'} max-w-[78%] rounded-xl px-3 py-2 text-sm`}>
                            {m.text}
                          </div>
                          {m.from === 'user' && <img src={`https://i.pravatar.cc/40?u=user`} alt="Bạn" className="h-8 w-8 rounded-full object-cover" />}
                        </div>
                      ))}
                    </div>

                    <form onSubmit={(e) => handleSend(e)} className="px-3 py-3 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              void handleSend();
                            }
                          }}
                          placeholder="Nhập tin nhắn..."
                          className="flex-1 rounded-xl bg-white/5 placeholder-white/60 text-white px-3 py-2 text-sm outline-none"
                        />
                        <button type="button" title="Mic" className="rounded-xl p-2 text-white/90 hover:bg-white/5">
                          <Mic size={16} />
                        </button>
                        <button type="submit" title="Gửi" disabled={isStreaming || input.trim() === ''} className="rounded-xl bg-green-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
                          <Send size={16} />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-white/60">
                        <div>*Lưu ý: Nội dung có thể được gửi tới API backend.</div>
                        <div>{input.length}/1000</div>
                      </div>
                    </form>
                  </div>
                </div>

                <button onClick={() => setChatOpen((s) => !s)} className="mt-3 flex items-center justify-center rounded-full bg-black/60 p-2 text-white shadow-md" aria-label="Toggle chat">
                  <ChevronRight size={18} className={`transition-transform ${chatOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
