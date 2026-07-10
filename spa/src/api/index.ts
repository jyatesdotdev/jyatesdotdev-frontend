import { getVisitorId } from './visitor';

export interface LikesData {
  slug: string;
  likeCount: number;
  userHasLiked: boolean;
}

export interface CommentData {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  likeCount: number;
  userHasLiked: boolean;
}

export interface AdminCommentData {
  id: string;
  slug: string;
  authorName: string;
  authorEmail: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  ipAddress: string;
}

export interface GeoData {
  country: string;
  countryName?: string;
  city?: string;
  timeZone?: string;
  latitude?: string;
  longitude?: string;
}

export interface CountryVisits {
  country: string;
  countryName: string;
  count: number;
}

export interface VisitStats {
  total: number;
  countries: CountryVisits[];
  you?: string;
}

const visitorHeaders = (): Record<string, string> => ({
  'X-Visitor-Id': getVisitorId(),
});

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function requireOk(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) return;

  const messages: Partial<Record<number, string>> = {
    401: 'Unauthorized',
    409: 'This interaction changed. Please try again.',
    413: 'The submitted content is too large.',
    429: 'Too many requests. Please try again later.',
  };
  throw new ApiError(messages[response.status] ?? fallbackMessage, response.status);
}

function query(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: visitorHeaders() });
  await requireOk(res, 'Unable to load data. Please try again.');
  return res.json() as Promise<T>;
};

export const api = {
  likes: {
    get: (slug: string) => `/api/v1/likes?${query({ slug })}`,
    toggle: async (slug: string): Promise<LikesData> => {
      const res = await fetch('/api/v1/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...visitorHeaders() },
        body: JSON.stringify({ slug }),
      });
      await requireOk(res, 'Failed to update like. Please try again.');
      return res.json();
    },
  },
  comments: {
    get: (slug: string) => `/api/v1/comments?${query({ slug })}`,
    create: async (data: {
      slug: string;
      authorName: string;
      authorEmail: string;
      content: string;
      website?: string;
    }) => {
      const res = await fetch('/api/v1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...visitorHeaders() },
        body: JSON.stringify(data),
      });
      await requireOk(res, 'Failed to submit comment. Please try again later.');
      return res.json();
    },
    toggleLike: async (commentId: string, slug: string): Promise<void> => {
      const res = await fetch(`/api/v1/comments/${encodeURIComponent(commentId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...visitorHeaders() },
        body: JSON.stringify({ slug }),
      });
      await requireOk(res, 'Failed to update comment like. Please try again.');
    },
  },
  contact: {
    submit: async (data: { name: string; email: string; message: string; website?: string }) => {
      const res = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...visitorHeaders() },
        body: JSON.stringify(data),
      });
      await requireOk(res, 'Failed to send message. Please try again later.');
    },
  },
  subscriptions: {
    create: async (data: {
      email: string;
      topics: Array<'blog' | 'projects'>;
      website?: string;
    }): Promise<void> => {
      const res = await fetch('/api/v1/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...visitorHeaders() },
        body: JSON.stringify(data),
      });
      await requireOk(res, 'Unable to request a subscription. Please try again later.');
    },
    confirm: async (token: string): Promise<void> => {
      const res = await fetch('/api/v1/subscriptions/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...visitorHeaders() },
        body: JSON.stringify({ token }),
      });
      await requireOk(res, 'This confirmation link is invalid or has expired.');
    },
  },
  geo: {
    get: () => '/api/v1/geo',
  },
  visits: {
    get: () => '/api/v1/visits',
    record: async (): Promise<void> => {
      // Fire-and-forget beacon; the backend no-ops without geo headers
      await fetch('/api/v1/visits', { method: 'POST' });
    },
  },
  admin: {
    getComments: (statusFilter: string) => `/api/v1/admin/comments?${query({ status: statusFilter })}`,
    updateStatus: async (commentId: string, slug: string, newStatus: 'approved' | 'rejected') => {
      const res = await fetch(`/api/v1/admin/comments/${encodeURIComponent(commentId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, status: newStatus }),
      });
      await requireOk(res, 'Failed to update comment status.');
    },
    deleteComment: async (commentId: string, slug: string) => {
      const res = await fetch(`/api/v1/admin/comments/${encodeURIComponent(commentId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      await requireOk(res, 'Failed to delete comment.');
    },
  },
};
