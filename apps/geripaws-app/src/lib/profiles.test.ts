import { describe, expect, it, vi } from 'vitest';

import { displayNameFor, type ProfileMap } from './profiles';

// displayNameFor is pure, but this file also exports fetchProfilesForPet,
// which imports ./supabase — and that in turn imports react-native modules
// that only run under a React Native-aware transform, not plain Vitest.
// Mocking it here (same pattern as pets.test.ts) keeps that import chain out
// of the picture for a test that never calls fetchProfilesForPet anyway.
vi.mock('./supabase', () => ({ supabase: {} }));

const PROFILES: ProfileMap = {
  'user-john': { id: 'user-john', email: 'john.doe@example.com', display_name: 'John', created_at: '2026-01-01' },
  'user-no-name': { id: 'user-no-name', email: 'jane.smith@example.com', display_name: null, created_at: '2026-01-01' },
};

describe('displayNameFor', () => {
  it("returns 'You' for the current user, even if they have a display name", () => {
    expect(displayNameFor(PROFILES, 'user-john', 'user-john')).toBe('You');
  });

  it('returns the display name when one is set', () => {
    expect(displayNameFor(PROFILES, 'user-john', 'someone-else')).toBe('John');
  });

  it('falls back to the email local-part when no display name is set', () => {
    expect(displayNameFor(PROFILES, 'user-no-name', 'someone-else')).toBe('jane.smith');
  });

  it("falls back to 'A caregiver' when the profile hasn't loaded", () => {
    expect(displayNameFor({}, 'user-unknown', 'someone-else')).toBe('A caregiver');
  });

  it("falls back to 'Someone' when there's no user id at all", () => {
    expect(displayNameFor(PROFILES, null, 'someone-else')).toBe('Someone');
    expect(displayNameFor(PROFILES, undefined, 'someone-else')).toBe('Someone');
  });
});
