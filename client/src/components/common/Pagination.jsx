import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage, label = "items" }) => {
  if (totalPages <= 1) return null;
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid var(--c-border-subtle, rgba(255,255,255,0.08))',
      }}
    >
      <span style={{ color: 'var(--c-sub)', fontSize: '0.85rem' }}>
        Showing {startItem}–{endItem} of {totalItems} {label}
      </span>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'var(--bg-main)',
            color: currentPage === 1 ? 'var(--c-sub)' : 'var(--text-h)',
            border: 'none',
            boxShadow: 'var(--inner-shadow)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.5 : 1,
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          Previous
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: currentPage === page ? 'linear-gradient(90deg, #f97316, #fbad41)' : 'var(--bg-main)',
              color: currentPage === page ? '#ffffff' : 'var(--c-sub)',
              border: 'none',
              boxShadow: currentPage === page ? '0 2px 8px rgba(249, 115, 22, 0.3)' : 'var(--inner-shadow)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: currentPage === page ? 700 : 500
            }}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'var(--bg-main)',
            color: currentPage === totalPages ? 'var(--c-sub)' : 'var(--text-h)',
            border: 'none',
            boxShadow: 'var(--inner-shadow)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.5 : 1,
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
