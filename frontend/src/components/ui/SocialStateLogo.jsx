/**
 * Social State logo — pure SVG / CSS, no image assets required.
 *
 * Five variants kept compatible with the prior API so consumers don't
 * have to change:
 *   SocialStateMark            — square brand mark (icon-only)
 *   SocialStateMarkInverted    — same, inverted for dark surfaces
 *   SocialStateWordmark        — small wordmark (text only)
 *   SocialStateLogoHorizontal  — mark + wordmark, side by side
 *   SocialStateLogoStacked     — mark + wordmark, stacked
 *
 * To swap in a real logo asset later, replace these renderers with <img>
 * tags pointing at the new file. The export signatures don't need to change.
 */

const BRAND_CYAN = '#00CCF5';

// Square brand mark. Two interlocking "S" curves on a rounded-rect cyan
// background. Renders fine at any size; clean for favicon-down to hero.
function MarkSvg({ size = 40, inverted = false }) {
  const bg = inverted ? 'transparent' : BRAND_CYAN;
  const fg = inverted ? '#ffffff' : '#0a0e14';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Social State"
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

function WordmarkSvg({ height = 22, color = 'currentColor' }) {
  // Wordmark width is roughly 6.3x height. We render with text + a tight
  // letter-spacing for a modern look.
  const fontSize = Math.round(height * 0.86);
  return (
    <span
      role="img"
      aria-label="Social State"
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
      Social&nbsp;State
    </span>
  );
}

export function SocialStateMark({ size = 40, className, style: extraStyle }) {
  return (
    <span className={className} style={{ display: 'inline-flex', ...extraStyle }}>
      <MarkSvg size={size} />
    </span>
  );
}

export function SocialStateMarkInverted({ size = 40, className, style: extraStyle }) {
  return (
    <span className={className} style={{ display: 'inline-flex', ...extraStyle }}>
      <MarkSvg size={size} inverted />
    </span>
  );
}

export function SocialStateWordmark({ height = 22, className, style: extraStyle }) {
  return (
    <span className={className} style={{ display: 'inline-flex', height, ...extraStyle }}>
      <WordmarkSvg height={height} />
    </span>
  );
}

export function SocialStateLogoHorizontal({ height = 36, className, style: extraStyle }) {
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
      <MarkSvg size={markSize} />
      <WordmarkSvg height={Math.round(height * 0.7)} />
    </span>
  );
}

export function SocialStateLogoStacked({ height = 100, className, style: extraStyle }) {
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
      <MarkSvg size={markSize} />
      <WordmarkSvg height={Math.round(height * 0.22)} />
    </span>
  );
}
