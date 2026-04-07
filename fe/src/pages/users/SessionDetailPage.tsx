import { Leaf, LoaderCircle, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import baseApi from '../../services/baseApi';
import type { ExecuteResponse } from '../../types/execute';

interface SessionDetailLocationState {
  sessionId?: string;
  executionId?: string;
  sessionName?: string;
}

export default function SessionDetailPage() {
  const location = useLocation();
  const state = (location.state as SessionDetailLocationState | null) ?? null;

  const sessionId = state?.sessionId ?? '';
  const executionId = state?.executionId ?? '';
  const sessionName = state?.sessionName ?? 'Session Detail';

  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!sessionId && !executionId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = executionId
          ? await baseApi.get<ExecuteResponse>(`/executions/${executionId}`)
          : await baseApi.post<ExecuteResponse>('/execute', {
              session_id: sessionId
            });
        console.log(response.data)
        setResult(response.data ?? null);
      } catch (err: unknown) {
        const message =
          typeof err === 'object' && err !== null && 'response' in err
            ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
            : undefined;
        setError(message || 'Không thể tải chi tiết session. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [executionId, sessionId]);

  const images = useMemo(() => result?.detection_result?.images ?? [], [result]);
  const firstImage = useMemo(() => images.find((item) => Boolean(item.image_url)), [images]);
  const recipes = useMemo(() => result?.recommendation_result?.recipes ?? [], [result]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 pb-24 pt-24 md:ml-64 md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-2">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-700">
              <Sparkles size={14} />
              <span>
                {sessionId
                  ? `Phiên ${sessionId.slice(0, 8)}`
                  : executionId
                  ? `Execution ${executionId.slice(0, 8)}`
                  : 'Session detail'}
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              {sessionName}
            </h1>
          </div>
          {/* <Link
            to="/crafting"
            className="rounded-full bg-green-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-green-900/20"
          >
            Bắt đầu chế tác
          </Link> */}
        </div>

        {!sessionId && !executionId ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="mb-2 text-xl font-bold text-slate-900">Không tìm thấy session_id</h2>
            <p className="mb-6 text-sm text-slate-600">Vui lòng quay lại trang lịch sử và chọn một phiên hợp lệ.</p>
            <Link to="/history" className="inline-flex rounded-full bg-green-600 px-5 py-2.5 text-sm font-bold text-white">
              Quay lại lịch sử
            </Link>
          </section>
        ) : loading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <LoaderCircle className="mx-auto mb-4 animate-spin text-green-600" size={24} />
            <p className="text-sm font-semibold text-slate-700">Đang phân tích session...</p>
          </section>
        ) : error ? (
          <section className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h2 className="mb-2 text-xl font-bold text-red-700">Không thể lấy dữ liệu session</h2>
            <p className="mb-6 text-sm text-slate-600">{error}</p>
            <Link to="/history" className="inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">
              Quay lại lịch sử
            </Link>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-7">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Ảnh trong session</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {images.length} ảnh
                </span>
              </div>

              {images.length === 0 ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
                  Không có ảnh hiển thị
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {images.map((image, index) => {
                    const imageTopObject = (image.detected_objects ?? [])
                      .slice()
                      .sort((a, b) => b.confidence - a.confidence)[0];

                    return (
                      <div key={`${image.image_url || image.original_name || 'image'}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        {image.image_url ? (
                          <img
                            src={image.image_url}
                            alt={image.original_name || `Ảnh ${index + 1}`}
                            className="h-48 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-48 items-center justify-center text-sm text-slate-500">Không có preview</div>
                        )}

                        <div className="space-y-1 p-3">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {image.original_name || image.converted_name || `Ảnh ${index + 1}`}
                          </p>
                          <p className="text-xs text-slate-500">
                            {imageTopObject
                              ? `Nhãn: ${imageTopObject.label} • Khớp ${Math.round(imageTopObject.confidence * 100)}%`
                              : 'Chưa có kết quả nhận diện cho ảnh này'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6 md:col-span-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Thuộc tính</h4>
                <div className="space-y-3">
                  {(result?.detection_result?.detected_labels ?? []).slice(0, 6).map((label) => (
                    <div key={label} className="rounded-xl bg-slate-100 p-3 font-bold">
                      {label}
                    </div>
                  ))}
                  {(result?.detection_result?.detected_labels ?? []).length === 0 && (
                    <div className="rounded-xl bg-slate-100 p-3 font-bold text-slate-500">Không có nhãn dữ liệu</div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-green-200 bg-green-50 p-6">
                <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-green-800">Dự án gợi ý</h4>
                {recipes.length > 0 ? (
                  <div className="space-y-3">
                    {recipes.slice(0,5).map((recipe, index) => (
                      <a
                        key={`${recipe.title || 'recipe'}-${index}`}
                        href={recipe.link || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-4 rounded-2xl bg-white p-3"
                      >
                        <img
                          src={firstImage?.image_url || 'https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=400'}
                          alt={recipe.title || 'Du an goi y'}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="truncate text-sm font-bold text-slate-900">{recipe.title || 'Cong thuc tai che'}</h5>
                          <p className="text-xs text-slate-500">Yêu thích: {recipe.favorites ?? 0} • Lượt xem: {recipe.view ?? 0}</p>
                        </div>
                        <Leaf size={16} className="ml-auto shrink-0 text-green-700" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white p-3 text-sm text-slate-500">Chưa có đề xuất dự án phù hợp.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
