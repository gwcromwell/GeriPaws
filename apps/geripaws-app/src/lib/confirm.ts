import { Alert, Platform } from 'react-native';

/** A destructive-action confirmation, using each platform's own native
 * dialog (window.confirm on web, Alert.alert on native) rather than a custom
 * modal — there's nothing to style since both delegate to the OS/browser. */
export function confirmDestructive(title: string, message: string, onConfirm: () => void, confirmLabel = 'Delete') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

/** A non-destructive confirmation for a reversible action (e.g. signing out)
 * — same native-dialog approach as confirmDestructive, but without the red
 * "destructive" button styling, since undoing this is just signing back in. */
export function confirmAction(title: string, message: string, onConfirm: () => void, confirmLabel = 'OK') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}
