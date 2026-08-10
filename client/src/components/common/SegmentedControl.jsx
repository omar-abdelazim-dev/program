import React, { useRef, useState, useEffect } from 'react';

const SegmentedControl = ({ tabs, activeTab, onChange, style }) => {
  const [indicatorStyle, setIndicatorStyle] = useState({ offset: 4, width: 0, opacity: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const activeBtn = containerRef.current.querySelector(`[data-id="${activeTab}"]`);
      if (activeBtn) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        
        const isRTL = document.documentElement.dir === 'rtl';
        const offset = isRTL 
          ? containerRect.right - btnRect.right
          : btnRect.left - containerRect.left;

        setIndicatorStyle({
          offset,
          width: btnRect.width,
          opacity: 1
        });
      }
    }
  }, [activeTab, tabs]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        background: 'var(--bg-surface)',
        padding: '4px',
        borderRadius: '50px',
        boxShadow: 'var(--outer-shadow)',
        marginBottom: '20px',
        width: 'fit-content',
        ...style
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '4px',
          insetInlineStart: `${indicatorStyle.offset}px`,
          width: `${indicatorStyle.width}px`,
          height: 'calc(100% - 8px)',
          borderRadius: '50px',
          background: 'var(--bg-main)',
          boxShadow: 'var(--inner-shadow)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 0,
          opacity: indicatorStyle.opacity,
        }}
      />
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            data-id={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '8px 24px',
              borderRadius: '50px',
              border: 'none',
              background: 'transparent',
              color: isActive ? 'var(--text-h)' : 'var(--c-sub)',
              cursor: 'pointer',
              fontWeight: isActive ? '600' : '500',
              transition: 'color 0.3s, font-weight 0.3s',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
