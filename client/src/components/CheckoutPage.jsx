import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { currentUser } from '../data';
import api from '../api/axios';
import PaymentModal from './PaymentModal';

// isCartCheckout is always true now
export default function CheckoutPage({ cart = [], setCart, setNotifications, isCartCheckout = false }) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activePaymentItem, setActivePaymentItem] = useState(null);

  const checkoutItems = cart || [];

  // Calculate total price using numeric price when available
  const getPriceNumber = (item) => {
    if (item == null) return 0;
    if (typeof item.price === 'number') return item.price;
    if (typeof item.price === 'string') {
      const digits = parseInt(item.price.replace(/[^0-9]/g, ''), 10);
      return Number.isNaN(digits) ? 0 : digits;
    }
    return 0;
  };

  const totalPrice = (cart || []).reduce((s, it) => s + getPriceNumber(it), 0);
  const formattedTotal = `${totalPrice.toLocaleString()} EGP`;

  // Enrollment handler
  const handleCheckout = async () => {
    setErrorMessage('');
    
    // Find first paid item in cart
    const paidItem = (cart || []).find(item => getPriceNumber(item) > 0);
    if (paidItem) {
      setActivePaymentItem(paidItem);
      return;
    }

    setIsProcessing(true);

    try {
      const successes = [];
      const failures = [];

      for (const item of cart || []) {
        const courseId = item._id || item.id;
        if (!courseId) continue;

        try {
          await api.post(`/enrollments/${courseId}`);
          successes.push(courseId);
        } catch (err) {
          if (err.response?.status === 409) {
            successes.push(courseId);
          } else {
            failures.push({ item, error: err.response?.data?.message || 'Enrollment failed' });
          }
        }
      }

      if (setCart && successes.length > 0) {
        const remaining = (cart || []).filter(i => !successes.includes(i._id || i.id));
        setCart(remaining);
      }

      if (failures.length === 0) {
        navigate('/student/dashboard');
      } else {
        setErrorMessage(`Failed to enroll in ${failures.length} course(s).`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isCartCheckout && checkoutItems.length === 0) {
    return (
      <div className="animate-entrance" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1" style={{ marginBottom: '24px' }}>
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Your Cart is Empty</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Looks like you haven't added any courses to your cart yet.</p>
        <Link to="/student" className="solid-btn" style={{ padding: '12px 32px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 'auto', marginTop: 0 }}>
          Explore Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-entrance" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '40px 24px', minHeight: '100vh' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px', gap: '16px' }}>
         <button onClick={() => navigate(-1)} className="solid-btn" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '10px 20px', boxShadow: 'var(--outer-shadow)' }}>
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
           Back
         </button>
         <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>Your Cart</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '40px', alignItems: 'start' }}>
        
        {/* Left: Cart Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {checkoutItems.map((item) => (
            <div key={item._id || item.id} className="solid-card" style={{ display: 'flex', gap: '20px', padding: '20px' }}>
              <img 
                src={item.image || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=600&auto=format&fit=crop"} 
                alt={item.title} 
                style={{ width: '120px', height: '90px', borderRadius: '12px', objectFit: 'cover' }} 
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>{item.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>By {item.instructor?.name || item.instructor || 'Instructor'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '12px' }}>
                <div style={{ fontWeight: '800', fontSize: '1.3rem', color: '#f97316' }}>{item.price}</div>
                {isCartCheckout && setCart && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '100px' }}>
                    <button 
                      onClick={async () => {
                        const cid = item._id || item.id;
                        const pNum = getPriceNumber(item);
                        if (pNum > 0) {
                          setActivePaymentItem(item);
                        } else {
                          try {
                            await api.post(`/enrollments/${cid}`);
                            setCart(cart.filter(c => (c._id || c.id) !== cid));
                            if (setNotifications) {
                              setNotifications(prev => [...prev, { id: Date.now(), text: `Enrolled in free course: ${item.title}`, timestamp: Date.now() }]);
                            }
                          } catch (err) {
                            if (err.response?.status === 409) {
                              setCart(cart.filter(c => (c._id || c.id) !== cid));
                            } else {
                              setErrorMessage(err.response?.data?.message || 'Enrollment failed');
                            }
                          }
                        }
                      }}
                      style={{ background: 'rgba(16, 185, 129, 0.1)', border: 'none', color: '#10B981', fontSize: '0.9rem', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600', transition: 'all 0.2s', boxShadow: 'var(--inner-shadow)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      Enroll
                    </button>
                    <button 
                      onClick={() => setCart(cart.filter(c => (c._id || c.id) !== (item._id || item.id)))}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', fontSize: '0.9rem', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600', transition: 'all 0.2s', boxShadow: 'var(--inner-shadow)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Order Summary */}
        <div className="solid-card" style={{ position: 'sticky', top: '24px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>Order Summary</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '32px' }}>
            <div style={{ fontWeight: '600', fontSize: '1.3rem', color: 'var(--text-secondary)' }}>Total</div>
            <div style={{ fontWeight: '800', fontSize: '2.2rem', color: 'var(--text-primary)' }}>{formattedTotal}</div>
          </div>
          
          {errorMessage && (
            <div style={{ color: '#ef4444', padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', fontWeight: '500' }}>
              {errorMessage}
            </div>
          )}
          
          <button 
            onClick={handleCheckout} 
            disabled={isProcessing} 
            className="solid-btn"
            style={{ 
              width: '100%', 
              padding: '20px', 
              fontSize: '1.3rem', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '12px', 
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1
            }}
          >
            {isProcessing ? (
              <>
                <svg className="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                Processing...
              </>
            ) : 'Enroll Now'}
          </button>

          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', lineHeight: '1.6' }}>
            By enrolling, you agree to our Terms of Service. Secure enrollment powered by Program.
          </div>
        </div>

      </div>

      {activePaymentItem && (
        <PaymentModal
          course={activePaymentItem}
          onClose={() => setActivePaymentItem(null)}
          onSuccess={(enrollment) => {
            const cid = activePaymentItem._id || activePaymentItem.id;
            if (setCart) setCart(cart.filter(c => (c._id || c.id) !== cid));
            setActivePaymentItem(null);
          }}
        />
      )}
    </div>
  );
}
