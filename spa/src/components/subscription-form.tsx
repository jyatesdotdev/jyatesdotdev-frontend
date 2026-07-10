import { useState } from 'react';
import { api } from '../api';

export type SubscriptionTopic = 'blog' | 'projects';

interface SubscriptionFormProps {
  defaultTopics: SubscriptionTopic[];
}

const topicLabels: Record<SubscriptionTopic, string> = {
  blog: 'Blog posts',
  projects: 'Projects',
};

export function SubscriptionForm({ defaultTopics }: SubscriptionFormProps) {
  const [email, setEmail] = useState('');
  const [topics, setTopics] = useState<Record<SubscriptionTopic, boolean>>({
    blog: defaultTopics.includes('blog'),
    projects: defaultTopics.includes('projects'),
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  function toggleTopic(topic: SubscriptionTopic) {
    setTopics((current) => ({ ...current, [topic]: !current[topic] }));
    setStatus('idle');
    setMessage('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = (Object.keys(topics) as SubscriptionTopic[]).filter((topic) => topics[topic]);
    if (selected.length === 0) {
      setStatus('error');
      setMessage('Select at least one update type.');
      return;
    }

    setStatus('submitting');
    setMessage('');
    const website = new FormData(event.currentTarget).get('website') as string;
    try {
      await api.subscriptions.create({ email, topics: selected, website });
      setStatus('success');
      setMessage('Confirmation email sent. Check your inbox to finish subscribing.');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to request a subscription.');
      window.awsRum?.recordError(error);
    }
  }

  return (
    <section aria-labelledby="subscription-heading" className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800">
      <div className="max-w-2xl">
        <h2 id="subscription-heading" className="text-xl font-semibold mb-2">
          Get new work by email
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Choose updates to add. Existing subscriptions stay active, and each address must be confirmed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            name="website"
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="subscription-email" className="sr-only">
                Email address
              </label>
              <input
                id="subscription-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setStatus('idle');
                  setMessage('');
                }}
                required
                maxLength={254}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full h-11 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black outline-none focus:ring-2 focus:ring-neutral-500"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="h-11 px-6 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {status === 'submitting' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </div>

          <fieldset>
            <legend className="text-sm font-medium mb-2">Updates</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {(Object.keys(topicLabels) as SubscriptionTopic[]).map((topic) => (
                <label key={topic} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="topics"
                    value={topic}
                    checked={topics[topic]}
                    onChange={() => toggleTopic(topic)}
                    className="size-4 accent-neutral-900 dark:accent-neutral-100"
                  />
                  {topicLabels[topic]}
                </label>
              ))}
            </div>
          </fieldset>

          <p
            aria-live="polite"
            className={`min-h-5 text-sm ${
              status === 'error'
                ? 'text-red-700 dark:text-red-400'
                : status === 'success'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-neutral-500'
            }`}
          >
            {message}
          </p>
        </form>
      </div>
    </section>
  );
}
