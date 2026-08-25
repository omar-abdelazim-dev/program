import React from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", intent = "danger" }) {
  if (!isOpen) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999
    }}>
      <div className="glass-card animate-entrance" style={{
        padding: '32px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        borderRadius: '16px',
        boxShadow: 'var(--outer-shadow)'
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
              borderRadius: '12px',
              border: 'none',
              background: 'transparent',
              boxShadow: 'var(--inner-shadow)',
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
              boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.5)',
              flex: 1,
              margin: 0
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
