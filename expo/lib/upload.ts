import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getBaseUrl } from '@/lib/trpc';
import { getSessionToken } from '@/lib/session';

export type UploadKind = 'image' | 'avatar' | 'document';

const MAX_EDGE: Record<UploadKind, number> = { image: 1600, avatar: 512, document: 1800 };

/** True for URLs that already live on a server (safe to save). */
export function isHostedImage(uri: string | undefined | null): boolean {
  return !!uri && /^https?:\/\//.test(uri);
}

/**
 * Resize/compress a picked photo and upload it. Returns the permanent https
 * URL to save on the profile/listing — never the device-local URI, which
 * only exists on the phone or browser tab that picked it.
 */
export async function uploadImage(
  localUri: string,
  kind: UploadKind = 'image',
  size?: { width?: number; height?: number },
): Promise<string> {
  if (isHostedImage(localUri)) return localUri;
  const token = getSessionToken();
  if (!token) throw new Error('Please sign in to upload photos.');

  const edge = MAX_EDGE[kind];
  const w = size?.width ?? 0;
  const h = size?.height ?? 0;
  const resize = w && h
    ? (w >= h ? (w > edge ? { width: edge } : null) : (h > edge ? { height: edge } : null))
    : { width: edge };

  const result = await manipulateAsync(localUri, resize ? [{ resize }] : [], {
    compress: kind === 'document' ? 0.82 : 0.72,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error('Could not read this photo. Try another one.');

  const res = await fetch(`${getBaseUrl()}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data: result.base64, kind }),
  });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) {
    console.log('[Upload] failed', res.status, json.error);
    throw new Error(json.error ?? 'Upload failed. Check your connection and try again.');
  }
  console.log('[Upload] stored', kind, json.url);
  return json.url;
}
