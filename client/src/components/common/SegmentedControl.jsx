import React, { useRef, useState, useEffect } from 'react';

const SegmentedControl = ({ tabs, activeTab, onChange, style, trackStyle, tabStyle: customTabStyle, indicatorStyle: customIndicatorStyle }) => {
  const [indicatorStyle, setIndicatorStyle] = useState({ offset: 4, width: 0, opacity: 0 });
  const containerRef = useRef(null);

  const updateIndicator = () => {
    if (containerRef.current) {
      const activeBtn = containerRef.current.querySelector(`[data-id="${activeTab}"]`);
      if (activeBtn) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        
        const isRTL = document.documentElement.dir === 'rtl' || document.dir === 'rtl';
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
  };

  useEffect(() => {
    updateIndicator();

    if (containerRef.current && window.ResizeObserver) {
      const observer = new ResizeObserver(() => {
        updateIndicator();
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
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
        borderRadius: '12px',
        boxShadow: 'var(--outer-shadow)',
        marginBottom: '20px',
        width: 'fit-content',
        ...style,
        ...trackStyle
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '4px',
          insetInlineStart: `${indicatorStyle.offset}px`,
          width: `${indicatorStyle.width}px`,
          height: 'calc(100% - 8px)',
          borderRadius: '10px',
          background: 'var(--bg-main)',
          boxShadow: 'var(--inner-shadow)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 0,
          opacity: indicatorStyle.opacity,
          ...customIndicatorStyle
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
              borderRadius: '10px',
              border: 'none',
              background: 'transparent',
              color: isActive ? 'var(--text-h)' : 'var(--c-sub)',
              cursor: 'pointer',
              fontWeight: isActive ? '600' : '500',
              transition: 'color 0.3s, font-weight 0.3s',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...customTabStyle
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
