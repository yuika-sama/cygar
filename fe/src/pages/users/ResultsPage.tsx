import { LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ResultsView from '../../components/ResultsView';
import baseApi from '../../services/baseApi';
import type { ExecuteResponse } from '../../types/execute';

interface SessionImage {
  original_name?: string;
  converted_name?: string;
  image_url?: string;
}

interface ResultsLocationState {
  executeResult?: ExecuteResponse;
  sessionId?: string;
  sessionName?: string;
  images?: SessionImage[];
}

export default function ResultsPage() {
  const location = useLocation();
  const state = (location.state as ResultsLocationState | null) ?? null;

  const initialExecuteResult = useMemo(() => state?.executeResult ?? null, [state]);
  const sessionId = useMemo(() => state?.sessionId ?? '', [state]);
  const sessionName = useMemo(() => state?.sessionName ?? 'Phien nhan dien moi', [state]);
  const sessionImages = useMemo(() => state?.images ?? [], [state]);

  const [executeResult, setExecuteResult] = useState<ExecuteResponse | null>(initialExecuteResult);
  const [isExecuting, setIsExecuting] = useState<boolean>(!initialExecuteResult && Boolean(sessionId));
  const [executeError, setExecuteError] = useState<string | null>(null);

  useEffect(() => {
    setExecuteResult(initialExecuteResult);
  }, [initialExecuteResult]);

  const runExecute = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    setIsExecuting(true);
    setExecuteError(null);

    try {
      const response = await baseApi.post<ExecuteResponse>('/execute', {
        session_id: sessionId
      });
      setExecuteResult(response.data ?? null);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setExecuteError(message || 'Khong the phan tich session. Vui long thu lai.');
      setExecuteResult(null);
    } finally {
      setIsExecuting(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || initialExecuteResult) {
      return;
    }

    void runExecute();
  }, [sessionId, initialExecuteResult, runExecute]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 pb-24 pt-24 md:ml-64 md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl">
        {(sessionId || sessionImages.length > 0) && (
          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{sessionName}</h1>
                {sessionId && <p className="text-xs text-slate-500">Session ID: {sessionId}</p>}
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {sessionImages.length} ảnh đã tải lên
              </span>
            </div>

            {sessionImages.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có ảnh trong session này.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {sessionImages.map((image, index) => (
                  <div key={`${image.image_url || image.original_name || 'image'}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    {image.image_url ? (
                      <img
                        src={image.image_url}
                        alt={image.original_name || `Session image ${index + 1}`}
                        className="h-28 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center text-xs text-slate-400">Không có preview</div>
                    )}
                    <div className="p-2">
                      <p className="truncate text-xs font-semibold text-slate-700">
                        {image.original_name || image.converted_name || `Ảnh ${index + 1}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {!executeResult ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="mb-2 text-2xl font-bold text-slate-900">Chưa có dữ liệu kết quả</h1>
            {isExecuting ? (
              <div className="mb-6 flex flex-col items-center gap-3 text-slate-600">
                <LoaderCircle size={22} className="animate-spin text-green-600" />
                <p className="text-sm">Đang phân tích session, vui lòng đợi trong giây lát...</p>
              </div>
            ) : executeError ? (
              <div className="mb-6 space-y-3">
                <p className="text-sm font-semibold text-red-600">{executeError}</p>
                {sessionId && (
                  <button
                    type="button"
                    onClick={() => void runExecute()}
                    className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
                  >
                    Thu lai phan tich
                  </button>
                )}
              </div>
            ) : (
              <p className="mb-6 text-slate-600">
                Thông tin session này đã sẵn sàng.
              </p>
            )}

            <div className="flex items-center justify-center gap-3">
              <Link
                to="/new-session"
                className="inline-flex items-center rounded-full bg-green-600 px-6 py-3 text-sm font-bold text-white"
              >
                Tạo phiên mới
              </Link>
              {!isExecuting && sessionId && !executeResult && (
                <button
                  type="button"
                  onClick={() => void runExecute()}
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-800"
                >
                  Chạy phân tích
                </button>
              )}
            </div>
          </section>
        ) : (
          <ResultsView executeResult={executeResult} />
        )}
      </div>
    </main>
  );
}
