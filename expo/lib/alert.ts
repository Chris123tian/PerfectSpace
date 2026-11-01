// lib/alert.ts — Alert.alert that actually works on web.
//
// react-native-web's Alert is a silent no-op (`static alert() {}`), which
// made logout, admin approvals, account deletion and every other
// confirm-dialog flow silently do nothing in the browser. On native we
// delegate to the real Alert; on web we translate to window.confirm /
// window.alert:
//   • 0–1 buttons  → window.alert, then run the single button's onPress.
//   • 2 buttons    → window.confirm; OK presses the LAST button (the
//     action, e.g. "Log Out"), cancel presses the first (e.g. "Cancel").
//   • 3+ buttons   → window.confirm; OK presses the SECOND button (these
//     are source choosers like Camera / Photo Library / Cancel).
import { Alert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  _options?: Record<string, unknown>
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as Parameters<typeof Alert.alert>[2], _options);
    return;
  }

  const list = buttons ?? [];
  const text = message ? `${title}\n\n${message}` : title;

  if (list.length <= 1) {
    window.alert(text);
    list[0]?.onPress?.();
    return;
  }

  const confirmed = window.confirm(text);
  if (confirmed) {
    const action = list.length === 2 ? list[list.length - 1] : list[1];
    action?.onPress?.();
  } else {
    list[0]?.onPress?.();
  }
}
