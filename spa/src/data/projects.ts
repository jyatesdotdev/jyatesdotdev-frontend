export interface Project {
  title: string;
  description: string;
  technologies: string[];
}

export const projects: Project[] = [
  {
    title: 'Personal Portfolio',
    description:
      'A modern portfolio site built with Next.js, TypeScript, and Tailwind CSS. Features a blog, contact form, and project showcase.',
    technologies: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Vercel'],
  },
];
