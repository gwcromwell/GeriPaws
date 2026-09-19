import type { Page } from '@playwright/test';

export async function createTestPet(page: Page, name: string): Promise<string> {
  await page.goto('/pets/new');
  await page.getByRole('textbox', { name: 'Name' }).fill(name);
  await page.getByRole('button', { name: 'Create dog profile' }).click();
  await page.waitForURL(/\/pets\/[0-9a-f-]+$/);
  const match = page.url().match(/\/pets\/([0-9a-f-]+)$/);
  if (!match) throw new Error(`Could not extract pet id from ${page.url()}`);
  return match[1];
}

/** Fills the minimum viable "fixed times/day" medication (name, dose, unit,
 * one 08:00 slot) and saves it — used as a fixture by tests that need a dose
 * to skip/delete, not itself the thing under test. */
export async function createTestMedication(page: Page, petId: string, name: string): Promise<string> {
  await page.goto(`/pets/${petId}/medications/new`);
  await page.getByRole('textbox', { name: 'Name' }).fill(name);
  await page.getByRole('textbox', { name: 'Dose' }).fill('10');
  await page.getByRole('textbox', { name: 'Unit' }).fill('mg');
  await page.getByRole('textbox', { name: 'Time 1' }).fill('08:00');
  await page.getByRole('button', { name: 'Save medication' }).click();
  await page.waitForURL(/\/medications\/[0-9a-f-]+$/);
  const match = page.url().match(/\/medications\/([0-9a-f-]+)$/);
  if (!match) throw new Error(`Could not extract medication id from ${page.url()}`);
  return match[1];
}

/** Sends an invite from the currently-open pet's Caregivers screen and
 * returns its token, read straight off the pet_invites insert response
 * rather than the copy-link button — avoids depending on clipboard
 * permissions in CI. */
export async function inviteCaregiver(
  page: Page,
  petId: string,
  email: string,
  role: 'caregiver' | 'viewer' = 'caregiver'
): Promise<string> {
  await page.goto(`/pets/${petId}/sharing`);
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  if (role === 'viewer') {
    await page.getByRole('button', { name: 'viewer' }).click();
  }
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/rest/v1/pet_invites') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Send invite' }).click(),
  ]);
  const body = (await response.json()) as { token: string };
  return body.token;
}
