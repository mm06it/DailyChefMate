import { Alert, Platform } from 'react-native';

// `Alert.alert` with a button list is a no-op on React Native Web, so any
// confirm dialog (sign out, delete) never resolves there and the button
// looks dead. Use the browser's native confirm on web, Alert on native.
export function confirmAsync(
  title: string,
  message: string,
  confirmText: string,
  cancelText: string,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
      return Promise.resolve(true);
    }
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
