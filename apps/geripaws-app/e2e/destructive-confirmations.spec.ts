import { expect, test } from '@playwright/test';

import { deleteCurrentAccount, signInTestAccount, signUpTestAccount, uniqueTestEmail } from './helpers/accounts';
import { createTestMedication, createTestPet, inviteCaregiver } from './helpers/pets';
import { acceptInviteViaRpc } from './helpers/supabase';

// Regression guard for the gap fixed in this suite's originating audit: five
// actions (skip dose, delete dose, delete habit log, remove caregiver,
// revoke invite/link) that alter or remove another caregiver's shared data
// used to fire immediately with no confirmation. Each test below asserts
// both halves of the fix — Cancel truly leaves data untouched, and
// confirming is what actually applies the change — so a future refactor
// that accidentally drops the confirmDestructive() wrapper fails loudly
// here instead of shipping silently.

test('skip a medication dose requires confirmation', async ({ page }) => {
  await signUpTestAccount(page, 'skip-dose');
  try {
    const petId = await createTestPet(page, 'Skip Dose Dog');
    await createTestMedication(page, petId, 'Test Med');

    await page.goto(`/pets/${petId}`);
    const skipButton = page.getByRole('button', { name: /^Skip Test Med$/ });

    // Cancel: dialog appears, dismissing it leaves the dose un-skipped.
    page.once('dialog', (dialog) => dialog.dismiss());
    await skipButton.click();
    await expect(skipButton).toBeVisible();
    await expect(page.getByText('Skipped', { exact: false })).toHaveCount(0);

    // Confirm: accepting the same dialog actually skips it.
    page.once('dialog', (dialog) => dialog.accept());
    await skipButton.click();
    await expect(page.getByText(/Skipped/)).toBeVisible();
    await expect(skipButton).toHaveCount(0);
  } finally {
    await deleteCurrentAccount(page);
  }
});

test('deleting a dose record requires confirmation', async ({ page }) => {
  await signUpTestAccount(page, 'delete-dose');
  try {
    const petId = await createTestPet(page, 'Delete Dose Dog');
    const medicationId = await createTestMedication(page, petId, 'Test Med');

    // Give the dose so there's a record to delete.
    await page.goto(`/pets/${petId}`);
    await page.getByRole('button', { name: /^Give Test Med$/ }).click();
    await page.getByRole('button', { name: 'Confirm Test Med given' }).click();

    await page.goto(`/pets/${petId}/medications/${medicationId}`);
    const deleteLink = page.getByRole('button', { name: /^Delete dose scheduled/ });

    page.once('dialog', (dialog) => dialog.dismiss());
    await deleteLink.click();
    await expect(page.getByText('No doses logged yet.')).toHaveCount(0);

    page.once('dialog', (dialog) => dialog.accept());
    await deleteLink.click();
    await expect(page.getByText('No doses logged yet.')).toBeVisible();
  } finally {
    await deleteCurrentAccount(page);
  }
});

test('deleting a habit log entry requires confirmation', async ({ page }) => {
  await signUpTestAccount(page, 'delete-log');
  try {
    const petId = await createTestPet(page, 'Delete Log Dog');
    await page.goto(`/pets/${petId}`);
    await page.getByRole('button', { name: 'Quick log food now, no details' }).click();

    await page.goto(`/pets/${petId}/history`);
    await page.getByRole('button', { name: 'Food', exact: true }).click();
    const deleteLink = page.getByRole('button', { name: /^Delete food entry from/ });

    page.once('dialog', (dialog) => dialog.dismiss());
    await deleteLink.click();
    await expect(page.getByText('No food entries yet.')).toHaveCount(0);

    page.once('dialog', (dialog) => dialog.accept());
    await deleteLink.click();
    await expect(page.getByText('No food entries yet.')).toBeVisible();
  } finally {
    await deleteCurrentAccount(page);
  }
});

test('removing a caregiver requires confirmation', async ({ page, browser }) => {
  await signUpTestAccount(page, 'remove-caregiver-owner');
  const petId = await createTestPet(page, 'Remove Caregiver Dog');

  // The invite's email must match the account that accepts it (enforced by
  // accept_pet_invite), so the caregiver account is created with this exact
  // address rather than a freshly generated one.
  const caregiverEmail = uniqueTestEmail('remove-caregiver-member');
  const token = await inviteCaregiver(page, petId, caregiverEmail);

  // A genuinely separate browser context, not just a second tab —
  // page.context().newPage() would share the owner's session's localStorage
  // (same origin, same context), so the sign-up form below would never even
  // render: Stack.Protected would see the owner's still-live session and
  // redirect straight past it.
  const caregiverContext = await browser.newContext();
  const caregiverPage = await caregiverContext.newPage();
  const caregiver = await signUpTestAccount(caregiverPage, 'remove-caregiver-member', caregiverEmail);
  // Accepting via RPC directly, not the accept-invite screen — that UI path
  // is blocked until preview_pet_invite ships (see accept-invite.spec.ts's
  // header comment for the full deployment-ordering note).
  await acceptInviteViaRpc(caregiver, token);
  await caregiverContext.close();

  try {
    await page.goto(`/pets/${petId}/sharing`);
    const removeLink = page.getByRole('button', { name: /^Remove .* as a caregiver$/ });
    await expect(removeLink).toBeVisible();

    page.once('dialog', (dialog) => dialog.dismiss());
    await removeLink.click();
    await expect(removeLink).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await removeLink.click();
    await expect(removeLink).toHaveCount(0);
  } finally {
    await deleteCurrentAccount(page); // owner — cascades the pet

    const cleanupContext = await browser.newContext();
    const cleanupPage = await cleanupContext.newPage();
    await signInTestAccount(cleanupPage, caregiver);
    await deleteCurrentAccount(cleanupPage);
    await cleanupContext.close();
  }
});

test('revoking a pending invite requires confirmation', async ({ page }) => {
  await signUpTestAccount(page, 'revoke-invite');
  try {
    const petId = await createTestPet(page, 'Revoke Invite Dog');
    await inviteCaregiver(page, petId, 'never-signs-up+e2e@example.com');

    await page.goto(`/pets/${petId}/sharing`);
    const revokeLink = page.getByRole('button', { name: /^Revoke invite for/ });

    page.once('dialog', (dialog) => dialog.dismiss());
    await revokeLink.click();
    await expect(revokeLink).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await revokeLink.click();
    await expect(revokeLink).toHaveCount(0);
  } finally {
    await deleteCurrentAccount(page);
  }
});
