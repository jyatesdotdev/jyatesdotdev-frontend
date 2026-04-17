import { Timeline } from './timeline';
import { careerItems } from '../data/career';
import { SEO } from './seo';

export function Career() {
  return (
    <section className="w-full">
      <SEO 
        title="Career" 
        description="A chronological overview of my professional journey and key achievements."
        url="/career"
      />
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">Career Timeline</h1>
      <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-10">
        A chronological overview of my professional journey and key achievements.
      </p>
      <Timeline items={careerItems} />
    </section>
  );
}
