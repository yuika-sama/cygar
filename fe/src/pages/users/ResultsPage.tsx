import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ResultsView from '../../components/ResultsView';
import type { ExecuteResponse } from '../../types/execute';

interface ResultsLocationState {
  executeResult?: ExecuteResponse;
  sessionId?: string;
}

export default function ResultsPage() {
  const location = useLocation();
  const state = (location.state as ResultsLocationState | null) ?? null;

  const executeResult = useMemo(() => state?.executeResult ?? null, [state]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 pb-24 pt-24 md:ml-64 md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl">
        {!executeResult ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="mb-2 text-2xl font-bold text-slate-900">Chưa có dữ liệu kết quả</h1>
            <p className="mb-6 text-slate-600">
              Bạn cần tạo phiên mới, hệ thống sẽ tự xử lý và điều hướng sang trang kết quả.
            </p>
            <Link
              to="/new-session"
              className="inline-flex items-center rounded-full bg-green-600 px-6 py-3 text-sm font-bold text-white"
            >
              Tạo phiên mới
            </Link>
          </section>
        ) : (
          <ResultsView executeResult={executeResult} />
        )}
      </div>
    </main>
  );
}
