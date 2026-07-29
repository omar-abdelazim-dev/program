import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

export default function CommissionSlider({ value, onChange, disabled }) {
  const [localValue, setLocalValue] = useState(value);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef(null);

  // Sync with parent value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const fetchPreview = async (commission) => {
    try {
      setLoading(true);
      const res = await api.post('/system/config/financial/preview', { commission });
      setPreviewData(res.data);
    } catch (err) {
      console.error("Failed to fetch preview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSliderChange = (e) => {
    if (disabled) return;
    const newVal = parseInt(e.target.value, 10);
    setLocalValue(newVal);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(() => {
      onChange(newVal);
      fetchPreview(newVal);
    }, 500);
  };

  // Determine indicator color
  let indicatorColor = '#10B981'; // Green
  let indicatorText = 'Recommended';
  let indicatorDesc = 'A balanced commission that attracts top instructors while covering platform costs.';
  
  if (localValue > 20 && localValue <= 35) {
    indicatorColor = '#F59E0B'; // Orange
    indicatorText = 'Above Average';
    indicatorDesc = 'Yields higher platform revenue but may discourage some high-profile instructors.';
  } else if (localValue > 35) {
    indicatorColor = '#EF4444'; // Red
    indicatorText = 'High Commission';
    indicatorDesc = 'Significant revenue share taken by the platform. High risk of instructor churn.';
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div style={{ marginBottom: '32px' }}>
      <label style={{ fontSize: '0.85rem', color: 'var(--c-sub)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>
        Company Commission
      </label>
      
      <div className="glass-card" style={{ padding: '24px', opacity: disabled ? 0.6 : 1, position: 'relative' }} title={disabled ? "Super Admin permission required" : ""}>
        {/* Value Display */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-h)', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            {localValue}%
          </div>
          <div style={{ display: 'inline-block', marginTop: '8px', padding: '4px 12px', borderRadius: '99px', background: `${indicatorColor}20`, color: indicatorColor, fontSize: '0.8rem', fontWeight: 600, border: `1px solid ${indicatorColor}40` }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: indicatorColor, marginRight: '6px' }} />
            {indicatorText}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--c-sub)', marginTop: '8px', maxWidth: '300px', margin: '8px auto 0 auto' }}>
            {indicatorDesc}
          </p>
        </div>

        {/* Slider Input */}
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={localValue} 
          onChange={handleSliderChange}
          disabled={disabled}
          style={{
            width: '100%',
            cursor: disabled ? 'not-allowed' : 'pointer',
            accentColor: indicatorColor,
            height: '6px',
            borderRadius: '4px',
            background: 'var(--c-border-subtle)',
            outline: 'none',
            WebkitAppearance: 'none'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--c-sub)', marginTop: '8px', fontWeight: 600 }}>
          <span>0%</span>
          <span>100%</span>
        </div>

        {/* Live Preview Section */}
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--c-border-subtle)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-h)', fontSize: '1rem' }}>Revenue Distribution Preview</h4>
          
          {loading && !previewData ? (
            <div className="skeleton-pulse" style={{ height: '80px', borderRadius: '8px' }} />
          ) : previewData ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--c-sub)' }}>Total Revenue Processed</span>
                <strong style={{ color: 'var(--text-h)' }}>{formatCurrency(previewData.totalRevenue)}</strong>
              </div>

              {/* Stacked Progress Bar */}
              <div style={{ height: '24px', display: 'flex', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', background: 'var(--c-border)' }}>
                <div style={{ 
                  width: `${localValue}%`, 
                  background: indicatorColor, 
                  transition: 'width 0.4s ease-out, background 0.4s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700, color: '#fff',
                  opacity: localValue === 0 ? 0 : 1
                }}>
                  {localValue > 5 && `${localValue}%`}
                </div>
                <div style={{ 
                  width: `${100 - localValue}%`, 
                  background: '#8B5CF6', 
                  transition: 'width 0.4s ease-out',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700, color: '#fff',
                  opacity: localValue === 100 ? 0 : 1
                }}>
                  {100 - localValue > 5 && `${100 - localValue}%`}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-h)' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: indicatorColor }} />
                  Company Share: <strong>{formatCurrency(previewData.companyShare)}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-h)' }}>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: '#8B5CF6' }} />
                  Instructor Earnings: <strong>{formatCurrency(previewData.instructorShare)}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--c-sub)', fontSize: '0.9rem' }}>Could not load preview data.</div>
          )}
        </div>
      </div>
      
      {/* Required CSS for slider track cross-browser support */}
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: var(--outer-shadow);
          border: 2px solid ${indicatorColor};
        }
      `}</style>
    </div>
  );
}
