/// <reference types="node" />
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { deleteCurrentAccount, signUpTestAccount } from './helpers/accounts';
import { createTestPet } from './helpers/pets';

const TEST_PHOTO = path.join(__dirname, 'fixtures/test-photo.png');

// Regression guard for the Phase 0 bug this suite's originating audit found:
// AttachmentGrid rendered nothing at all — not even the "+ Add" button —
// until an incident had already been saved once, so a caregiver recording a
// seizure had no visible way to attach video in the moment. The fix stages
// picked media locally and uploads it as part of the same Save action.

test('the photo/video picker is visible before an incident is ever saved', async ({ page }) => {
  await signUpTestAccount(page, 'incident-picker');
  try {
    const petId = await createTestPet(page, 'Incident Picker Dog');
    await page.goto(`/pets/${petId}/log/incident`);

    // This is the exact regression: previously nothing rendered here at all
    // on a brand-new, unsaved incident.
    await expect(page.getByText('Photos & video')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add a photo or video' })).toBeVisible();
  } finally {
    await deleteCurrentAccount(page);
  }
});

test('a staged photo can be removed before saving', async ({ page }) => {
  await signUpTestAccount(page, 'incident-remove-staged');
  try {
    const petId = await createTestPet(page, 'Incident Remove Dog');
    await page.goto(`/pets/${petId}/log/incident`);

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Add a photo or video' }).click(),
    ]);
    await chooser.setFiles(TEST_PHOTO);

    const removeButton = page.getByRole('button', { name: 'Remove' });
    await expect(removeButton).toBeVisible();
    await removeButton.click();
    await expect(removeButton).toHaveCount(0);
  } finally {
    await deleteCurrentAccount(page);
  }
});

test('a staged photo uploads and persists when the incident is saved', async ({ page }) => {
  await signUpTestAccount(page, 'incident-persist');
  try {
    const petId = await createTestPet(page, 'Incident Persist Dog');
    // Reached by clicking through from Today, not a direct goto — the save
    // below navigates back via router.back(), which needs a real in-app
    // history entry to return to (a raw page.goto() here wouldn't leave one).
    await page.goto(`/pets/${petId}`);
    await page.getByRole('button', { name: 'Log an accident or incident' }).click();

    await page.getByRole('button', { name: 'Seizure', exact: true }).click();

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'Add a photo or video' }).click(),
    ]);
    await chooser.setFiles(TEST_PHOTO);
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForURL(new RegExp(`/pets/${petId}$`));

    // Reopen the entry from History and confirm the attachment actually
    // made it through the upload, not just the local staging step. The
    // "Habits" (all-types) filter is used rather than "Incidents" because
    // only it labels each row with its type, which is what this locates by —
    // the row itself has no accessibilityLabel of its own.
    await page.goto(`/pets/${petId}/history`);
    await page.getByRole('button', { name: 'Showing:' }).click();
    await page.getByRole('menuitem', { name: 'Habits', exact: true }).click();
    await page.getByText('Incident', { exact: true }).click();
    await expect(page.getByText('Photos & video')).toBeVisible();
    await expect(page.getByRole('button', { name: 'View photo' })).toBeVisible();
  } finally {
    await deleteCurrentAccount(page);
  }
});
