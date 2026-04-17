import { libraryItems } from '../data/library';
import { SEO } from './seo';

export function Library() {
  return (
    <section className="w-full">
      <SEO 
        title="Library" 
        description="A curated collection of books, articles, and resources that have shaped my perspective on software and beyond."
        url="/library"
      />
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">Library</h1>
      <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-10">
        A curated collection of books, articles, and resources that have shaped my perspective on software and beyond.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {libraryItems.map((item, index) => (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all bg-white dark:bg-[#111010]"
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold tracking-tight group-hover:text-blue-500 transition-colors">
                {item.title}
              </h2>
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 border border-neutral-200 dark:border-neutral-800 px-2 py-1 rounded">
                {item.category}
              </span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 flex-grow">
              {item.description}
            </p>
            <div className="mt-6 flex items-center text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors">
              <span>Read more</span>
              <svg 
                className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
