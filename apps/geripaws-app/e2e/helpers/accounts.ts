import type { Page } from '@playwright/test';

const PASSWORD = 'TempTest12345!';

/** Every disposable account this suite creates uses this address pattern —
 * if a test crashes before its own cleanup runs, whatever's left in the live
 * project is at least easy to recognize and hand-delete. */
export function uniqueTestEmail(label: string): string {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `geripaws-e2e+${label}-${stamp}-${rand}@example.com`;
}

export interface TestAccount {
  email: string;
  password: string;
}

/** Signs up a brand-new disposable account and leaves the browser signed in
 * on the "My Dogs" screen. This project's Supabase Auth doesn't require
 * email confirmation before a session exists (verified by hand during the
 * UX audit), so this resolves the moment sign-up succeeds — no inbox to
 * poll. */
export async function signUpTestAccount(page: Page, label: string, emailOverride?: string): Promise<TestAccount> {
  const email = emailOverride ?? uniqueTestEmail(label);
  await page.goto('/sign-up');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.waitForURL('/');
  return { email, password: PASSWORD };
}

export async function signInTestAccount(page: Page, account: TestAccount): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(account.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/');
}

/** Permanently deletes whichever account is currently signed in, via the
 * app's own Account → Danger zone flow — this cascades to any pets that
 * account owns (and their attachments, doses, etc.), so a test that created
 * a pet doesn't need to separately clean that up. Call this in a `finally`
 * or `test.afterEach` so it still runs when an assertion above it fails. */
export async function deleteCurrentAccount(page: Page): Promise<void> {
  await page.goto('/account');
  await page.getByRole('textbox', { name: 'Type DELETE to confirm' }).fill('DELETE');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Permanently delete my account' }).click();
  await page.waitForURL('/sign-in');
}
