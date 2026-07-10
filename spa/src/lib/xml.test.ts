import { describe, expect, it } from 'vitest';
import { escapeXml } from './xml.js';

describe('escapeXml', () => {
  it('escapes XML text and attribute delimiters', () => {
    expect(escapeXml(`AWS & <friends> "quoted" 'value'`)).toBe(
      'AWS &amp; &lt;friends&gt; &quot;quoted&quot; &apos;value&apos;'
    );
  });

  it('stringifies non-string values', () => {
    expect(escapeXml(42)).toBe('42');
  });
});
