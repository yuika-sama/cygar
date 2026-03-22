import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/auths/LoginPage';
import Crafting3DPage from '../pages/users/Crafting3DPage';
import DashboardPage from '../pages/users/DashboardPage';
import HistoryArchivePage from '../pages/users/HistoryArchivePage';
import NewSessionPage from '../pages/users/NewSessionPage';
import RecognizePage from '../pages/users/RecognizePage';
import SessionDetailPage from '../pages/users/SessionDetailPage';

export default function AppNavigation() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/new-session" element={<NewSessionPage />} />
          <Route path="/recognize" element={<RecognizePage />} />
          <Route path="/session-detail" element={<SessionDetailPage />} />
          <Route path="/crafting" element={<Crafting3DPage />} />
          <Route path="/history" element={<HistoryArchivePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
