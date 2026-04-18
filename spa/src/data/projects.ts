export interface Project {
  title: string;
  description: string;
  technologies: string[];
  github?: string;
}

export const projects: Project[] = [
  {
    title: 'Personal Portfolio',
    description:
      'A fully serverless portfolio and blog built on AWS. React SPA with prerendered MDX blog posts, Go Lambda API for interactive features (likes, comments, contact form), DynamoDB for storage, and CloudFront for global delivery. Infrastructure managed with Terraform and deployed via GitHub Actions OIDC.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Go', 'AWS Lambda', 'DynamoDB', 'CloudFront', 'Terraform'],
    github: 'https://github.com/jyatesdotdev',
  },
];
