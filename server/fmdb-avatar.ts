/** Imagens são lidas separadamente do diretório, sem migrar ou reescrever cartões legados. */
export const MAX_AVATAR_BYTES = 48 * 1024;

export function decodeAvatar(value: string): { bytes: Uint8Array; type: string } | null {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length > Math.ceil(MAX_AVATAR_BYTES / 3) * 4) return null;
  try {
    const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
    if (bytes.length > MAX_AVATAR_BYTES) return null;
    const signature = (values: number[], at = 0) => values.every((n, i) => bytes[at + i] === n);
    const valid = match[1] === 'jpeg' ? signature([255, 216, 255])
      : match[1] === 'png' ? signature([137, 80, 78, 71, 13, 10, 26, 10])
      : signature([82, 73, 70, 70]) && signature([87, 69, 66, 80], 8);
    return valid ? { bytes, type: `image/${match[1]}` } : null;
  } catch { return null; }
}

export async function avatarVersion(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map(n => n.toString(16).padStart(2, '0')).join('');
}

export async function publicAvatar(id: string, value: string): Promise<string> {
  if (value.startsWith('data:')) {
    return decodeAvatar(value) ? `/api/fmdb?avatar=${encodeURIComponent(id)}&v=${await avatarVersion(value)}` : '';
  }
  if (value.startsWith('/api/fmdb?avatar=')) return value;
  try { return new URL(value).protocol === 'https:' && value.length <= 2048 ? value : ''; }
  catch { return ''; }
}
