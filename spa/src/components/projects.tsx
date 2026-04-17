import { projects } from '../data/projects';
import { SEO } from './seo';

export function Projects() {
  return (
    <section className="w-full">
      <SEO 
        title="Projects" 
        description="A showcase of my recent work and open-source contributions."
        url="/projects"
      />
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">Projects</h1>
      <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-10">
        A showcase of my recent work and open-source contributions.
      </p>
      
      <div className="grid grid-cols-1 gap-8">
        {projects.map((project, index) => (
          <div
            key={index}
            className="group flex flex-col p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111010]"
          >
            <h2 className="text-2xl font-bold tracking-tight mb-4">
              {project.title}
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-lg leading-relaxed">
              {project.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
