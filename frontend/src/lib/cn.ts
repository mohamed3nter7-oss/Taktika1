/**
 * Join class names, dropping falsy entries.
 *
 * Deliberately not `tailwind-merge`: nothing in `domain/` restyles a `ui/`
 * primitive, so there are no conflicting utilities to resolve. If a component
 * ever needs conflict resolution, that is the signal it is reaching past the
 * primitive's props rather than a signal to add the dependency.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
