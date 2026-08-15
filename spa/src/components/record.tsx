import { useParams } from 'react-router';
import { getRecordBySlug } from '../records/records';
import { MDXComponents } from './mdx';
import { SEO } from './seo';

export function Record() {
  const { slug } = useParams<{ slug: string }>();
  const record = slug ? getRecordBySlug(slug) : undefined;

  if (!record) {
    return (
      <section>
        <SEO title="Record not found" />
        <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Record not found</h1>
      </section>
    );
  }

  const RecordContent = record.default;

  return (
    <section>
      <SEO
        title={record.metadata.title}
        description={record.metadata.summary}
        url={`/records/${slug}`}
        type="article"
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: record.metadata.title,
            datePublished: record.metadata.publishedAt,
            dateModified: record.metadata.publishedAt,
            description: record.metadata.summary,
            url: `https://jyates.dev/records/${slug}`,
            author: {
              '@type': 'Person',
              name: 'Jonathan Yates',
            },
          }).replace(/</g, '\\u003c'),
        }}
      />
      <h1 className="title font-semibold text-2xl tracking-tighter">
        {record.metadata.title}
      </h1>
      <div className="flex justify-between items-center mt-2 mb-8 text-sm">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(record.metadata.publishedAt)}
        </p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <RecordContent components={MDXComponents} />
      </article>
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
