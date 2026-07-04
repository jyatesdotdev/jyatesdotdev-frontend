import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const BLOG_DIR = path.join(process.cwd(), 'src/blog/posts');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w-]+/g, '')   // Remove all non-word chars
    .replace(/--+/g, '-');      // Replace multiple - with single -
}

rl.question('Post Title: ', (title) => {
  rl.question('Post Summary: ', (summary) => {
    rl.question('Tags (comma separated): ', (tagsInput) => {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const slug = slugify(title);
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const content = `---
title: "${title}"
publishedAt: "${date}"
summary: "${summary}"
tags: [${tags.map(t => `"${t}"`).join(', ')}]
---

# ${title}

Start writing your content here...
`;
      
      const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
      
      if (fs.existsSync(filePath)) {
        console.error(`❌ Error: A post with the slug "${slug}" already exists.`);
      } else {
        fs.writeFileSync(filePath, content);
        console.log(`\n✅ Created new post: ${filePath}`);
        console.log(`\nYou can start editing the file to add your content.`);
      }
      
      rl.close();
    });
  });
});
