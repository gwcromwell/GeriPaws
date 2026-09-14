import { describe, expect, it } from 'vitest';
import { toErrorMessage } from './errors';

describe('toErrorMessage', () => {
  it('uses the Error instance\'s own message', () => {
    expect(toErrorMessage(new Error('Network request failed'))).toBe('Network request failed');
  });

  it('falls back to the default message for a non-Error throw', () => {
    expect(toErrorMessage('a plain string')).toBe('Something went wrong');
    expect(toErrorMessage(null)).toBe('Something went wrong');
    expect(toErrorMessage(undefined)).toBe('Something went wrong');
  });

  it('uses a caller-supplied fallback instead of the default', () => {
    expect(toErrorMessage('boom', 'Failed to load dog')).toBe('Failed to load dog');
  });
});
