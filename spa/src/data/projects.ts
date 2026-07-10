export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  github?: string;
}

export const projects: Project[] = [
  {
    id: 'personal-portfolio',
    title: 'Personal Portfolio',
    description:
      'A fully serverless portfolio and blog built on AWS. React SPA with prerendered MDX blog posts, Go Lambda API for interactive features (likes, comments, contact form), DynamoDB for storage, and CloudFront for global delivery. Infrastructure managed with Terraform and deployed via GitHub Actions OIDC.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Go', 'AWS Lambda', 'DynamoDB', 'CloudFront', 'Terraform'],
    github: 'https://github.com/jyatesdotdev',
  },
  {
    id: 'project-templates',
    title: 'Comprehensive Project Templates',
    description:
      'A collection of production-ready project templates across eight languages. Each includes build tooling, testing, security scanning, CLI examples, and Docker support — designed to eliminate boilerplate when starting new projects.',
    technologies: ['Go', 'Rust', 'Python', 'TypeScript', 'C', 'C++', 'Java', 'Swift'],
    github: 'https://github.com/jyatesdotdev?tab=repositories&q=comprehensive-template',
  },
  {
    id: 'toggl-cmder',
    title: 'toggl-cmder',
    description:
      'A command-line tool for managing Toggl time tracking. Features fuzzy regex matching to find and start timers without needing exact names.',
    technologies: ['Python', 'CLI', 'REST API'],
    github: 'https://github.com/jyatesdotdev/toggl-cmder',
  },
  {
    id: 'advent-of-code',
    title: 'Advent of Code',
    description:
      'Solutions to Advent of Code challenges, organized by year and day.',
    technologies: ['Python'],
    github: 'https://github.com/jyatesdotdev/aoc',
  },
];
