import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchMyPets, type PetWithRole } from '@/lib/pets';


import { useTheme } from '@/hooks/use-theme';
export default function PetListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [pets, setPets] = useState<PetWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setPets(await fetchMyPets());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dogs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ThemedView style={styles.container}>
      {error ? (
        <ThemedText themeColor="error" style={styles.message}>
          {error}
        </ThemedText>
      ) : null}

      <FlatList
        data={pets}
        keyExtractor={(pet) => pet.id}
        refreshing={isLoading}
        onRefresh={load}
        contentContainerStyle={pets.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <ThemedText themeColor="textSecondary" style={styles.message}>
              No dogs yet. Add your first one below.
            </ThemedText>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button"
            style={styles.petRow}
            onPress={() => router.push({ pathname: '/pets/[id]', params: { id: item.id } })}>
            <ThemedText type="subtitle" style={styles.petName}>
              {item.name}
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {item.breed ?? 'Dog'} · {item.role}
            </ThemedText>
          </Pressable>
        )}
      />

      <Link href="/pets/new" asChild>
        <Pressable accessibilityRole="button" style={StyleSheet.flatten([styles.addButton, { backgroundColor: theme.tint }])}>
          <ThemedText themeColor="background" type="smallBold">
            + Add a dog
          </ThemedText>
        </Pressable>
      </Link>

      <Link href="/account" style={styles.accountLink}>
        <ThemedText type="link" themeColor="textSecondary">
          Account
        </ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  list: { gap: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  message: { textAlign: 'center' },
  petRow: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 4,
  },
  petName: { fontSize: 22 },
  addButton: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  accountLink: { alignSelf: 'center', marginTop: 8 },
});
