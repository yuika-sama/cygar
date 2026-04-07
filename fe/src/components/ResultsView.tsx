import { ExternalLink, Lightbulb } from 'lucide-react';
import { useMemo } from 'react';
import type { ExecuteResponse } from '../types/execute';

interface ResultsViewProps {
  executeResult: ExecuteResponse;
}

export default function ResultsView({ executeResult }: ResultsViewProps) {
  const images = useMemo(() => executeResult.detection_result?.images ?? [], [executeResult]);
  const recipes = useMemo(() => executeResult.recommendation_result?.recipes ?? [], [executeResult]);

  const detectedObjects = useMemo(
    () =>
      images
        .flatMap((item) => item.detected_objects ?? [])
        .sort((a, b) => b.confidence - a.confidence),
    [images]
  );

  return (
    <div className="space-y-6">
      {/* <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Kết quả nhận diện</h2>
            <p className="text-sm text-slate-500">{executeResult.session_name || 'Phiên nhận diện'}</p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            {images.length} ảnh đã xử lý
          </span>
        </div>

        {firstImage?.image_url ? (
          <img src={firstImage.image_url} alt={firstImage.original_name || 'Ảnh kết quả'} className="h-64 w-full rounded-2xl object-cover" />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
            Không có ảnh để hiển thị
          </div>
        )}
      </section> */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Đối tượng được phát hiện</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {detectedObjects.length} mục
          </span>
        </div>

        {detectedObjects.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa nhận diện được đối tượng trong ảnh.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {detectedObjects.slice(0, 12).map((item, index) => (
              <div key={`${item.label}-${index}`} className="rounded-2xl border-l-4 border-green-600 bg-slate-100 p-4">
                <p className="font-bold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">Độ tin cậy: {Math.round(item.confidence * 100)}%</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
          <Lightbulb size={18} className="text-amber-500" />
          Gợi ý tái chế
        </h3>

        {recipes.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có gợi ý công thức phù hợp với phiên này.</p>
        ) : (
          <div className="space-y-3">
            {recipes.slice(0, 10).map((recipe, index) => (
              <a
                key={`${recipe.title || 'recipe'}-${index}`}
                href={recipe.link || '#'}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition hover:border-green-300 hover:bg-green-50/40"
              >
                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-green-700">{recipe.title || 'Gợi ý tái chế'}</h4>
                  <p className="text-xs text-slate-500">Yêu thích: {recipe.favorites ?? 0} • Lượt xem: {recipe.view ?? 0}</p>
                  {recipe.matched_labels && recipe.matched_labels.length > 0 && (
                    <p className="text-xs text-slate-500">Khớp nhãn: {recipe.matched_labels.join(', ')}</p>
                  )}
                </div>
                <ExternalLink size={16} className="text-slate-400 group-hover:text-green-700" />
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
