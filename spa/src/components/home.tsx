import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from './seo';
import { libraryItems, type LibraryItem } from '../data/library';
import { getPosts } from '../blog/posts';

export function Home() {
  const [randomLibraryItems, setRandomLibraryItems] = useState<LibraryItem[]>([]);
  const latestPosts = getPosts().slice(0, 3);

  useEffect(() => {
    // Client-side randomization of library items
    const shuffled = [...libraryItems].sort(() => Math.random() - 0.5).slice(0, 3);
    setRandomLibraryItems(shuffled);
  }, []);

  return (
    <section className="w-full">
      <SEO 
        title="Jonathan Yates" 
        description="Software Development Engineer at Amazon. Passionate about software development, cloud technologies, and continuous learning." 
      />
      {/* Profile Section */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 lg:gap-10 mb-12">
        <div className="relative flex-shrink-0 w-48 sm:w-56 md:w-64">
          <img
            src="/images/profile-family.jpeg"
            alt="Profile picture"
            className="rounded-full object-cover w-full aspect-square transition-all duration-300"
          />
        </div>
        <div className="flex-grow max-w-none mt-4 md:mt-0">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Jonathan Yates</h1>
          <h2 className="text-neutral-500 dark:text-neutral-400 mb-4">
            Software Development Engineer at Amazon
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Passionate about software development, cloud technologies, and continuous learning.
            Currently focused on building scalable microservices and mentoring fellow developers.
          </p>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Latest Blog Posts */}
        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Latest Blog Posts</h2>
            <Link to="/blog" className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-sm transition-colors">
              View all posts →
            </Link>
          </div>
          <div className="space-y-4">
            {latestPosts.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all bg-white dark:bg-neutral-900/50"
              >
                <h3 className="font-semibold mb-1">{post.title}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">{post.summary}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Library Sampling */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">From the Library</h2>
            <Link to="/library" className="text-neutral-400 hover:text-neutral-300 text-sm">
              View library →
            </Link>
          </div>
          <div className="space-y-4">
            {randomLibraryItems.map((item, index) => (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all bg-white dark:bg-neutral-900/50"
              >
                <h3 className="font-medium mb-1">{item.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-6">Quick Links</h2>
          <div className="space-y-4">
            <Link
              to="/career"
              className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all bg-white dark:bg-neutral-900/50"
            >
              <h3 className="font-medium mb-1">View Career Timeline</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Explore my professional journey and achievements
              </p>
            </Link>
            <Link
              to="/contact"
              className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all bg-white dark:bg-neutral-900/50"
            >
              <h3 className="font-medium mb-1">Get in Touch</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Have a question or want to collaborate? Reach out!
              </p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
