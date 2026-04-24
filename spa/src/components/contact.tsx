import React, { useState } from 'react';
import { SEO } from './seo';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          website: (document.querySelector('input[name="website"]') as HTMLInputElement)?.value || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Error sending contact form:', error);
      setStatus('error');
      setErrorMessage('Failed to send message. Please try again later.');
      (window as any).awsRum?.recordError(error as Error);
    }
  };

  return (
    <section className="w-full max-w-2xl mx-auto py-8">
      <SEO 
        title="Contact" 
        description="Have a question or want to collaborate? Reach out!"
        url="/contact"
      />
      <h1 className="text-3xl font-bold tracking-tight mb-8">Get in Touch</h1>
      
      {status === 'success' ? (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 mb-8">
          <p className="font-medium">Message sent! I'll get back to you as soon as possible.</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 mb-8">
          <p className="font-medium">{errorMessage}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={5}
            className="w-full p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all resize-none"
            placeholder="How can I help you?"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full md:w-auto px-8 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {status === 'sending' ? 'Sending...' : 'Send Message'}
        </button>
      </form>

    </section>
  );
}
