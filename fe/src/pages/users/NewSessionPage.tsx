
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import CaptureSession from '../../components/CaptureSession';
import baseApi from '../../services/baseApi';

interface AddSessionImage {
  original_name?: string;
  converted_name?: string;
  image_url?: string;
}

interface AddSessionResponse {
  session_id: string;
  session_name?: string;
  images?: AddSessionImage[];
}

export default function NewSessionPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Khi người dùng nhấn nút phân tích trong CaptureSession, chuyển sang trang nhận diện
  const handleAnalysisComplete = async (files: File[]) => {
    if (files.length === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      const response = await baseApi.post<AddSessionResponse>('/add-session', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const sessionId = response.data?.session_id;
      if (!sessionId) {
        throw new Error('Không tạo được session mới');
      }

      navigate('/results', {
        state: {
          sessionId,
          sessionName: response.data?.session_name,
          images: response.data?.images ?? []
        }
      });
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(message || 'Không thể tạo session. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-6 pt-24 md:ml-64 md:p-12">
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-green-200/40 blur-3xl" />
      <div className="relative z-10 w-full max-w-4xl">
        <div className="mb-8 space-y-2">
          <span className="inline-block rounded-full bg-green-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-green-800">
            Phiên mới
          </span>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900">
            Thêm/chụp ảnh vật liệu tái chế
          </h1>
          <p className="text-base text-slate-600">
            Chọn hoặc chụp nhiều ảnh vật liệu, sau đó nhấn "Phân tích" để nhận diện và gợi ý tái chế.
          </p>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        </div>
        <CaptureSession onAnalysisComplete={handleAnalysisComplete} isSubmitting={submitting} />
      </div>
    </main>
  );
}
