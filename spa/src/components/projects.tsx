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
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
