// lib/nav.ts — back navigation that survives a page refresh.
// On web, reloading (or opening a shared link to) a pushed screen leaves no
// history, so router.back() silently does nothing. Fall back to a sensible
// screen instead.
import { router, type Href } from 'expo-router';

export function goBack(fallback: Href = '/'): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
