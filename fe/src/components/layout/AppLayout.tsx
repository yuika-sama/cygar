import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import SideNav from './SideNav';
import TopBar from './TopBar';

export default function AppLayout() {
  const { pathname } = useLocation();
  // Hide footer for pages that should not render it (e.g. /ai)
  const hideFooter = pathname.startsWith('/ai');

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <SideNav />
      <div className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </div>
      {!hideFooter && <Footer />}
      <MobileBottomNav />
    </div>
  );
}
