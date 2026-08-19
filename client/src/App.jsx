import { lazy, Suspense, useState, useEffect } from 'react';
import api from './api/axios';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import FullPageLoader from './components/FullPageLoader';

const LandingPage = lazy(() => import('./components/LandingPage'));
const AuthPage = lazy(() => import('./components/AuthPage'));
const AdminAuthPage = lazy(() => import('./components/AdminAuthPage'));
const ExploreTab = lazy(() => import('./components/ExploreTab'));
const StudentLayout = lazy(() => import('./components/StudentLayout'));
const DiscoverTab = lazy(() => import('./components/DiscoverTab'));
const InstructorProfilePage = lazy(() => import('./components/InstructorProfilePage'));
const DashboardTab = lazy(() => import('./components/DashboardTab'));
const CoursePage = lazy(() => import('./components/CoursePage'));
const LearningPortal = lazy(() => import('./components/LearningPortal'));
const CheckoutPage = lazy(() => import('./components/CheckoutPage'));
const InstructorPortal = lazy(() => import('./components/InstructorPortal'));
const AdminPortal = lazy(() => import('./components/AdminPortal'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const ContactPage = lazy(() => import('./components/ContactPage'));
const HelpPage = lazy(() => import('./components/HelpPage'));
const PrivacyPage = lazy(() => import('./components/PrivacyPage'));
const MobileAppPage = lazy(() => import('./components/MobileAppPage'));
const TermsPage = lazy(() => import('./components/TermsPage'));
const StudentProfilePage = lazy(() => import('./components/StudentProfilePage'));

const RouteFallback = () => (
  <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh' }}>
    <FullPageLoader message="Loading" />
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    };
    fetchSession();
  }, []);
  const [isLightMode, setIsLightMode] = useState(() => {
    const savedMode = localStorage.getItem('isLightMode');
    return savedMode !== null ? savedMode === 'true' : true;
  });
  
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Filter out notifications older than 1 month (30 days)
        const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return parsed.filter(n => n.timestamp > oneMonthAgo);
      }
      return [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [exploreCollege, setExploreCollege] = useState('All');

  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchBackendNotifications = async () => {
        try {
          const res = await api.get('/notifications');
          if (res.data.notifications) {
            setNotifications(prev => {
              const backendNotifs = res.data.notifications.map(n => ({
                id: n._id,
                text: n.title, // mapping title to text for UI compatibility
                message: n.message,
                link: n.link,
                timestamp: new Date(n.createdAt).getTime(),
                read: n.read,
                isBackend: true
              }));
              
              const merged = [...prev.filter(p => !p.isBackend)];
              backendNotifs.forEach(bn => {
                merged.push(bn);
              });
              return merged.sort((a, b) => b.timestamp - a.timestamp);
            });
          }
        } catch (err) {
          console.error("Failed to load notifications", err);
        }
      };
      fetchBackendNotifications();
    }
  }, [isAuthenticated, user]);



  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('isLightMode', isLightMode);
  }, [isLightMode]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [isLightMode]);

  useEffect(() => {
    if (user?.role) {
      document.body.setAttribute('data-role', user.role);
    } else {
      document.body.removeAttribute('data-role');
    }
  }, [user]);

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    if (userData.role === 'superadmin' || userData.role === 'admin') {
      navigate('/admin');
    } else if (userData.role === 'instructor') {
      navigate('/instructor');
    } else {
      navigate('/student');
    }
    // Login/register responses only carry a minimal user object — hydrate
    // the rest (major, college, etc.) right away instead of waiting for a
    // page refresh to trigger the mount-time /auth/me fetch.
    api.get('/auth/me').then((res) => setUser(res.data.user)).catch(() => {});
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed', err);
    }
    setUser(null);
    setIsAuthenticated(false);
    navigate('/');
  };

  if (isInitializing) {
    return (
      <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh' }}>
        <FullPageLoader message="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/auth/admin"
          element={(
            <main className="content" style={{ padding: '20px' }}>
              <AdminAuthPage onLoginSuccess={(userData) => { setUser(userData); setIsAuthenticated(true); navigate('/admin'); }} isLightMode={isLightMode} toggleTheme={toggleTheme} />
            </main>
          )}
        />
        <Route
          path="*"
          element={(
            <main className="content" style={{ padding: '20px' }}>
              <AuthPage onLoginSuccess={handleLogin} isLightMode={isLightMode} toggleTheme={toggleTheme} />
            </main>
          )}
        />
        </Routes>
      </Suspense>
    );
  }

  // The Learning Portal and Checkout Page have their own fullscreen layouts
  if (location.pathname.startsWith('/learn/') || location.pathname.startsWith('/checkout/') || location.pathname === '/instructor' || location.pathname === '/admin') {
    
    // Protect /admin route
    if (location.pathname === '/admin' && user?.role !== 'admin' && user?.role !== 'superadmin') {
      return <Navigate to="/" replace />;
    }

    // Protect /instructor route
    if (location.pathname === '/instructor' && user?.role !== 'instructor' && user?.role !== 'admin' && user?.role !== 'superadmin') {
      return <Navigate to="/" replace />;
    }

    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        <Route path="/learn/:id" element={<LearningPortal user={user} />} />
        <Route path="/checkout/cart" element={<CheckoutPage cart={cart} setCart={setCart} setNotifications={setNotifications} isCartCheckout={true} />} />
        <Route path="/instructor" element={<InstructorPortal user={user} setUser={setUser} onLogout={handleLogout} toggleTheme={toggleTheme} isLightMode={isLightMode} />} />
        <Route path="/admin" element={<AdminPortal user={user} setUser={setUser} onLogout={handleLogout} toggleTheme={toggleTheme} isLightMode={isLightMode} />} />
        </Routes>
      </Suspense>
    );
  }

  // Admin/superadmin accounts don't have student features
  if ((user?.role === 'admin' || user?.role === 'superadmin') && (location.pathname.startsWith('/student') || location.pathname === '/')) {
    return <Navigate to="/admin" replace />;
  }

  // Instructors should not have access to the student portal either,
  // but they MAY view a student's public profile page (/student/:id).
  const isStudentProfile = /^\/student\/[^/]+$/.test(location.pathname);
  if (user?.role === 'instructor' && (location.pathname === '/' || (location.pathname.startsWith('/student') && !isStudentProfile))) {
    return <Navigate to="/instructor" replace />;
  }

  // Redirect authenticated users away from auth pages
  if (location.pathname.startsWith('/auth')) {
    if (user?.role === 'admin' || user?.role === 'superadmin') return <Navigate to="/admin" replace />;
    if (user?.role === 'instructor') return <Navigate to="/instructor" replace />;
    return <Navigate to="/student" replace />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <StudentLayout
        user={user}
        onLogout={handleLogout}
        cartCount={cart.length}
        notifications={notifications}
        setNotifications={setNotifications}
        isLightMode={isLightMode}
        toggleTheme={toggleTheme}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        exploreCollege={exploreCollege}
        onCollegeChange={setExploreCollege}
      >
        <Routes>
        <Route path="/" element={<Navigate to="/student" replace />} />
        <Route path="/student" element={<ExploreTab user={user} searchQuery={searchQuery} isLightMode={isLightMode} />} />
        <Route path="/student/dashboard" element={<DashboardTab user={user} />} />
        <Route path="/student/explore" element={<DiscoverTab searchQuery={searchQuery} activeCollege={exploreCollege} isLightMode={isLightMode} />} />
        <Route path="/student/settings" element={<SettingsPage user={user} setUser={setUser} isLightMode={isLightMode} toggleTheme={toggleTheme} onLogout={handleLogout} />} />
        <Route path="/course/:id" element={<CoursePage cart={cart} setCart={setCart} user={user} />} />
        <Route path="/instructor/:id" element={<InstructorProfilePage isLightMode={isLightMode} />} />
        <Route path="/student/:id" element={<StudentProfilePage isLightMode={isLightMode} user={user} />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/mobile-app" element={<MobileAppPage />} />
        </Routes>
      </StudentLayout>
    </Suspense>
  );
}
