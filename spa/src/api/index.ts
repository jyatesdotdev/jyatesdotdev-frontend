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

const visitorHeaders = (): Record<string, string> => ({
  'X-Visitor-Id': getVisitorId(),
});

export const fetcher = async (url: string) => {
  const res = await fetch(url, { headers: visitorHeaders() });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error('An error occurred while fetching the data.');
  }
  return res.json();
};

export const api = {
  likes: {
    get: (slug: string) => `/api/v1/likes?slug=${slug}`,
    toggle: async (slug: string): Promise<LikesData> => {
      const res = await fetch('/api/v1/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...visitorHeaders() },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) throw new Error('Failed to toggle like');
      return res.json();
    },
  },
  comments: {
    get: (slug: string) => `/api/v1/comments?slug=${slug}`,
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
      if (!res.ok) throw new Error('Failed to submit comment');
      return res.json();
    },
    toggleLike: async (commentId: string, slug: string): Promise<CommentData> => {
      const res = await fetch(`/api/v1/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...visitorHeaders() },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) throw new Error('Failed to toggle comment like');
      return res.json();
    },
  },
  admin: {
    getComments: (statusFilter: string) => `/api/v1/admin/comments?status=${statusFilter}`,
    updateStatus: async (commentId: string, slug: string, newStatus: 'approved' | 'rejected') => {
      const res = await fetch(`/api/v1/admin/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update comment status');
    },
    deleteComment: async (commentId: string, slug: string) => {
      const res = await fetch(`/api/v1/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) throw new Error('Failed to delete comment');
    },
  },
  contact: {
    submit: async (data: { name: string; email: string; message: string; token: string }) => {
      const res = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to submit contact form');
    }
  }
};
