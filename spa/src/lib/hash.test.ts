import { describe, it, expect } from 'vitest';
import { fnv1aHex } from './hash';

describe('fnv1aHex', () => {
  it('matches known FNV-1a 32-bit vectors', () => {
    // Standard FNV-1a test vectors (32-bit)
    expect(fnv1aHex('')).toBe('811c9dc5');
    expect(fnv1aHex('a')).toBe('e40c292c');
    expect(fnv1aHex('foobar')).toBe('bf9cf968');
  });

  it('is deterministic and always 8 hex chars', () => {
    const source = '@startuml\nA -> B\n@enduml';
    expect(fnv1aHex(source)).toBe(fnv1aHex(source));
    expect(fnv1aHex(source)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('produces different digests for different inputs', () => {
    expect(fnv1aHex('@startuml\nA -> B\n@enduml')).not.toBe(fnv1aHex('@startuml\nB -> A\n@enduml'));
  });
});
