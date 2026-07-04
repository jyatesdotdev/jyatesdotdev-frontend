import { Link } from 'react-router';
import { SEO } from './seo';

export function NotFound() {
  return (
    <section>
      <SEO title="404 - Page Not Found" />
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">404 - Page Not Found</h1>
      <p className="mb-4">
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        Back to Home
      </Link>
    </section>
  );
}
