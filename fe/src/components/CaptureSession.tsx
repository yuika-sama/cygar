import { useState } from 'react';
import { Upload, X } from 'lucide-react';

interface CaptureSessionProps {
  onAnalysisComplete: () => void;
}

export default function CaptureSession({ onAnalysisComplete }: CaptureSessionProps) {
  const [files, setFiles] = useState<File[]>([]);

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
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
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />
        <label htmlFor="fileInput" className="bg-green-600 text-white px-6 py-3 rounded-full cursor-pointer hover:bg-green-700">
          Chọn ảnh
        </label>
      </div>

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
            onClick={onAnalysisComplete}
            className="aspect-square border-2 border-green-600 border-dashed rounded-xl flex items-center justify-center text-green-600 font-bold"
          >
            Phân tích ({files.length} ảnh)
          </button>
        </div>
      )}
    </div>
  );
}
