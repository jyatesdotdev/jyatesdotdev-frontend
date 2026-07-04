import { useSearchParams, Link } from 'react-router-dom';
import { getPosts } from '../blog/posts';
import { SEO } from './seo';

const POSTS_PER_PAGE = 10;

export function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get('tag');
  const page = parseInt(searchParams.get('page') || '1', 10);

  const allPosts = getPosts();

  // Get all unique tags
  const allTags = Array.from(new Set(allPosts.flatMap(post => post.tags))).sort();

  const filteredPosts = tag 
    ? allPosts.filter(post => post.tags.includes(tag))
    : allPosts;

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (page - 1) * POSTS_PER_PAGE,
    page * POSTS_PER_PAGE
  );

  const handleTagClick = (clickedTag: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (tag === clickedTag) {
      newParams.delete('tag');
    } else {
      newParams.set('tag', clickedTag);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
    window.scrollTo(0, 0);
  };

  return (
    <section>
      <SEO 
        title="Blog" 
        description="Read my latest blog posts on software development, cloud technologies, and more."
        url="/blog"
      />
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Blog</h1>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-8">
        {allTags.map(t => (
          <button
            key={t}
            onClick={() => handleTagClick(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              tag === t 
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' 
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {paginatedPosts.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="flex flex-col space-y-1 mb-4 group"
          >
            <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center space-y-1 md:space-y-0">
              <p className="text-neutral-900 dark:text-neutral-100 tracking-tight font-medium group-hover:underline">
                {post.title}
              </p>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm tabular-nums">
                {formatDate(post.publishedAt)}
              </p>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              {post.summary}
            </p>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <button
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
            className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-30 disabled:hover:text-neutral-600 dark:disabled:hover:text-neutral-400 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm text-neutral-500">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-30 disabled:hover:text-neutral-600 dark:disabled:hover:text-neutral-400 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}


function formatDate(date: string) {
  const targetDate = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - targetDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) {
    return `${diffYears}y ago`;
  }
  if (diffMonths > 0) {
    return `${diffMonths}mo ago`;
  }
  if (diffDays > 0) {
    return `${diffDays}d ago`;
  }
  return 'today';
}
