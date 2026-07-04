// FNV-1a 32-bit hash, hex-encoded.
// Shared by scripts/generate-diagrams.js (Node) and src/components/plantuml.tsx
// (browser bundle) — keep it plain JS so Node can import it directly.
// Types live in hash.d.ts.

/**
 * @param {string} input
 * @returns {string} 8-char lowercase hex digest
 */
export function fnv1aHex(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
