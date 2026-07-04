import { useParams } from 'react-router';
import { getPostBySlug } from '../blog/posts';
import { MDXComponents } from './mdx';
import { SEO } from './seo';
import { Likes } from './post/likes';
import { Comments } from './post/comments';

export function Post() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <section>
        <SEO title="Post not found" />
        <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Post not found</h1>
      </section>
    );
  }

  const PostContent = post.default;

  return (
    <section>
      <SEO 
        title={post.metadata.title}
        description={post.metadata.summary}
        url={`/blog/${slug}`}
        type="article"
        image={post.metadata.image}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.metadata.title,
            datePublished: post.metadata.publishedAt,
            dateModified: post.metadata.publishedAt,
            description: post.metadata.summary,
            url: `https://jyates.dev/blog/${slug}`,
            author: {
              '@type': 'Person',
              name: 'Jonathan Yates',
            },
          }).replace(/</g, '\\u003c'),
        }}
      />
      <h1 className="title font-semibold text-2xl tracking-tighter">
        {post.metadata.title}
      </h1>
      <div className="flex justify-between items-center mt-2 mb-8 text-sm">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(post.metadata.publishedAt)}
        </p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <PostContent components={MDXComponents} />
      </article>

      <div className="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800">
        <Likes slug={slug!} />
        <Comments slug={slug!} />
      </div>
    </section>
  );
}

function formatDate(date: string) {
  const targetDate = new Date(date);
  return targetDate.toLocaleString('en-us', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
