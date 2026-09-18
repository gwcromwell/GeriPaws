import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort catch for a render-time crash anywhere in the app (a bad prop,
 * a null dereference, anything React error boundaries can catch) — without
 * this, that's a blank/frozen screen with no way back in short of force-
 * quitting. Deliberately plain RN components, not the themed ones — this
 * must still render something sane even if whatever crashed took a theme or
 * data provider down with it.
 *
 * Does NOT catch errors in async code (a rejected promise, a failed fetch) —
 * those are handled by each call site's own try/catch. This is specifically
 * the render-crash safety net.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            GeriPaws hit an unexpected error. Your data is safe — try going back in.
          </Text>
          <TouchableOpacity accessibilityRole="button" onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#ffffff',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#000000', textAlign: 'center' },
  message: { fontSize: 15, color: '#444444', textAlign: 'center' },
  button: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#208AEF' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
