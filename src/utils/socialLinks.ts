import { SocialPlatform } from '../types';

export interface PlatformMeta {
  id: SocialPlatform;
  label: string;
  shortLabel: string;
  placeholder: string;
  colorClass: string;
  borderActiveClass: string;
  supportsRealApiFollow?: boolean;
  supportsMobileDeepLink?: boolean;
}

export const PLATFORMS: PlatformMeta[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    shortLabel: 'Insta',
    placeholder: '@seu.usuario ou instagram.com/usuario',
    colorClass: 'text-pink-500 dark:text-pink-400',
    borderActiveClass: 'border-pink-500/50 bg-pink-500/10 text-pink-600 dark:text-pink-300',
    supportsMobileDeepLink: true,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    shortLabel: 'TikTok',
    placeholder: '@seu.usuario ou tiktok.com/@usuario',
    colorClass: 'text-fuchsia-500 dark:text-cyan-300',
    borderActiveClass: 'border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-600 dark:text-cyan-200',
    supportsMobileDeepLink: true,
  },
  {
    id: 'github',
    label: 'GitHub',
    shortLabel: 'GitHub',
    placeholder: 'username ou github.com/username',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    borderActiveClass: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    supportsRealApiFollow: true,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    shortLabel: 'LinkedIn',
    placeholder: 'in/seu-perfil ou URL do LinkedIn',
    colorClass: 'text-sky-600 dark:text-sky-400',
    borderActiveClass: 'border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    supportsMobileDeepLink: true,
  },
  {
    id: 'twitter',
    label: 'X / Twitter',
    shortLabel: 'X',
    placeholder: '@usuario ou x.com/usuario',
    colorClass: 'text-slate-700 dark:text-slate-200',
    borderActiveClass: 'border-slate-400/50 bg-slate-500/10 text-slate-900 dark:text-white',
    supportsMobileDeepLink: true,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    shortLabel: 'YouTube',
    placeholder: '@canal ou youtube.com/@canal',
    colorClass: 'text-red-600 dark:text-red-400',
    borderActiveClass: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300',
  },
  {
    id: 'bluesky',
    label: 'Bluesky',
    shortLabel: 'Bluesky',
    placeholder: 'usuario.bsky.social',
    colorClass: 'text-blue-600 dark:text-blue-400',
    borderActiveClass: 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  {
    id: 'website',
    label: 'Site / Portfólio',
    shortLabel: 'Site',
    placeholder: 'https://seudominio.dev',
    colorClass: 'text-amber-600 dark:text-amber-400',
    borderActiveClass: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
];

const BLOCKED_URL_SHORTENERS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'cutt.ly',
  'is.gd',
  'shorturl.at',
  'rb.gy',
  'ow.ly',
  'tiny.cc',
  'rebrand.ly',
  'bl.ink',
]);

/**
 * Validates and normalizes a personal website/portfolio URL,
 * blocking malicious protocols (javascript:, data:), IP addresses, and URL shorteners.
 */
export function validateSafeWebsiteUrl(rawInput: string): {
  valid: boolean;
  safeUrl: string;
  hostname: string;
  error?: string;
} {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: true, safeUrl: '', hostname: '' };
  }

  // Block dangerous schemes immediately
  if (/^(javascript|data|vbscript|file|blob|about):/i.test(trimmed)) {
    return {
      valid: false,
      safeUrl: '',
      hostname: '',
      error: 'Protocolo inseguro bloqueado.',
    };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed.replace(/^http:\/\//i, 'https://')
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        safeUrl: '',
        hostname: '',
        error: 'Apenas links HTTPS são permitidos.',
      };
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // Must contain a valid TLD dot and not be an IP address
    if (!host.includes('.') || /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host === 'localhost') {
      return {
        valid: false,
        safeUrl: '',
        hostname: '',
        error: 'Informe um domínio público válido (ex: meunome.dev).',
      };
    }

    if (BLOCKED_URL_SHORTENERS.has(host)) {
      return {
        valid: false,
        safeUrl: '',
        hostname: '',
        error: `Encurtadores de link (${host}) são bloqueados por segurança contra phishing. Use a URL final.`,
      };
    }

    return {
      valid: true,
      safeUrl: parsed.toString(),
      hostname: host,
    };
  } catch {
    return {
      valid: false,
      safeUrl: '',
      hostname: '',
      error: 'URL de site inválida.',
    };
  }
}

/**
 * Strictly extracts only the safe username/handle for a social platform.
 * Even if someone pastes a full URL or a malicious domain, we strip everything
 * except the sanitized handle characters [a-zA-Z0-9._-] and rebuild the link
 * exclusively using the official platform domain.
 */
export function extractCleanHandle(platform: SocialPlatform, rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';

  if (platform === 'website') {
    const check = validateSafeWebsiteUrl(trimmed);
    return check.valid ? check.hostname : '';
  }

  // Remove query string, hashes, and trailing slashes
  const withoutQuery = trimmed.split('?')[0].split('#')[0].replace(/\/+$/, '');

  let candidate = withoutQuery;
  if (withoutQuery.includes('/')) {
    const parts = withoutQuery.split('/').filter(Boolean);
    candidate = parts[parts.length - 1] || '';
  }

  // Remove leading @ and strip any character not allowed in social handles
  const clean = candidate.replace(/^@+/, '').replace(/[^a-zA-Z0-9._-]/g, '');
  return clean.slice(0, 60);
}

/**
 * Builds the destination URL strictly from hardcoded official social domains,
 * making it impossible for a social button to redirect to a phishing domain.
 */
export function buildSocialUrl(
  platform: SocialPlatform,
  rawValue: string,
  useMobileDeepLink = false
): string {
  const trimmed = rawValue.trim();
  if (!trimmed) return '#';

  if (platform === 'website') {
    const check = validateSafeWebsiteUrl(trimmed);
    return check.valid && check.safeUrl ? check.safeUrl : '#';
  }

  const handle = extractCleanHandle(platform, trimmed);
  if (!handle) return '#';

  if (useMobileDeepLink) {
    switch (platform) {
      case 'instagram':
        return `instagram://user?username=${encodeURIComponent(handle)}`;
      case 'tiktok':
        return `snssdk1233://user/profile/${encodeURIComponent(handle)}`;
      case 'twitter':
        return `twitter://user?screen_name=${encodeURIComponent(handle)}`;
      case 'linkedin':
        return `linkedin://in/${encodeURIComponent(handle)}`;
      default:
        break;
    }
  }

  // Strictly hardcoded official domains
  switch (platform) {
    case 'instagram':
      return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
    case 'tiktok':
      return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
    case 'github':
      return `https://github.com/${encodeURIComponent(handle)}`;
    case 'linkedin':
      return `https://www.linkedin.com/in/${encodeURIComponent(handle)}/`;
    case 'twitter':
      return `https://x.com/${encodeURIComponent(handle)}`;
    case 'youtube':
      return `https://www.youtube.com/@${encodeURIComponent(handle)}`;
    case 'bluesky': {
      const bskyHandle = handle.includes('.') ? handle : `${handle}.bsky.social`;
      return `https://bsky.app/profile/${encodeURIComponent(bskyHandle)}`;
    }
  }
}

export function formatDisplayHandle(platform: SocialPlatform, rawValue: string): string {
  if (platform === 'website') {
    const check = validateSafeWebsiteUrl(rawValue);
    return check.valid ? check.hostname : 'link inválido';
  }
  const handle = extractCleanHandle(platform, rawValue);
  if (!handle) return '';
  switch (platform) {
    case 'instagram':
    case 'tiktok':
    case 'twitter':
    case 'youtube':
      return `@${handle}`;
    case 'github':
      return `/${handle}`;
    case 'linkedin':
      return `in/${handle}`;
    case 'bluesky':
      return `@${handle}`;
  }
}
