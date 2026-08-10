import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccountSettingsBackHref } from '../../hooks/useAccountSettingsBackHref';

/** Standalone “Back” control (e.g. Help center outside PageHeader). */
export default function SettingsBackButton({ tab = 'more' }) {
  const navigate = useNavigate();
  const href = useAccountSettingsBackHref(tab);

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      aria-label="Back"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px 10px 12px',
        minHeight: 'unset',
        minWidth: 'unset',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--border-default)',
        background: 'linear-gradient(180deg, var(--surface-card) 0%, var(--surface-sunken) 100%)',
        boxShadow: 'var(--shadow-xs)',
        color: 'var(--text-primary)',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
        transition: 'var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--brand-primary)';
        e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
      }}
    >
      <span
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-pill)',
          background: 'var(--brand-primary-soft)',
          color: 'var(--brand-primary-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ChevronLeft size={16} strokeWidth={2.5} />
      </span>
      Back
    </button>
  );
}
