// Web has no native date/time picker (see quick-time-chips.tsx, which hides
// the "Custom" option on this platform), so these are unreachable stand-ins
// that keep the module resolvable without bundling the native-only package.
type Props = {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
};

export function CustomTimePicker(_props: Props) {
  return null;
}

export function openAndroidTimePicker(_value: Date, _onChange: (date: Date) => void) {}
