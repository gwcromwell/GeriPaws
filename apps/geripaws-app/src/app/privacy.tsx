/* This is a prose legal document, not markup — its many straight apostrophes
   read better as plain text than escaped as HTML entities. */
/* eslint-disable react/no-unescaped-entities */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

function P({ children }: { children: ReactNode }) {
  return <ThemedText style={styles.paragraph}>{children}</ThemedText>;
}

export default function PrivacyPolicyScreen() {
  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Privacy Policy
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small" style={styles.updated}>
          Last updated September 10, 2026
        </ThemedText>

        <P>
          GeriPaws is a tracker for a senior dog's daily care, medications, and quality of life, built to be shared
          between the people who care for that dog. This page explains what information GeriPaws collects, how it's
          used, and who it's shared with.
        </P>

        <Section title="What we collect">
          <P>
            <ThemedText type="smallBold">Account information.</ThemedText> The email address and password you sign up
            with, and an optional display name shown to other caregivers so your actions are attributed to you by
            name rather than just an email address.
          </P>
          <P>
            <ThemedText type="smallBold">Pet profiles.</ThemedText> Whatever you choose to enter about your dog —
            name, breed, birthdate, sex, spay/neuter status, weight, a photo, microchip number, vet name and phone
            number, allergies, and insurance details. All of these fields are optional except the dog's name.
          </P>
          <P>
            <ThemedText type="smallBold">Care and health records.</ThemedText> Habit logs (walks, food, water,
            incidents) with timestamps and notes; diagnosed conditions, medications, dosing schedules, and dose
            history; refill counts; questions and answers you record for a vet visit; and quality-of-life check-in
            responses. Every entry records which caregiver logged it.
          </P>
          <P>
            <ThemedText type="smallBold">Photos and videos.</ThemedText> Your dog's profile photo, and any photos or
            videos you choose to attach to a specific incident or condition (for example, footage of a seizure to
            show a vet).
          </P>
          <P>
            <ThemedText type="smallBold">Sharing information.</ThemedText> If you invite someone to help care for a
            pet, we store the email address you invited and the role you gave them.
          </P>
          <P>
            <ThemedText type="smallBold">Push notification token.</ThemedText> If you enable notifications, we store
            a device token used to deliver reminders (e.g. a medication is due). We don't collect any other device or
            usage analytics — GeriPaws doesn't use any advertising or analytics tracking.
          </P>
        </Section>

        <Section title="How we use it">
          <P>
            We use this information to run the app itself: showing you and your co-caregivers your dog's up-to-date
            care history, computing when medications are due or refills are running low, generating a vet-visit
            summary you can export or share, and sending reminder notifications if you've turned them on.
          </P>
          <P>We do not sell your data, and we do not use it for advertising.</P>
        </Section>

        <Section title="Who we share it with">
          <P>
            <ThemedText type="smallBold">Other caregivers.</ThemedText> A pet's information is visible only to people
            you've explicitly invited to that pet, according to the role you gave them (a viewer sees the dog's
            information; a caregiver can also log entries and manage medications).
          </P>
          <P>
            <ThemedText type="smallBold">Vet share links.</ThemedText> If you generate a read-only share link for a
            vet, whoever holds that link can view the information it covers — no account or sign-in required. These
            links are time-limited and only exist for pets you choose to create one for.
          </P>
          <P>
            <ThemedText type="smallBold">Service providers.</ThemedText> GeriPaws is built on Supabase, which hosts
            our database, authentication, and file storage, and on Expo's push notification service for delivering
            reminders. These providers process data only to provide their service to us — they don't use it for
            their own purposes.
          </P>
          <P>We don't share your information with anyone else.</P>
        </Section>

        <Section title="How it's protected">
          <P>
            Every pet's data is protected by database-level access rules so that only people you've added to that
            pet can read or write its information — not just other GeriPaws users in general. Data is encrypted in
            transit. Photos and videos attached to incidents or conditions are stored privately and aren't accessible
            by a public URL.
          </P>
        </Section>

        <Section title="Your choices">
          <P>
            You can edit or delete most of your data directly in the app — habit logs, conditions, medications, and
            attached photos or videos can all be removed from within GeriPaws. To delete your account entirely,
            contact us at the email below and we'll delete your account and the data associated with it.
          </P>
        </Section>

        <Section title="Children's privacy">
          <P>
            GeriPaws is not directed at children, and we don't knowingly collect information from anyone under 13.
          </P>
        </Section>

        <Section title="Not veterinary advice">
          <P>
            GeriPaws is a record-keeping tool for you and your veterinarian. It is not a substitute for professional
            veterinary advice, diagnosis, or treatment — always consult your vet with questions about your dog's
            health.
          </P>
        </Section>

        <Section title="Changes to this policy">
          <P>
            If this policy changes, we'll update it here and change the date at the top of this page.
          </P>
        </Section>

        <Section title="Contact">
          <P>Questions about this policy or your data? Email gcromwell.w@gmail.com.</P>
        </Section>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingBottom: 48, maxWidth: 640, alignSelf: 'center', width: '100%' },
  title: { fontSize: 28, marginBottom: 4 },
  updated: { marginBottom: 20 },
  section: { gap: 8, marginTop: 20 },
  sectionTitle: { marginBottom: 2, fontSize: 19 },
  paragraph: { lineHeight: 22 },
});
