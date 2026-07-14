/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { getPlatformIconKey } from '../../constants/socialPlatforms';

const PLATFORM_ALIASES = {
  google: 'google',
  google_my_business: 'google_my_business',
  google_business: 'google_my_business',
  gmb: 'google_my_business',
  linkedin_personal: 'linkedin',
  linkedin_company: 'linkedin',
  instagram_login: 'instagram',
  x: 'twitter',
};

function normalizePlatform(platform) {
  if (!platform) return 'default';
  const aliased = PLATFORM_ALIASES[platform] || platform;
  return getPlatformIconKey(aliased) || aliased;
}

function SvgWrap({ size, title, children, viewBox = '0 0 24 24', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : 'presentation'}
      className={`social-platform-icon ${className}`.trim()}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export default function SocialPlatformIcon({ platform, size = 18, title, className = '' }) {
  const key = normalizePlatform(platform);

  switch (key) {
    case 'facebook':
      return (
        <SvgWrap size={size} title={title || 'Facebook'} className={className}>
          <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.885v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </SvgWrap>
      );
    case 'instagram':
      return (
        <SvgWrap size={size} title={title || 'Instagram'} className={className}>
          <defs>
            <linearGradient id={`ig-grad-${size}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F58529" />
              <stop offset="35%" stopColor="#DD2A7B" />
              <stop offset="70%" stopColor="#8134AF" />
              <stop offset="100%" stopColor="#515BD4" />
            </linearGradient>
          </defs>
          <rect x="2.25" y="2.25" width="19.5" height="19.5" rx="5.5" fill={`url(#ig-grad-${size})`} />
          <circle cx="12" cy="12" r="4.25" fill="none" stroke="#fff" strokeWidth="1.9" />
          <circle cx="17.3" cy="6.9" r="1.15" fill="#fff" />
          <rect x="6.1" y="6.1" width="11.8" height="11.8" rx="3.6" fill="none" stroke="#fff" strokeWidth="1.9" />
        </SvgWrap>
      );
    case 'youtube':
      return (
        <SvgWrap size={size} title={title || 'YouTube'} className={className}>
          <rect x="2" y="5" width="20" height="14" rx="4.5" fill="#FF0000" />
          <path fill="#fff" d="M10 9.2v5.6l5-2.8-5-2.8z" />
        </SvgWrap>
      );
    case 'linkedin':
      return (
        <SvgWrap size={size} title={title || 'LinkedIn'} className={className}>
          <rect width="24" height="24" rx="4.5" fill="#0A66C2" />
          <rect x="5.2" y="9.2" width="2.5" height="9.2" fill="#fff" />
          <circle cx="6.45" cy="6.55" r="1.45" fill="#fff" />
          <path fill="#fff" d="M10 9.2h2.4v1.25h.03c.33-.63 1.14-1.55 2.95-1.55 3.16 0 3.75 2.08 3.75 4.78v4.7h-2.5V14.2c0-1-.02-2.29-1.39-2.29-1.4 0-1.61 1.09-1.61 2.22v4.27H10V9.2z" />
        </SvgWrap>
      );
    case 'google':
      return (
        <SvgWrap size={size} title={title || 'Google'} className={className} viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </SvgWrap>
      );
    case 'google_my_business':
      return (
        <SvgWrap size={size} title={title || 'Google My Business'} className={className}>
          <path fill="#4285F4" d="M4.5 8.2h15l2.6 3.3v8.8a2.7 2.7 0 0 1-2.7 2.7H7.2a2.7 2.7 0 0 1-2.7-2.7V8.2z" />
          <path fill="#34A853" d="M2 7.8 4.4 4h15.2L22 7.8H2z" />
          <path fill="#FBBC04" d="M9.1 10.2h5.8v10.1H9.1z" />
          <path fill="#fff" d="M12 12.1a3.1 3.1 0 1 0 0 6.2c1.2 0 2.1-.45 2.85-1.2l-1.15-.95c-.42.4-.95.7-1.7.7-1.45 0-2.5-1.2-2.5-2.6s1.05-2.6 2.5-2.6c.83 0 1.42.32 1.74.62l1-1.02c-.62-.6-1.53-1.17-2.59-1.17z" />
          <circle cx="18.3" cy="13.2" r="1.25" fill="#EA4335" />
        </SvgWrap>
      );
    case 'tiktok':
      return (
        <SvgWrap size={size} title={title || 'TikTok'} className={className}>
          <path fill="#010101" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </SvgWrap>
      );
    case 'pinterest':
      return (
        <SvgWrap size={size} title={title || 'Pinterest'} className={className}>
          <path fill="#BD081C" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.174.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
        </SvgWrap>
      );
    case 'threads':
      return (
        <SvgWrap size={size} title={title || 'Threads'} className={className}>
          <path fill="#000" d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.85 13.85 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Z" />
        </SvgWrap>
      );
    case 'bluesky':
      return (
        <SvgWrap size={size} title={title || 'Bluesky'} className={className}>
          <path fill="#0085FF" d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.601 3.476 6.153 3.228-4.475.663-8.391 2.69-4.66 9.523 4.47-5.503 6.962-2.527 9.883-8.192 2.921 5.665 4.127 2.383 9.883 8.192 3.731-6.833-.185-8.86-4.66-9.523 2.552.248 5.368-.601 6.153-3.228C23.622 9.418 24 4.458 24 3.768c0-.688-.139-1.86-.902-2.203-.659-.3-1.664-.621-4.3 1.24C16.046 4.747 13.087 8.686 12 10.8z" />
        </SvgWrap>
      );
    case 'mastodon':
      return (
        <SvgWrap size={size} title={title || 'Mastodon'} className={className}>
          <path fill="#6364FF" d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01A20.282 20.282 0 0 1 15.599 17c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054A19.65 19.65 0 0 0 16.28 14c.551 0 1.1-.008 1.652-.029 1.923-.065 3.942-.205 5.84-.652.046-.011.09-.024.135-.036 2.435-.581 4.754-2.398 4.999-6.693.009-.156.032-1.628.032-1.79 0-.547.157-3.89-.018-5.94z" />
        </SvgWrap>
      );
    case 'twitter':
      return (
        <SvgWrap size={size} title={title || 'X'} className={className}>
          <path fill="#000" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </SvgWrap>
      );
    default:
      return (
        <SvgWrap size={size} title={title || 'Platform'} className={className}>
          <circle cx="12" cy="12" r="10" fill="#CBD5E1" />
          <path fill="#fff" d="M12 6.5a5.5 5.5 0 0 0-5.44 4.75h2.05a3.6 3.6 0 1 1 .01 1.5H6.56A5.5 5.5 0 1 0 12 6.5z" />
        </SvgWrap>
      );
  }
}
