import { Aperture, History, Home, Plus, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-between border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-xl md:hidden">
      <NavLink to="/" className="flex flex-col items-center gap-1 text-slate-500">
        <Home size={18} />
        <span className="text-[10px] font-bold uppercase">Home</span>
      </NavLink>

      <NavLink to="/recognize" className="flex flex-col items-center gap-1 text-green-700">
        <Aperture size={18} />
        <span className="text-[10px] font-bold uppercase">Scan</span>
      </NavLink>

      <div className="relative -top-6">
        <NavLink
          to="/new-session"
          className="flex items-center justify-center rounded-full bg-green-700 p-4 text-white shadow-lg shadow-green-800/30"
        >
          <Plus size={18} />
        </NavLink>
      </div>

      <NavLink to="/history" className="flex flex-col items-center gap-1 text-slate-500">
        <History size={18} />
        <span className="text-[10px] font-bold uppercase">History</span>
      </NavLink>

      <button className="flex flex-col items-center gap-1 text-slate-500">
        <Settings size={18} />
        <span className="text-[10px] font-bold uppercase">Settings</span>
      </button>
    </nav>
  );
}
