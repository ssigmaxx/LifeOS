// Dictionary entries are plain strings so the whole Dictionary can safely
// cross the Server->Client boundary. Interpolation happens here instead of
// via function-valued dictionary entries.

export function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}

export function pluralize(n: number, one: string, other: string): string {
  return formatTemplate(n === 1 ? one : other, { n });
}
