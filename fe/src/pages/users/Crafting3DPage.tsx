import { Download, Palette, Rotate3D } from 'lucide-react';

export default function Crafting3DPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden pt-16 pb-20 md:ml-64 md:pb-0">
      <section className="relative flex min-h-[512px] flex-1 items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-4 md:p-8">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-green-200/30 blur-3xl" />
        <div className="relative z-10 flex aspect-square w-full max-w-lg items-center justify-center">
          <div className="absolute inset-0 scale-75 rounded-full border border-white/40 bg-white/30" />
          <img
            src="https://images.unsplash.com/photo-1581092921461-eab10380f2be?w=800"
            alt="3D crafting object"
            className="relative z-10 h-full w-full cursor-grab object-contain drop-shadow-2xl"
          />
          <div className="absolute bottom-0 rounded-full border border-white/50 bg-black/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-800 backdrop-blur">
            <span className="inline-flex items-center gap-2">
              <Rotate3D size={14} />
              Interactive Model
            </span>
          </div>
        </div>
      </section>

      <section className="z-20 border-t border-slate-200 bg-white p-6 md:p-8">
        <div className="mx-auto flex max-w-5xl flex-col justify-between gap-8 md:flex-row md:items-start">
          <div className="max-w-md">
            <span className="mb-3 inline-block rounded-full bg-green-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-green-800">
              Recycled PET
            </span>
            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Bottle Bloom Lamp</h1>
            <p className="text-sm leading-relaxed text-slate-600 md:text-base">
              Transform plastic bottles into a geometric desk lamp. This AI-optimized pattern maximizes structural integrity.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-slate-200 bg-slate-100 p-4 md:w-auto">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <Palette size={14} />
              Color Finish
            </div>
            <div className="mb-4 flex gap-2">
              <button className="h-6 w-6 rounded-full bg-green-700 ring-2 ring-green-400 ring-offset-1" />
              <button className="h-6 w-6 rounded-full bg-slate-800" />
              <button className="h-6 w-6 rounded-full bg-amber-200" />
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white">
              <Download size={16} />
              Download Plan
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
