import { useState } from 'react';
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
  const { data: comments, error, isLoading, mutate } = useSWR<CommentData[]>(api.comments.get(slug), fetcher);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');
    setSubmitError('');
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await api.comments.create({
        slug,
        authorName: formData.get('authorName') as string,
        authorEmail: formData.get('authorEmail') as string,
        content: formData.get('content') as string,
        website: formData.get('website') as string,
      });

      form.reset();
      setStatus('success');
      void mutate();
    } catch (err) {
      setStatus('error');
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit comment. Please try again later.');
      window.awsRum?.recordError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold tracking-tighter">Comments</h2>
      
      {status === 'success' && (
        <div role="status" className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200">
          <p className="text-sm font-medium">Comment posted!</p>
        </div>
      )}

      {status === 'error' && (
        <div role="alert" className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
          <p className="text-sm font-medium">{submitError}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            required
            name="authorName"
            maxLength={100}
            placeholder="Name"
            className="w-full px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          />
          <input
            required
            type="email"
            name="authorEmail"
            maxLength={254}
            placeholder="Email"
            className="w-full px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          />
        </div>
        <textarea
          required
          name="content"
          maxLength={5000}
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
        {error && (
          <div className="flex items-center gap-3 text-sm" role="alert">
            <span className="text-red-600 dark:text-red-400">Comments unavailable.</span>
            <button type="button" onClick={() => void mutate()} className="font-medium underline underline-offset-4">
              Retry
            </button>
          </div>
        )}
        {isLoading && !error && <div aria-label="Loading comments" className="h-20 bg-neutral-100 dark:bg-neutral-900 animate-pulse rounded" />}
        {!isLoading && !error && comments?.length === 0 && (
          <p className="text-sm text-neutral-500">No comments yet.</p>
        )}
        {comments?.map((comment) => (
          <CommentItem 
            key={comment.id} 
            initialComment={comment} 
            slug={slug} 
            onLikeToggled={() => void mutate()}
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
  const [isToggling, setIsToggling] = useState(false);
  const [likeError, setLikeError] = useState(false);

  const toggleLike = async () => {
    if (isToggling) return;

    setIsToggling(true);
    setLikeError(false);
    // Optimistic Update
    const prevComment = comment;
    setComment({
      ...comment,
      likeCount: comment.userHasLiked ? Math.max(0, comment.likeCount - 1) : comment.likeCount + 1,
      userHasLiked: !comment.userHasLiked,
    });

    try {
      await api.comments.toggleLike(comment.id, slug);
      onLikeToggled();
    } catch (err) {
      // Revert on error
      setComment(prevComment);
      setLikeError(true);
      onLikeToggled();
      window.awsRum?.recordError(err);
    } finally {
      setIsToggling(false);
    }
  };

  // Re-sync local optimistic state when SWR revalidation hands us a fresh
  // comment object (React's "adjust state during render" pattern).
  const [prevInitial, setPrevInitial] = useState(initialComment);
  if (initialComment !== prevInitial) {
    setPrevInitial(initialComment);
    setComment(initialComment);
  }

  return (
    <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800">
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold text-sm">{comment.authorName}</span>
        <span className="text-xs text-neutral-500">{formatDate(comment.createdAt)}</span>
      </div>
      <p className="text-sm mb-4">{comment.content}</p>
      <button
        onClick={toggleLike}
        disabled={isToggling}
        aria-pressed={comment.userHasLiked}
        aria-label={`${comment.userHasLiked ? 'Unlike' : 'Like'} this comment, ${comment.likeCount || 0} likes`}
        className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
          comment.userHasLiked
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
        } disabled:opacity-50`}
      >
        <span>{comment.userHasLiked ? '❤️' : '🤍'}</span>
        <span className="font-medium">{comment.likeCount || 0}</span>
      </button>
      {likeError && <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">Update failed.</p>}
    </div>
  );
}
