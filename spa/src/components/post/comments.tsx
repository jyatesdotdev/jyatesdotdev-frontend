import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { api, fetcher, type CommentData } from '../../api';

function formatDate(date: string) {
  const targetDate = new Date(date);
  return targetDate.toLocaleString('en-us', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function Comments({ slug }: { slug: string }) {
  const { data: comments, mutate } = useSWR<CommentData[]>(api.comments.get(slug), fetcher);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');
    const formData = new FormData(e.currentTarget);

    try {
      await api.comments.create({
        slug,
        authorName: formData.get('authorName') as string,
        authorEmail: formData.get('authorEmail') as string,
        content: formData.get('content') as string,
        website: formData.get('website') as string,
      });

      (e.target as HTMLFormElement).reset();
      setStatus('success');
      mutate();
    } catch (err) {
      setStatus('error');
      (window as any).awsRum?.recordError(err as Error);
    }
    setIsSubmitting(false);
  };

  if (!comments) return null;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold tracking-tighter">Comments</h2>
      
      {status === 'success' && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200">
          <p className="text-sm font-medium">Comment posted!</p>
        </div>
      )}

      {status === 'error' && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
          <p className="text-sm font-medium">Error submitting comment. Please try again later.</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            required
            name="authorName"
            placeholder="Name"
            className="w-full px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          />
          <input
            required
            type="email"
            name="authorEmail"
            placeholder="Email"
            className="w-full px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          />
        </div>
        <textarea
          required
          name="content"
          placeholder="Add a comment..."
          rows={4}
          className="w-full px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
        />
        <button
          disabled={isSubmitting}
          className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isSubmitting ? 'Submitting...' : 'Post Comment'}
        </button>
      </form>

      <div className="space-y-6">
        {comments.map((comment) => (
          <CommentItem 
            key={comment.id} 
            initialComment={comment} 
            slug={slug} 
            onLikeToggled={() => mutate()} 
          />
        ))}
      </div>
    </div>
  );
}

function CommentItem({ 
  initialComment, 
  slug, 
  onLikeToggled 
}: { 
  initialComment: CommentData; 
  slug: string;
  onLikeToggled: () => void;
}) {
  const [comment, setComment] = useState(initialComment);

  const toggleLike = async () => {
    // Optimistic Update
    const prevComment = comment;
    setComment({
      ...comment,
      likeCount: comment.userHasLiked ? comment.likeCount - 1 : comment.likeCount + 1,
      userHasLiked: !comment.userHasLiked
    });

    try {
      await api.comments.toggleLike(comment.id, slug);
      onLikeToggled();
    } catch (err) {
      // Revert on error
      setComment(prevComment);
      (window as any).awsRum?.recordError(err as Error);
    }
  };

  useEffect(() => {
    setComment(initialComment);
  }, [initialComment]);

  return (
    <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800">
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold text-sm">{comment.authorName}</span>
        <span className="text-xs text-neutral-500">{formatDate(comment.createdAt)}</span>
      </div>
      <p className="text-sm mb-4">{comment.content}</p>
      <button
        onClick={toggleLike}
        className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
          comment.userHasLiked
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
        }`}
      >
        <span>{comment.userHasLiked ? '❤️' : '🤍'}</span>
        <span className="font-medium">{comment.likeCount || 0}</span>
      </button>
    </div>
  );
}
