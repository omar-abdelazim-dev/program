import { useState, useEffect } from 'react';
import api from './api/axios';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import TopNav from './components/TopNav';
import ExploreTab from './components/ExploreTab';
import DiscoverTab from './components/DiscoverTab';
import InstructorProfilePage from './components/InstructorProfilePage';
import DashboardTab from './components/DashboardTab';
import AuthPage from './components/AuthPage';
import AdminAuthPage from './components/AdminAuthPage';
import CoursePage from './components/CoursePage';
import LearningPortal from './components/LearningPortal';
import CheckoutPage from './components/CheckoutPage';
import InstructorPortal from './components/InstructorPortal';
import AdminPortal from './components/AdminPortal';
import SettingsPage from './components/SettingsPage';
import StudentLayout from './components/StudentLayout';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import HelpPage from './components/HelpPage';
import PrivacyPage from './components/PrivacyPage';
import MobileAppPage from './components/MobileAppPage';
import TermsPage from './components/TermsPage';
import FullPageLoader from './components/FullPageLoader';
import LandingPage from './components/LandingPage';
import StudentProfilePage from './components/StudentProfilePage';

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
      } catch (err) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    };
    fetchSession();
  }, []);
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('isLightMode') === 'true';
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
    );
  }

  // Derive activeTab for the TopNav indicator based on the URL
  let activeTab = 'explore';
  if (location.pathname.includes('/dashboard')) activeTab = 'dashboard';

  // The Learning Portal and Checkout Page have their own fullscreen layouts
  if (location.pathname.startsWith('/learn/') || location.pathname.startsWith('/checkout/') || location.pathname === '/instructor' || location.pathname === '/admin') {
    return (
      <Routes>
        <Route path="/learn/:id" element={<LearningPortal user={user} />} />
        <Route path="/checkout/cart" element={<CheckoutPage cart={cart} setCart={setCart} setNotifications={setNotifications} isCartCheckout={true} />} />
        <Route path="/instructor" element={<InstructorPortal user={user} setUser={setUser} onLogout={handleLogout} toggleTheme={toggleTheme} isLightMode={isLightMode} />} />
        <Route path="/admin" element={<AdminPortal user={user} onLogout={handleLogout} toggleTheme={toggleTheme} isLightMode={isLightMode} />} />
      </Routes>
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
  );
}
