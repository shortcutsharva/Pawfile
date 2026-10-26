export function isItemPending(
  pending: Set<string>,
  ...values: (string | null | undefined)[]
): boolean {
  return values.some((value) => Boolean(value && pending.has(value)));
}
