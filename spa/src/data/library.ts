export interface LibraryItem {
  title: string;
  description: string;
  url: string;
  category: string;
  dateAdded: string;
}

export const libraryItems: LibraryItem[] = [
  {
    title: 'The Pragmatic Programmer',
    description:
      'A comprehensive guide to software development that covers everything from personal responsibility to practical coding techniques.',
    url: 'https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/',
    category: 'books',
    dateAdded: '2025-04-20',
  },
  {
    title: 'TypeScript Deep Dive',
    description:
      'A comprehensive guide to TypeScript, covering advanced types, compiler options, and best practices.',
    url: 'https://basarat.gitbook.io/typescript/',
    category: 'websites',
    dateAdded: '2025-04-20',
  },
  {
    title: 'Designing Data-Driven Applications',
    description:
      'An absolutely excellent book that is worth a read for any software engineer that touches distributed systems!',
    url: 'https://dataintensive.net',
    category: 'books',
    dateAdded: '2025-05-04',
  },
  {
    title: 'Distributed Services with Go',
    description:
      'A comprehensive guide to distributed systems with Go, and includes a practical guide to building microservices.',
    url: 'https://pragprog.com/titles/tjgo/distributed-services-with-go/',
    category: 'books',
    dateAdded: '2025-05-12',
  },
  {
    title: 'Algorithms, 4th Edition',
    description:
      'A comprehensive guide to data structures and algorithms, including a practical guide to building data structures.',
    url: 'https://algs4.cs.princeton.edu/home/',
    category: 'books',
    dateAdded: '2025-05-12',
  },
  {
    title: 'Practical Genetic Algorithms',
    description: 'A comprehensive guide to genetic algorithms, including a practical guide to building genetic algorithms.',
    url: 'https://onlinelibrary.wiley.com/doi/book/10.1002/0471671746',
    category: 'books',
    dateAdded: '2025-05-12',
  }
];
