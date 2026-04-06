import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

interface CaptureSessionProps {
  onAnalysisComplete: (files: File[]) => void | Promise<void>;
  isSubmitting?: boolean;
}

export default function CaptureSession({ onAnalysisComplete, isSubmitting = false }: CaptureSessionProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);


  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  // Camera functions
  const openCamera = async () => {
    setShowCamera(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      alert('Không thể truy cập camera!');
      setShowCamera(false);
    }
  };

  const closeCamera = () => {
    setShowCamera(false);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.png`, { type: 'image/png' });
            setFiles((prev) => [...prev, file]);
          }
        }, 'image/png');
      }
    }
    closeCamera();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Tạo phiên nhận diện mới</h2>

      <div className="border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center bg-white">
        <Upload className="mx-auto mb-4 text-slate-400" size={48} />
        <p className="text-slate-600 mb-4">Chụp ảnh hoặc kéo thả nhiều ảnh rác thải vào đây</p>
          <input
            type="file"
            multiple
            className="hidden"
            id="fileInput"
            onChange={(e) => {
              const newFiles = Array.from(e.target.files || []);
              setFiles((prev) => [...prev, ...newFiles]);
            }}
          />
        <div className="flex flex-col md:flex-row gap-4 justify-center mt-4">
          <label htmlFor="fileInput" className="bg-green-600 text-white px-6 py-3 rounded-full cursor-pointer hover:bg-green-700">
            Chọn ảnh
          </label>
          <button
            type="button"
            className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700"
            onClick={openCamera}
          >
            Chụp ảnh
          </button>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-xl p-6 shadow-lg flex flex-col items-center">
            <video ref={videoRef} autoPlay playsInline className="rounded-lg mb-4 w-72 h-72 object-cover" />
            <div className="flex gap-4">
              <button
                onClick={capturePhoto}
                className="bg-green-600 text-white px-6 py-2 rounded-full hover:bg-green-700"
              >
                Chụp
              </button>
              <button
                onClick={closeCamera}
                className="bg-gray-400 text-white px-6 py-2 rounded-full hover:bg-gray-500"
              >
                Hủy
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="aspect-square bg-slate-200 rounded-xl overflow-hidden relative">
              <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="preview" />
              <button
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => onAnalysisComplete(files)}
            className="aspect-square border-2 border-green-600 border-dashed rounded-xl flex items-center justify-center text-green-600 font-bold disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang gửi phiên...' : `Phân tích (${files.length} ảnh)`}
          </button>
        </div>
      )}
    </div>
  );
}
