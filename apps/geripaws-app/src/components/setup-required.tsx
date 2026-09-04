import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function SetupRequired() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        GeriPaws
      </ThemedText>
      <ThemedText type="subtitle" style={styles.subtitle}>
        Supabase isn't configured yet
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        Create a Supabase project, then copy .env.example to .env and set
        EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, and restart the dev server.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 32, textAlign: 'center' },
  subtitle: { fontSize: 18, textAlign: 'center' },
  body: { textAlign: 'center', lineHeight: 22 },
});
