export default function Spinner({ size = 'default', label }) {
  return (
    <div className="spinner-container">
      <div className={`spinner ${size === 'small' ? 'spinner--small' : ''}`} role="status" aria-label={label || 'Loading'} />
      {label && <span style={{ marginLeft: '12px', color: 'var(--text-secondary, var(--c-sub))' }}>{label}</span>}
    </div>
  );
}
