import { describe, expect, it, vi } from 'vitest';

// displayNameFor is pure, but this file also exports fetchProfilesForPet,
// which imports ./supabase — and that in turn imports react-native modules
// that only run under a React Native-aware transform, not plain Vitest.
// Mocking it here (same pattern as pets.test.ts) keeps that import chain out
// of the picture for a test that never calls fetchProfilesForPet anyway.
vi.mock('./supabase', () => ({ supabase: {} }));

import { displayNameFor, type ProfileMap } from './profiles';

const PROFILES: ProfileMap = {
  'user-amanda': { id: 'user-amanda', email: 'amanda.carter@example.com', display_name: 'Amanda', created_at: '2026-01-01' },
  'user-no-name': { id: 'user-no-name', email: 'gcromwell.w@example.com', display_name: null, created_at: '2026-01-01' },
};

describe('displayNameFor', () => {
  it("returns 'You' for the current user, even if they have a display name", () => {
    expect(displayNameFor(PROFILES, 'user-amanda', 'user-amanda')).toBe('You');
  });

  it('returns the display name when one is set', () => {
    expect(displayNameFor(PROFILES, 'user-amanda', 'someone-else')).toBe('Amanda');
  });

  it('falls back to the email local-part when no display name is set', () => {
    expect(displayNameFor(PROFILES, 'user-no-name', 'someone-else')).toBe('gcromwell.w');
  });

  it("falls back to 'A caregiver' when the profile hasn't loaded", () => {
    expect(displayNameFor({}, 'user-unknown', 'someone-else')).toBe('A caregiver');
  });

  it("falls back to 'Someone' when there's no user id at all", () => {
    expect(displayNameFor(PROFILES, null, 'someone-else')).toBe('Someone');
    expect(displayNameFor(PROFILES, undefined, 'someone-else')).toBe('Someone');
  });
});
