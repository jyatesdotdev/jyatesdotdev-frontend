import { describe, expect, it } from 'vitest';
import { api } from './index';

describe('API URLs', () => {
  it('encodes query-string values', () => {
    expect(api.likes.get('spaces & symbols')).toBe('/api/v1/likes?slug=spaces+%26+symbols');
    expect(api.comments.get('a/b')).toBe('/api/v1/comments?slug=a%2Fb');
  });

  it('encodes path segments', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

    await api.comments.toggleLike('comment/with/slashes', 'post');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/comments/comment%2Fwith%2Fslashes/like',
      expect.objectContaining({ method: 'POST' })
    );
    fetchMock.mockRestore();
  });
});
