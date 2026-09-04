import type { Ailment, AilmentNote, AilmentStatus, Medication, PetRole, VetQuestion } from '@geripaws/shared';
import { createAilmentNoteSchema, createVetQuestionSchema } from '@geripaws/shared';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import {
  answerVetQuestion,
  createAilmentNote,
  createVetQuestion,
  deleteAilment,
  fetchAilment,
  fetchAilmentNotes,
  fetchVetQuestions,
  updateAilment,
} from '@/lib/ailments';
import { formatDate, formatDateTime, summarizeSchedule } from '@/lib/format';
import { fetchMedications } from '@/lib/medications';
import { fetchMyRole } from '@/lib/pets';

const STATUS_OPTIONS: { value: AilmentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'resolved', label: 'Resolved' },
];

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function AilmentDetailScreen() {
  const { id, ailmentId } = useLocalSearchParams<{ id: string; ailmentId: string }>();
  const router = useRouter();

  const [ailment, setAilment] = useState<Ailment | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [notes, setNotes] = useState<AilmentNote[]>([]);
  const [questions, setQuestions] = useState<VetQuestion[]>([]);
  const [role, setRole] = useState<PetRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [noteText, setNoteText] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  const load = useCallback(async () => {
    if (!ailmentId || !id) return;
    try {
      const [ailmentData, medData, noteData, questionData, roleData] = await Promise.all([
        fetchAilment(ailmentId),
        fetchMedications(id),
        fetchAilmentNotes(ailmentId),
        fetchVetQuestions(ailmentId),
        fetchMyRole(id),
      ]);
      setAilment(ailmentData);
      setMedications(medData.filter((m) => m.ailment_id === ailmentId));
      setNotes(noteData);
      setQuestions(questionData);
      setRole(roleData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load condition');
    }
  }, [id, ailmentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const canEdit = role === 'owner' || role === 'caregiver';

  async function handleStatusChange(status: AilmentStatus | undefined) {
    if (!status || !ailmentId) return;
    try {
      await updateAilment(ailmentId, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function handleAddNote() {
    const result = createAilmentNoteSchema.safeParse({
      ailmentId,
      occurredAt: new Date().toISOString(),
      note: noteText,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid note');
      return;
    }
    try {
      await createAilmentNote(id, result.data);
      setNoteText('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    }
  }

  async function handleAddQuestion() {
    const result = createVetQuestionSchema.safeParse({ ailmentId, question: questionText });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid question');
      return;
    }
    try {
      await createVetQuestion(id, result.data);
      setQuestionText('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save question');
    }
  }

  async function handleAnswer(questionId: string) {
    if (!answerText.trim()) return;
    try {
      await answerVetQuestion(questionId, { answer: answerText });
      setAnsweringId(null);
      setAnswerText('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save answer');
    }
  }

  function handleDelete() {
    if (!ailmentId) return;
    confirm('Delete condition', 'This also removes its medications and notes. This cannot be undone.', async () => {
      try {
        await deleteAilment(ailmentId);
        router.replace({ pathname: '/pets/[id]/ailments', params: { id } });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete');
      }
    });
  }

  if (!ailment) {
    return (
      <ThemedView style={styles.container}>
        {error ? <ThemedText themeColor="error">{error}</ThemedText> : <ThemedText>Loading…</ThemedText>}
      </ThemedView>
    );
  }

  const openQuestions = questions.filter((q) => q.status === 'open');
  const answeredQuestions = questions.filter((q) => q.status === 'answered');

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {ailment.name}
      </ThemedText>
      {ailment.diagnosed_at ? (
        <ThemedText themeColor="textSecondary" type="small">
          Diagnosed {formatDate(ailment.diagnosed_at)}
          {ailment.diagnosing_vet ? ` by ${ailment.diagnosing_vet}` : ''}
        </ThemedText>
      ) : null}
      {ailment.notes ? <ThemedText type="small">{ailment.notes}</ThemedText> : null}

      {canEdit ? (
        <ChoiceChips
          label="Status"
          options={STATUS_OPTIONS}
          value={ailment.status}
          onChange={handleStatusChange}
        />
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Status: {ailment.status}
        </ThemedText>
      )}

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Medications
      </ThemedText>
      {medications.map((med) => (
        <Pressable
          key={med.id}
          style={styles.row}
          onPress={() =>
            router.push({ pathname: '/pets/[id]/medications/[medicationId]', params: { id, medicationId: med.id } })
          }>
          <ThemedText type="smallBold">
            {med.name} — {med.dosage} {med.unit}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {summarizeSchedule(med.schedule)}
          </ThemedText>
        </Pressable>
      ))}
      {medications.length === 0 ? (
        <ThemedText themeColor="textSecondary" type="small">
          No medications for this condition yet.
        </ThemedText>
      ) : null}
      {canEdit ? (
        <Link href={{ pathname: '/pets/[id]/medications/new', params: { id, ailmentId } }} asChild>
          <Pressable style={styles.secondaryButton}>
            <ThemedText themeColor="tint" type="smallBold">
              + Add medication
            </ThemedText>
          </Pressable>
        </Link>
      ) : null}

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Condition notes
      </ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        Track changes over time, e.g. "seizure frequency down since continuous Keppra"
      </ThemedText>
      {notes.map((note) => (
        <ThemedView key={note.id} style={styles.noteRow}>
          <ThemedText themeColor="textSecondary" type="small">
            {formatDateTime(note.occurred_at)}
          </ThemedText>
          <ThemedText type="small">{note.note}</ThemedText>
        </ThemedView>
      ))}
      {canEdit ? (
        <ThemedView style={styles.inlineForm}>
          <ThemedTextInput placeholder="Add a note about this condition" multiline value={noteText} onChangeText={setNoteText} />
          <Pressable style={styles.secondaryButton} onPress={handleAddNote}>
            <ThemedText themeColor="tint" type="smallBold">
              Add note
            </ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Questions for your vet
      </ThemedText>
      {openQuestions.map((q) => (
        <ThemedView key={q.id} style={styles.noteRow}>
          <ThemedText type="small">{q.question}</ThemedText>
          {answeringId === q.id ? (
            <ThemedView style={styles.inlineForm}>
              <ThemedTextInput placeholder="What did the vet say?" multiline value={answerText} onChangeText={setAnswerText} />
              <Pressable style={styles.secondaryButton} onPress={() => handleAnswer(q.id)}>
                <ThemedText themeColor="tint" type="smallBold">
                  Save answer
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : canEdit ? (
            <Pressable onPress={() => setAnsweringId(q.id)}>
              <ThemedText type="link" themeColor="tint">
                Mark answered
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      ))}
      {canEdit ? (
        <ThemedView style={styles.inlineForm}>
          <ThemedTextInput placeholder="A question to ask at the next visit" value={questionText} onChangeText={setQuestionText} />
          <Pressable style={styles.secondaryButton} onPress={handleAddQuestion}>
            <ThemedText themeColor="tint" type="smallBold">
              Add question
            </ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}
      {answeredQuestions.length > 0 ? (
        <>
          <ThemedText type="smallBold" style={styles.answeredHeading}>
            Answered
          </ThemedText>
          {answeredQuestions.map((q) => (
            <ThemedView key={q.id} style={styles.noteRow}>
              <ThemedText type="small">Q: {q.question}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                A: {q.answer}
              </ThemedText>
            </ThemedView>
          ))}
        </>
      ) : null}

      {error ? (
        <ThemedText themeColor="error" style={styles.message}>
          {error}
        </ThemedText>
      ) : null}

      {canEdit ? (
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <ThemedText themeColor="error" type="smallBold">
            Delete condition
          </ThemedText>
        </Pressable>
      ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 8 },
  title: { fontSize: 28 },
  sectionTitle: { marginTop: 20, marginBottom: 4 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 2,
  },
  noteRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 4,
  },
  inlineForm: { gap: 8, marginTop: 8 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  answeredHeading: { marginTop: 12 },
  message: { textAlign: 'center', marginTop: 12 },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#D33A3A',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
});
