export function seededInteger(seed: string, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new RangeError('Expected integer bounds with min less than or equal to max.');
  }

  let state = 2166136261;
  for (const character of seed) {
    state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  }

  state = (state + 0x6d2b79f5) | 0;
  let value = state;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  const random = ((value ^ (value >>> 14)) >>> 0) / 4294967296;

  return min + Math.floor(random * (max - min + 1));
}
