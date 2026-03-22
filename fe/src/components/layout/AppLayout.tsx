import { Outlet } from 'react-router-dom';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import SideNav from './SideNav';
import TopBar from './TopBar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <SideNav />
      <div className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
