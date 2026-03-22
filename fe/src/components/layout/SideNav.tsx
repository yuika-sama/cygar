import {
  FolderClock,
  Home,
  Plus,
  Sparkles
} from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: Home },
//   { path: '/recognize', label: 'Recognize', icon: Aperture },
//   { path: '/crafting', label: 'Crafting 3D', icon: Palette },
//   { path: '/session-detail', label: 'Session Detail', icon: Sparkles },
  { path: '/history', label: 'History', icon: FolderClock }
];

export default function SideNav() {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-slate-200 bg-slate-50 pt-20 pb-6 md:flex">
      <div className="mb-8 px-6">
        <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Eco-profile lens</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">AI Recycling Guide</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-green-50 text-green-700'
                  : 'text-slate-600 hover:bg-slate-200/50'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 px-6">
        <NavLink
          to="/new-session"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-green-700 to-green-500 py-3 text-sm font-bold text-white shadow-lg shadow-green-900/20"
        >
          <Plus size={16} />
          New Scan
        </NavLink>
      </div>
    </aside>
  );
}
