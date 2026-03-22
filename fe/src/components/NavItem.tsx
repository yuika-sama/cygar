import type { ReactNode } from 'react';

interface NavItemProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-colors ${active ? 'bg-green-50 text-green-600' : 'text-slate-500 hover:bg-slate-100'}`}
    >
      {icon}
      <span className="hidden md:block font-medium">{label}</span>
    </button>
  );
}
