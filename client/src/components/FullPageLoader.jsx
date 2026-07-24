import React from 'react';
import logo from '../assets/logo.png';

export default function FullPageLoader({ message = "Loading", fullScreen = true }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', 
      height: fullScreen ? '100vh' : '100%', 
      minHeight: fullScreen ? 'auto' : '400px',
      alignItems: 'center', justifyContent: 'center', 
      backgroundColor: 'transparent', color: 'var(--text-primary)'
    }}>
      <style>
        {`
          @keyframes loadPulseGlow {
            0% { transform: scale(0.95); opacity: 0.5; filter: blur(20px); }
            50% { transform: scale(1.1); opacity: 0.8; filter: blur(35px); }
            100% { transform: scale(0.95); opacity: 0.5; filter: blur(20px); }
          }
          @keyframes loadFloatLogo {
            0% { transform: scale(2.5) translateY(0px); }
            50% { transform: scale(2.5) translateY(-4px); }
            100% { transform: scale(2.5) translateY(0px); }
          }
          @keyframes loadTextPulse {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }
        `}
      </style>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '120px', height: '120px' }}>
        <img 
          src={logo} 
          alt="Program" 
          style={{ 
            width: '70px', height: 'auto', 
            objectFit: 'contain', 
            animation: 'loadFloatLogo 3s ease-in-out infinite',
            transform: 'scale(2.5)'
          }} 
        />
      </div>
      <h2 style={{
        marginTop: '16px', fontSize: '0.85rem', fontWeight: '800', letterSpacing: '3px', textTransform: 'uppercase',
        background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        animation: 'loadTextPulse 3s ease-in-out infinite'
      }}>
        {message}
      </h2>
    </div>
  );
}
