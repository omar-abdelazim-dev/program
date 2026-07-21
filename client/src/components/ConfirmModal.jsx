import React from 'react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", intent = "danger" }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="glass-card animate-entrance" style={{
        padding: '32px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '1.5rem', color: 'var(--text-h)' }}>{title}</h2>
          <p style={{ margin: 0, color: 'var(--c-sub)', fontSize: '1rem', lineHeight: '1.5' }}>{message}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
          <button 
            className="hover-glow" 
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              borderRadius: '999px',
              border: '1px solid var(--c-border-active)',
              background: 'transparent',
              color: 'var(--text-h)',
              fontWeight: '700',
              cursor: 'pointer',
              flex: 1
            }}
          >
            {cancelText}
          </button>
          <button 
            className="glass-btn" 
            onClick={onConfirm}
            style={{
              background: intent === 'primary' ? 'linear-gradient(135deg, var(--c-orange), var(--c-yellow))' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
              boxShadow: intent === 'primary' ? '0 4px 15px rgba(249, 115, 22, 0.3)' : '0 4px 15px rgba(239, 68, 68, 0.3)',
              flex: 1,
              margin: 0
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
