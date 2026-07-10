import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api';
import { SEO } from './seo';

export function SubscriptionConfirmation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'confirming' | 'success' | 'error'>(
    token ? 'confirming' : 'error'
  );
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    if (!token) return;

    api.subscriptions.confirm(token).then(
      () => setStatus('success'),
      (error) => {
        setStatus('error');
        window.awsRum?.recordError(error);
      }
    );
  }, [token]);

  return (
    <section className="w-full max-w-2xl mx-auto py-12">
      <SEO
        title="Confirm subscription"
        description="Confirm your jyates.dev update preferences."
        url="/subscribe/confirm"
      />
      <meta name="robots" content="noindex,nofollow" />

      {status === 'confirming' ? (
        <>
          <h1 className="text-3xl font-bold tracking-tight mb-4">Confirming subscription</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Verifying your confirmation link...</p>
        </>
      ) : status === 'success' ? (
        <>
          <h1 className="text-3xl font-bold tracking-tight mb-4">Subscription confirmed</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Your update preferences are active. Every notification includes an unsubscribe link.
          </p>
          <Link to="/blog" className="font-medium underline underline-offset-4">
            Read the latest posts
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold tracking-tight mb-4">Confirmation link unavailable</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            This link is invalid or has expired. Request a new confirmation from the Blog or Projects page.
          </p>
          <Link to="/blog" className="font-medium underline underline-offset-4">
            Return to the blog
          </Link>
        </>
      )}
    </section>
  );
}
