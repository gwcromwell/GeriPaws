/** The `catch (err) { setError(err instanceof Error ? err.message : '...') }`
 * pattern repeated across nearly every screen's load/save handler, pulled
 * out once so it's consistent and unit-testable — see use-screen-load.ts,
 * which is the main thing built on top of it. */
export function toErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  return err instanceof Error ? err.message : fallback;
}
