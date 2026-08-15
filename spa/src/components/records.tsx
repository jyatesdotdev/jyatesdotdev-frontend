import { Link } from 'react-router';
import { getRecords } from '../records/records';
import { SEO } from './seo';

export function Records() {
  const allRecords = getRecords();

  return (
    <section>
      <SEO
        title="Engineering Records"
        description="Engineering records: measurement-driven writeups of performance and systems work, with the numbers and the dead ends."
        url="/records"
      />
      <h1 className="font-semibold text-2xl mb-2 tracking-tighter">Engineering Records</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8">
        Measurement-driven records of systems work: what was tried, what it
        measured, what shipped, and what didn't work — with the numbers.
      </p>
      <div className="flex flex-col gap-6">
        {allRecords.map((record) => (
          <Link
            key={record.slug}
            to={`/records/${record.slug}`}
            className="group flex flex-col gap-1"
          >
            <p className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:underline">
              {record.title}
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {record.summary}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              {formatDate(record.publishedAt)}
            </p>
          </Link>
        ))}
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
