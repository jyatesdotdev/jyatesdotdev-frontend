import useSWR from 'swr';
import { api, fetcher, type LikesData } from '../../api';

export function Likes({ slug }: { slug: string }) {
  const { data: likes, mutate } = useSWR<LikesData>(api.likes.get(slug), fetcher);

  const toggleLike = async () => {
    // Optimistic UI update
    const prevLikes = likes;
    if (likes) {
      mutate(
        { 
          ...likes, 
          likeCount: likes.userHasLiked ? likes.likeCount - 1 : likes.likeCount + 1,
          userHasLiked: !likes.userHasLiked 
        }, 
        false
      );
    }

    try {
      const updatedLikes = await api.likes.toggle(slug);
      mutate(updatedLikes, false);
      
      // Track custom interaction event
      const rum = (window as any).awsRum;
      if (rum) {
        rum.recordEvent('like_toggled', {
          slug,
          newStatus: updatedLikes.userHasLiked ? 'liked' : 'unliked',
          count: updatedLikes.likeCount
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      if (prevLikes) mutate(prevLikes, false);
      (window as any).awsRum?.recordError(error as Error);
    }
  };

  if (!likes) return <div className="h-6 w-12 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded" />;

  return (
    <div className="flex items-center space-x-2 mb-8">
      <button
        onClick={toggleLike}
        className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-colors ${
          likes.userHasLiked
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
        }`}
      >
        <span>{likes.userHasLiked ? '❤️' : '🤍'}</span>
        <span className="font-medium">{likes.likeCount}</span>
      </button>
      <span className="text-sm text-neutral-500">Likes</span>
    </div>
  );
}
