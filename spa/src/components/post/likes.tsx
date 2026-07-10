import { useState } from 'react';
import useSWR from 'swr';
import { api, fetcher, type LikesData } from '../../api';

export function Likes({ slug }: { slug: string }) {
  const { data: likes, error, isLoading, mutate } = useSWR<LikesData>(api.likes.get(slug), fetcher);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleError, setToggleError] = useState(false);

  const toggleLike = async () => {
    if (!likes || isToggling) return;

    setIsToggling(true);
    setToggleError(false);
    // Optimistic UI update
    const prevLikes = likes;
    mutate(
      {
        ...likes,
        likeCount: likes.userHasLiked ? Math.max(0, likes.likeCount - 1) : likes.likeCount + 1,
        userHasLiked: !likes.userHasLiked,
      },
      false
    );

    try {
      const updatedLikes = await api.likes.toggle(slug);
      mutate(updatedLikes, false);

      // Track custom interaction event
      const rum = window.awsRum;
      if (rum) {
        rum.recordEvent('like_toggled', {
          slug,
          newStatus: updatedLikes.userHasLiked ? 'liked' : 'unliked',
          count: updatedLikes.likeCount,
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      mutate(prevLikes, false);
      void mutate();
      setToggleError(true);
      window.awsRum?.recordError(error);
    } finally {
      setIsToggling(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-3 mb-8 text-sm" role="alert">
        <span className="text-red-600 dark:text-red-400">Likes unavailable.</span>
        <button type="button" onClick={() => void mutate()} className="font-medium underline underline-offset-4">
          Retry
        </button>
      </div>
    );
  }

  if (isLoading || !likes) {
    return <div aria-label="Loading likes" className="h-6 w-12 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded" />;
  }

  return (
    <div className="flex items-center space-x-2 mb-8">
      <button
        onClick={toggleLike}
        disabled={isToggling}
        aria-pressed={likes.userHasLiked}
        aria-label={`${likes.userHasLiked ? 'Unlike' : 'Like'} this post, ${likes.likeCount} likes`}
        className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-colors ${
          likes.userHasLiked
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
        } disabled:opacity-50`}
      >
        <span>{likes.userHasLiked ? '❤️' : '🤍'}</span>
        <span className="font-medium">{likes.likeCount}</span>
      </button>
      <span className="text-sm text-neutral-500">Likes</span>
      {toggleError && <span className="text-sm text-red-600 dark:text-red-400" role="alert">Update failed.</span>}
    </div>
  );
}
