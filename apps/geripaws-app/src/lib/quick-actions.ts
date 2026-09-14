import * as QuickActions from 'expo-quick-actions';
import type { RouterAction } from 'expo-quick-actions/router';

/** Home Screen long-press shortcuts have no way to know which dog you mean —
 * unlike the notification actions in notification-actions.ts, which always
 * know exactly which pet a specific due reminder belongs to. These always
 * point at whichever dog was viewed most recently, and land on the (still
 * pre-fillable) log form rather than auto-submitting, since there's more
 * ambiguity here than a confirmed due item.
 *
 * Shaped as RouterAction (params.href) rather than plain Action so
 * useQuickActionRouting, wired up in (app)/_layout.tsx, handles the
 * navigation itself — see expo-quick-actions/router. */
export function buildQuickActions(petId: string): RouterAction[] {
  return [
    { id: 'log-walk', title: 'Log walk', icon: 'symbol:figure.walk', params: { href: `/pets/${petId}/log/walk` } },
    {
      id: 'log-incident',
      title: 'Log incident',
      icon: 'symbol:exclamationmark.triangle',
      params: { href: `/pets/${petId}/log/incident` },
    },
  ];
}

/** Called whenever a pet's Today screen is viewed — keeps the Home Screen
 * quick actions pointed at the dog most recently looked at. iOS persists
 * shortcut items at the OS level once set, so there's nothing to restore on
 * a cold launch — they simply carry over from whenever this last ran.
 * Best-effort: quick actions are a convenience and should never block on or
 * interrupt whatever screen called this. */
export async function recordLastViewedPet(petId: string): Promise<void> {
  try {
    await QuickActions.setItems(buildQuickActions(petId));
  } catch {
    // best-effort
  }
}
