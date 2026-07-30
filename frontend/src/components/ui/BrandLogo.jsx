/* ============================================================================
 *  Brand mark + wordmark — driven by frontend/.env (REACT_APP_BRAND_*).
 * ========================================================================== */
import { brand } from '../../config/brand';

/**
 * Variants (unchanged API):
 *   BrandMark, BrandMarkInverted, BrandWordmark,
 *   BrandLogoHorizontal, BrandLogoStacked
 */

function MarkImage({ size, inverted }) {
  const filter = inverted ? 'brightness(0) invert(1)' : undefined;
  return (
    <img
      src={brand.logoUrl}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0, objectFit: 'contain', filter }}
    />
  );
}

function MarkSvg({ size = 40, inverted = false }) {
  const bg = inverted ? 'transparent' : brand.primaryColor;
  const fg = inverted ? '#ffffff' : '#0a0e14';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-hidden={brand.logoUrl ? true : undefined}
      aria-label={brand.logoUrl ? undefined : brand.name}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect x="0" y="0" width="64" height="64" rx="14" fill={bg} />
      <path
        d="M22 18 C 22 10, 42 10, 42 18 C 42 26, 22 26, 22 32 C 22 38, 42 38, 42 46 C 42 54, 22 54, 22 46"
        fill="none"
        stroke={fg}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Mark({ size, inverted }) {
  if (brand.logoUrl) {
    return <MarkImage size={size} inverted={inverted} />;
  }
  return <MarkSvg size={size} inverted={inverted} />;
}

function WordmarkSvg({ height = 22, color = 'currentColor' }) {
  const fontSize = Math.round(height * 0.86);
  return (
    <span
      role="img"
      aria-label={brand.name}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-display, var(--font-sans, Inter), system-ui, sans-serif)',
        fontWeight: 700,
        fontSize,
        letterSpacing: '-0.025em',
        lineHeight: 1,
        color,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {brand.name.replace(/ /g, '\u00a0')}
    </span>
  );
}

export function BrandMark({ size = 40, className, style: extraStyle }) {
  return (
    <span className={className} style={{ display: 'inline-flex', ...extraStyle }}>
      <Mark size={size} />
    </span>
  );
}

export function BrandMarkInverted({ size = 40, className, style: extraStyle }) {
  return (
    <span className={className} style={{ display: 'inline-flex', ...extraStyle }}>
      <Mark size={size} inverted />
    </span>
  );
}

export function BrandWordmark({ height = 22, className, style: extraStyle }) {
  return (
    <span className={className} style={{ display: 'inline-flex', height, ...extraStyle }}>
      <WordmarkSvg height={height} />
    </span>
  );
}

export function BrandLogoHorizontal({ height = 36, className, style: extraStyle }) {
  const markSize = Math.round(height);
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.round(height * 0.32),
        height,
        ...extraStyle,
      }}
    >
      <Mark size={markSize} />
      <WordmarkSvg height={Math.round(height * 0.7)} />
    </span>
  );
}

export function BrandLogoStacked({ height = 100, className, style: extraStyle }) {
  const markSize = Math.round(height * 0.6);
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: Math.round(height * 0.12),
        height,
        ...extraStyle,
      }}
    >
      <Mark size={markSize} />
      <WordmarkSvg height={Math.round(height * 0.22)} />
    </span>
  );
}
