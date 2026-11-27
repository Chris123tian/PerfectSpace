import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

/**
 * Open Paystack checkout. On web the tab goes to Paystack and comes back to
 * /payment/callback; on native an auth session opens and we land on the same
 * screen with the reference, which then verifies the payment on the server.
 */
export async function openCheckout(
  initialize: (input: { propertyId: string; quantity: number; returnUrl?: string }) => Promise<{ authorizationUrl: string; reference: string }>,
  propertyId: string,
  quantity: number,
) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const returnUrl = `${window.location.origin}/payment/callback`;
    const res = await initialize({ propertyId, quantity, returnUrl });
    window.location.href = res.authorizationUrl;
    return;
  }
  const returnUrl = Linking.createURL('payment/callback');
  const res = await initialize({ propertyId, quantity, returnUrl });
  await WebBrowser.openAuthSessionAsync(res.authorizationUrl, returnUrl);
  // Whether the sheet closed by redirect or by the user, verify on the server.
  router.push({ pathname: '/payment/callback', params: { ref: res.reference } });
}

export function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
