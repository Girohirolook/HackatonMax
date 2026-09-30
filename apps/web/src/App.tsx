import { Link, Route, Routes, Navigate } from 'react-router-dom';
import { Button, MaxUI } from '@maxhub/max-ui';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import Home from './pages/Home';
import Registration from './pages/Registration';
import ActivitiesSearch from './pages/ActivitiesSearch';
import Profile from './pages/Profile';
import MyEvents from './pages/MyEvents';
import EventCreate from './pages/EventCreate';
import EventDetail from './pages/EventDetail';
import OrganizationProfile from './pages/OrganizationProfile';
import BroadcastHistory from './pages/BroadcastHistory';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { fetchBotInfo } from './lib/api';

function ProtectedLayout() {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBotInfo().then((res) => {
      if (res.username) (window as any).__botUsername = res.username;
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const key = 'deeplink_handled';
    if (sessionStorage.getItem(key)) return;

    const startParam =
      (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param ||
      (window as any).WebApp?.initDataUnsafe?.start_param;

    if (typeof startParam === 'string' && startParam.startsWith('event_')) {
      const id = startParam.slice('event_'.length);
      if (/^\d+$/.test(id)) {
        sessionStorage.setItem(key, '1');
        sessionStorage.setItem('opened_via_deeplink', '1');   // ← флаг для кнопки «Назад»
        navigate(`/events/${id}`, { replace: true });
      }
    }
  }, [navigate]);

  if (status === 'loading') {
    return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка…</div>;
  }

  if (status === 'error') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Приложение доступно только через MAX
      </div>
    );
  }

  if (status === 'new_user') {
    return <Registration />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav
        style={{
          display: 'flex',
          gap: 8,
          padding: 12,
          borderBottom: '1px solid #e0e0e0',
          position: 'sticky',
          top: 0,
          background: 'white',
          zIndex: 10,
          flexWrap: 'wrap',
        }}
      >
        <Button asChild variant="secondary" size="small">
          <Link to="/">Главная</Link>
        </Button>
        <Button asChild variant="secondary" size="small">
          <Link to="/activities/search">Поиск</Link>
        </Button>
        <Button asChild variant="secondary" size="small">
          <Link to="/events/my">Мои мероприятия</Link>
        </Button>
        <Button asChild variant="secondary" size="small">
          <Link to="/profile">Профиль</Link>
        </Button>
      </nav>

      <main style={{ flex: 1, padding: 16 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events/:id/broadcasts" element={<BroadcastHistory />} />
          <Route path="/activities/search" element={<ActivitiesSearch />} />
          <Route path="/events/my" element={<MyEvents />} />
          <Route path="/events/create" element={<EventCreate />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/registration" element={<Navigate to="/" replace />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/events/edit/:id" element={<EventCreate />} />
          <Route path="/organizations/:id" element={<OrganizationProfile />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const { showError } = useToast();

  useEffect(() => {
    const handler = (e: CustomEvent<string>) => showError(e.detail);
    window.addEventListener('global-error', handler as any);
    return () => window.removeEventListener('global-error', handler as any);
  }, [showError]);

  return (
    <MaxUI colorScheme="light">
      <AuthProvider>
        <ProtectedLayout />
      </AuthProvider>
    </MaxUI>
  );
}

export default App;