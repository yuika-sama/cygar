import { LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function TopBar() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    setIsUserMenuOpen(false);
    navigate('/login');
  };

  return (
    <header className="fixed top-0 z-40 w-full border-b border-slate-200 bg-white/85 px-6 py-3 backdrop-blur-xl">
      <div className="flex max-w justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          <Link to="/" className="text-2xl font-black tracking-tight text-green-800">
            CyGar
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative ml-1" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="h-8 w-8 overflow-hidden rounded-full border-2 border-green-500"
              aria-label="Open user menu"
            >
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"
                alt="User avatar"
                className="h-full w-full object-cover"
              />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-10 z-50 min-w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={16} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
