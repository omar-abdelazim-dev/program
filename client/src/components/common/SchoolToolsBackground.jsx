import React from 'react';
import patternUrl from '../../assets/school-tools-pattern.svg';

export default function SchoolToolsBackground({ opacity, size = 360, className = '' }) {
  return (
    <div
      className={`school-tools-bg-overlay ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        backgroundImage: `url(${patternUrl})`,
        backgroundRepeat: 'repeat',
        backgroundSize: `${size}px ${size}px`,
        ...(opacity !== undefined ? { opacity } : {}),
      }}
      aria-hidden="true"
    />
  );
}
