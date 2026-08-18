import React from 'react';

export function CardSkeleton({ type = 'course', count = 4 }) {
  const items = Array.from({ length: count });

  if (type === 'horizontal') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        {items.map((_, idx) => (
          <div
            key={idx}
            className="solid-card"
            style={{
              padding: '20px',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '20px',
              minHeight: '120px',
              background: 'var(--bg-surface, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--c-border-subtle, rgba(255, 255, 255, 0.08))',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '150px' }}>
                  <div className="skeleton-pulse" style={{ height: '14px', borderRadius: '4px' }} />
                  <div className="skeleton-pulse" style={{ height: '12px', width: '70%', borderRadius: '4px' }} />
                </div>
              </div>
              <div className="skeleton-pulse" style={{ height: '18px', width: '65%', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '12px', width: '30%', borderRadius: '4px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', width: '180px' }}>
              <div className="skeleton-pulse" style={{ height: '16px', width: '100%', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '36px', width: '120px', borderRadius: '8px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'stat') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px', width: '100%' }}>
        {items.map((_, idx) => (
          <div
            key={idx}
            className="solid-card"
            style={{
              padding: '20px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'var(--bg-surface, rgba(255, 255, 255, 0.03))',
              border: '1px solid var(--c-border-subtle, rgba(255, 255, 255, 0.08))',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="skeleton-pulse" style={{ height: '14px', width: '50%', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '32px', width: '32px', borderRadius: '8px' }} />
            </div>
            <div className="skeleton-pulse" style={{ height: '28px', width: '70%', borderRadius: '6px' }} />
            <div className="skeleton-pulse" style={{ height: '12px', width: '40%', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cc-grid" style={{ width: '100%' }}>
      {items.map((_, idx) => (
        <div
          key={idx}
          className="cc-card saas-card"
          style={{
            borderRadius: '12px',
            overflow: 'hidden',
            padding: '0',
            display: 'flex',
            flexDirection: 'column',
            height: '340px',
            background: 'var(--bg-surface, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--c-border-subtle, rgba(255, 255, 255, 0.08))',
          }}
        >
          <div className="skeleton-pulse" style={{ width: '100%', height: '160px' }} />
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div className="skeleton-pulse" style={{ height: '18px', width: '90%', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ height: '14px', width: '60%', borderRadius: '4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto' }}>
              <div className="skeleton-pulse" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
              <div className="skeleton-pulse" style={{ height: '14px', width: '45%', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <div className="skeleton-pulse" style={{ height: '18px', width: '80px', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '14px', width: '55px', borderRadius: '12px' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CardSkeleton;
