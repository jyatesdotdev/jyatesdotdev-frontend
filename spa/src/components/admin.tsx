import { useState } from 'react';
import useSWR from 'swr';
import { SEO } from './seo';
import { api, fetcher, type AdminCommentData } from '../api';

type StatusFilter = 'pending' | 'approved' | 'rejected';

export function Admin() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const { data: comments, error, mutate, isLoading } = useSWR<AdminCommentData[]>(
    api.admin.getComments(statusFilter), 
    fetcher
  );

  const updateStatus = async (commentId: string, slug: string, newStatus: 'approved' | 'rejected') => {
    // Optimistic UI update
    if (comments) {
      mutate(comments.filter(c => c.id !== commentId), false);
    }
    
    try {
      await api.admin.updateStatus(commentId, slug, newStatus);
      mutate();
    } catch (err) {
      alert('An error occurred while updating status.');
      mutate(); // Revert
      (window as any).awsRum?.recordError(err as Error);
    }
  };

  const deleteComment = async (commentId: string, slug: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    if (comments) {
      mutate(comments.filter(c => c.id !== commentId), false);
    }

    try {
      await api.admin.deleteComment(commentId, slug);
      mutate();
    } catch (err) {
      alert('An error occurred while deleting comment.');
      mutate(); // Revert
      (window as any).awsRum?.recordError(err as Error);
    }
  };

  return (
    <section>
      <SEO title="Admin Dashboard" />
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Admin Dashboard</h1>
      
      <div className="flex space-x-4 mb-8">
        {(['pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-md capitalize transition-colors ${
              statusFilter === status
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 w-full bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-500">{error.message || 'An error occurred while fetching comments.'}</p>
      ) : !comments || comments.length === 0 ? (
        <p className="text-neutral-500">No {statusFilter} comments found.</p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={`${comment.slug}-${comment.id}`} className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-semibold block">{comment.authorName}</span>
                  <span className="text-xs text-neutral-500">{comment.authorEmail} | {comment.ipAddress}</span>
                  <span className="text-xs text-neutral-500 block">Post: {comment.slug}</span>
                </div>
                <span className="text-xs text-neutral-500">{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm mb-4">{comment.content}</p>
              <div className="flex space-x-2">
                {statusFilter !== 'approved' && (
                  <button
                    onClick={() => updateStatus(comment.id, comment.slug, 'approved')}
                    className="text-xs px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
                  >
                    Approve
                  </button>
                )}
                {statusFilter !== 'rejected' && (
                  <button
                    onClick={() => updateStatus(comment.id, comment.slug, 'rejected')}
                    className="text-xs px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                  >
                    Reject
                  </button>
                )}
                <button
                  onClick={() => deleteComment(comment.id, comment.slug)}
                  className="text-xs px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
