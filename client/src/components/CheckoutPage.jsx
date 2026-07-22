import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { currentUser } from '../data';
import api from '../api/axios';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';

// isCartCheckout is always true now — the only route that renders this page
// is /checkout/cart. The single-course /checkout/:id route was unreachable
// from any link and has been removed; the prop stays so this component's
// signature doesn't need touching everywhere it's referenced.
export default function CheckoutPage({ cart = [], setCart, setNotifications, isCartCheckout = false }) {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Read theme from localStorage to match the rest of the app
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('isLightMode') === 'true';
  });

  useEffect(() => {
    const handleStorage = () => setIsLightMode(localStorage.getItem('isLightMode') === 'true');
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const checkoutItems = cart || [];

  // Calculate total price using numeric price when available
  const getPriceNumber = (item) => {
    if (item == null) return 0;
    if (typeof item.price === 'number') return item.price;
    // If price is a string (demo data), try to extract digits as a fallback but do not rely on it
    if (typeof item.price === 'string') {
      const digits = parseInt(item.price.replace(/[^0-9]/g, ''), 10);
      return Number.isNaN(digits) ? 0 : digits;
    }
    return 0;
  };

  const totalPrice = (cart || []).reduce((s, it) => s + getPriceNumber(it), 0);
  const formattedTotal = `${totalPrice.toLocaleString()} EGP`;

  // Enrollment handler: uses the same API call as CoursePage to avoid duplicating logic
  const handleCheckout = async () => {
    setErrorMessage('');
    setIsProcessing(true);

    try {
      // Cart checkout: enroll each course in sequence, collect results
      const successes = [];
      const failures = [];

      for (const item of cart || []) {
        const courseId = item._id || item.id;
        if (!courseId) {
          failures.push({ item, error: 'Invalid course id' });
          continue;
        }

        try {
          await api.post(`/enrollments/${courseId}`);
          successes.push(courseId);
        } catch (err) {
          if (err.response?.status === 409) {
            // already enrolled — treat as success and remove from cart
            successes.push(courseId);
          } else {
            failures.push({ item, error: err.response?.data?.message || 'Enrollment failed' });
          }
        }
      }

      // Remove successful items from cart
      if (setCart && successes.length > 0) {
        const remaining = (cart || []).filter(i => {
          const cid = i._id || i.id;
          return !successes.includes(cid);
        });
        setCart(remaining);
      }

      // Notifications and navigation
      if (setNotifications && successes.length > 0) {
        // Build list of successful course titles
        const successfulTitles = (cart || []).filter(i => successes.includes(i._id || i.id)).map(i => i.title || i.name || 'Course');
        const text = successfulTitles.length === 1 ? `Enrolled in: ${successfulTitles[0]}` : `Enrolled in: ${successfulTitles.join(', ')}`;
        setNotifications(prev => [...prev, { id: Date.now(), text, timestamp: Date.now() }]);
      }

      if (failures.length === 0) {
        // All succeeded
        navigate('/student/dashboard');
      } else {
        // Some failed — surface error
        setErrorMessage(`Failed to enroll in ${failures.length} course(s). Please try again.`);
      }

    } finally {
      setIsProcessing(false);
    }
  };

  const paymentOptions = [
    { id: 'card', label: 'Credit / Debit Card', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg> },
    { id: 'applepay', label: 'Apple Pay', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.19 2.31-.88 3.5-.8 1.15.08 2.12.51 2.89 1.15-2.26 1.4-1.89 4.67.5 5.56-.63 1.84-1.57 3.58-2.92 5.06l.95 1.2zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg> },
    { id: 'googlepay', label: 'Google Pay', icon: <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/></svg> },
    { id: 'fawry', label: 'Fawry Pay', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="18" x2="12" y2="22"></line><line x1="12" y1="2" x2="12" y2="6"></line></svg> }
  ];

  if (isCartCheckout && checkoutItems.length === 0) {
    return (
      <div className="animate-entrance" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--c-sub)" strokeWidth="1" style={{ marginBottom: '24px' }}>
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Your Cart is Empty</h2>
        <p style={{ color: 'var(--c-sub)', marginBottom: '32px' }}>Looks like you haven't added any courses to your cart yet.</p>
        <Link to="/student" className="solid-btn" style={{ padding: '12px 32px', textDecoration: 'none', color: '#fff', background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)', borderRadius: '50px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', width: 'auto', marginTop: 0, transition: 'transform 0.1s ease' }}>
          Explore Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-entrance" style={{ minHeight: '100vh', display: 'flex', flexDirection: window.innerWidth < 768 ? 'column-reverse' : 'row' }}>
      
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="saas-btn-secondary" style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', width: 'auto', marginTop: 0, cursor: 'pointer', color: 'var(--text-h)', border: 'none' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Back
      </button>

      {isSuccess ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Payment Successful!</h2>
          <p style={{ color: 'var(--c-sub)', fontSize: '1.1rem', marginBottom: '32px' }}>Your enrollment is complete. Preparing your learning portal...</p>
          <div className="loader" style={{ width: '30px', height: '30px', border: '3px solid var(--border)', borderTopColor: 'var(--c-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
      ) : (
        <>
          {/* Left Column: Payment Details */}
          <div style={{ flex: '1 1 60%', padding: '80px 10% 40px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
            
            {/* Header */}
            <div style={{ marginBottom: '40px' }}>
              <img 
                src={isLightMode ? `${logoDark}?v=2` : `${logoLight}?v=2`} 
                alt="Program Logo" 
                style={{ height: '32px', marginBottom: '24px', display: 'block' }} 
              />
              <div style={{ color: 'var(--c-sub)', fontSize: '1rem', marginBottom: '4px' }}>Checkout</div>
              <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '700' }}>
                Pay Program {formattedTotal}
              </h1>
            </div>

            {/* Express Checkout */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
              <button className="saas-btn-secondary" style={{ flex: 1, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', color: 'var(--text-h)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                Instapay
              </button>
              <button className="saas-btn-secondary" style={{ flex: 1, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', color: 'var(--text-h)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path></svg>
                Mobile Wallet
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              <div style={{ color: 'var(--c-sub)', fontSize: '0.9rem' }}>Or pay with</div>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
            </div>

            {/* Payment Method Radio List */}
            <div className="saas-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '32px' }}>
              {paymentOptions.map((option, index) => (
                <label 
                  key={option.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '16px 20px', 
                    cursor: 'pointer',
                    borderBottom: index !== paymentOptions.length - 1 ? '1px solid var(--border)' : 'none',
                    background: paymentMethod === option.id ? 'var(--accent-bg)' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                  className="hover-glow"
                >
                  <input 
                    type="radio" 
                    name="payment_method"
                    value={option.id}
                    checked={paymentMethod === option.id}
                    onChange={() => setPaymentMethod(option.id)}
                    style={{ marginRight: '16px', width: '18px', height: '18px', accentColor: 'var(--c-orange)' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-h)' }}>
                      {option.icon}
                    </div>
                    <span style={{ fontSize: '1.05rem', fontWeight: '500' }}>{option.label}</span>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ flex: 1 }}></div>

            {/* Personal Information */}
            <div className="saas-card" style={{ padding: '20px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--c-purple), var(--c-yellow))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>Personal information</h3>
                <div style={{ color: 'var(--c-sub)', fontSize: '0.95rem' }}>
                  {currentUser.name} • {currentUser.email}
                </div>
              </div>
            </div>

            {errorMessage && <div style={{ color: '#ef4444', margin: '8px 0 12px' }}>{errorMessage}</div>}

            <button 
              onClick={handleCheckout} 
              disabled={isProcessing} 
              className="saas-btn-primary"
              style={{ 
                width: '100%', 
                padding: '16px', 
                fontSize: '1.2rem', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '12px', 
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
            >
              {isProcessing ? (
                <>
                  <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                  Processing...
                </>
              ) : `Pay ${formattedTotal}`}
            </button>
          </div>

          {/* Right Column: Order Summary */}
          <div style={{ flex: '1 1 40%', padding: '80px 10% 40px', background: 'var(--code-bg)' }}>
            <h2 style={{ margin: '0 0 32px 0', fontSize: '1.5rem', fontWeight: '600' }}>Order Summary</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
              {checkoutItems.map((item) => (
                <div key={item._id || item.id} className="saas-card" style={{ display: 'flex', gap: '16px', padding: '16px', marginBottom: '16px' }}>
                  <img 
                    src={item.image || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=600&auto=format&fit=crop"} 
                    alt={item.title} 
                    style={{ width: '80px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} 
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '4px' }}>{item.title}</div>
                    <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem' }}>By {item.instructor?.name || item.instructor || 'Instructor'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--c-orange)' }}>
                      {item.price}
                    </div>
                    {isCartCheckout && setCart && (
                      <button 
                        onClick={() => setCart(cart.filter(c => (c._id || c.id) !== (item._id || item.id)))}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.85rem', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: 'var(--border)', marginBottom: '32px' }}></div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
              <div style={{ fontWeight: '600', fontSize: '1.2rem', color: 'var(--c-sub)' }}>Total</div>
              <div style={{ fontWeight: '800', fontSize: '1.8rem' }}>{formattedTotal}</div>
            </div>
            
            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: '8px', color: 'var(--c-sub)', fontSize: '0.9rem', display: 'flex', gap: '12px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--c-orange)" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Payments are 100% secure and encrypted. You have a 30-day money-back guarantee on all courses.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
