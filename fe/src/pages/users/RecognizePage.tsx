import { Camera, FlipHorizontal2, ImageIcon, Lightbulb, LoaderCircle, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';

interface ReceivedImageItem {
  id: string;
  name: string;
  uploadOrder: number;
  source: 'camera' | 'upload';
  previewUrl: string;
}

export default function RecognizePage() {
  const [receivedImages, setReceivedImages] = useState<ReceivedImageItem[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<ReceivedImageItem | null>(null);
  const uploadCounterRef = useRef(1);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      receivedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [receivedImages]);

  const latestImage = useMemo(() => receivedImages[receivedImages.length - 1], [receivedImages]);

  const addFilesToList = (files: FileList | null, source: ReceivedImageItem['source']) => {
    if (!files || files.length === 0) {
      return;
    }

    const nextItems: ReceivedImageItem[] = Array.from(files).map((file) => {
      const item: ReceivedImageItem = {
        id: `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        uploadOrder: uploadCounterRef.current,
        source,
        previewUrl: URL.createObjectURL(file)
      };
      uploadCounterRef.current += 1;
      return item;
    });

    setReceivedImages((prev) => [...prev, ...nextItems]);
  };

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFilesToList(event.target.files, 'upload');
    event.target.value = '';
  };

  const handleCameraChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFilesToList(event.target.files, 'camera');
    event.target.value = '';
  };

  return (
    <main className="min-h-screen px-6 pb-24 pt-24 md:ml-64 md:px-8 md:pb-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <h2 className="mb-2 text-4xl font-extrabold tracking-tight text-slate-900">Waste Recognition</h2>
          <p className="max-w-lg text-lg text-slate-600">
            Point your camera to identify materials and discover creative upcycling potential.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="relative aspect-video overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 shadow-lg">
              <img
                src={latestImage?.previewUrl ?? 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=1200'}
                alt="Scanning materials"
                className="h-full w-full object-cover opacity-90"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full border border-white/50 bg-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white backdrop-blur">
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle size={14} className="animate-spin" />
                    Scanning
                  </span>
                </div>
              </div>
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-6">
                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="rounded-full border border-white/30 bg-black/40 p-3 text-white"
                  type="button"
                >
                  <ImageIcon size={18} />
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="rounded-full border-4 border-white/50 bg-green-600 p-4 text-white"
                  type="button"
                >
                  <Camera size={20} />
                </button>
                <button className="rounded-full border border-white/30 bg-black/40 p-3 text-white">
                  <FlipHorizontal2 size={18} />
                </button>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Danh sách ảnh đã nhận</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {receivedImages.length} ảnh
                </span>
              </div>

              {receivedImages.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Chưa có ảnh. Nhấn icon ảnh để upload từ máy hoặc icon camera để chụp.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {receivedImages.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedPreview(item)}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-green-300 hover:bg-green-50/40"
                    >
                      <img src={item.previewUrl} alt={item.name} className="h-14 w-14 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">STT upload: {item.uploadOrder}</p>
                        <p className="text-xs font-semibold text-green-700">
                          {item.source === 'camera' ? 'Nguồn: Camera' : 'Nguồn: Upload máy'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-8 lg:col-span-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold">Live Detection</h3>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">2 Items</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border-l-4 border-green-600 bg-slate-100 p-4">
                  <div>
                    <p className="font-bold">Plastic Bottle</p>
                    <p className="text-xs text-slate-500">Type 01 PET</p>
                  </div>
                  <p className="text-sm font-bold text-green-700">98%</p>
                </div>
                <div className="rounded-2xl border-l-4 border-slate-300 bg-slate-100 p-4">
                  <p className="font-bold">Scanning...</p>
                  <p className="text-xs text-slate-500">Awaiting lock</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 flex items-center gap-2 px-2 text-xl font-bold">
                <Lightbulb size={18} className="text-amber-500" />
                Ideas
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Link to="/crafting" className="group block">
                  <img
                    src="https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=400"
                    alt="DIY planter"
                    className="mb-3 h-32 w-full rounded-2xl object-cover"
                  />
                  <h4 className="px-1 text-sm font-bold group-hover:text-green-700">DIY Planter</h4>
                </Link>
                <Link to="/crafting" className="group block">
                  <img
                    src="https://images.unsplash.com/photo-1616627450294-1886d0a7f95f?w=400"
                    alt="Organizer"
                    className="mb-3 h-32 w-full rounded-2xl object-cover"
                  />
                  <h4 className="px-1 text-sm font-bold group-hover:text-green-700">Organizer</h4>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUploadChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraChange}
      />

      {selectedPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-black">
            <button
              type="button"
              onClick={() => setSelectedPreview(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-slate-700"
            >
              <X size={18} />
            </button>
            <img
              src={selectedPreview.previewUrl}
              alt={selectedPreview.name}
              className="max-h-[80vh] w-full object-contain"
            />
            <div className="border-t border-white/10 bg-black/70 px-4 py-3 text-sm text-slate-100">
              <p className="font-semibold">{selectedPreview.name}</p>
              <p className="text-xs text-slate-300">
                STT upload: {selectedPreview.uploadOrder} •{' '}
                {selectedPreview.source === 'camera' ? 'Camera' : 'Upload máy'}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
