import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { escapeXml } from '../src/lib/xml.js';

const BASE_URL = 'https://jyates.dev';
const BLOG_DIR = path.join(process.cwd(), 'src/blog/posts');
const BUILD_DIR = path.join(process.cwd(), 'build/client');

function getBlogPosts() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR);
  return files
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => {
      const slug = file.replace('.mdx', '');
      const content = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
      const { data } = matter(content);
      return {
        slug,
        title: data.title,
        publishedAt: data.publishedAt,
        summary: data.summary,
        draft: data.draft === true,
      };
    })
    .filter((post) => !post.draft)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function generateSitemap(posts) {
  const staticPages = ['', '/blog', '/career', '/projects', '/library', '/contact'];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map((page) => `
  <url>
    <loc>${escapeXml(`${BASE_URL}${page}`)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`)
    .join('')}
  ${posts
    .map((post) => `
  <url>
    <loc>${escapeXml(`${BASE_URL}/blog/${encodeURIComponent(post.slug)}`)}</loc>
    <lastmod>${escapeXml(post.publishedAt)}</lastmod>
  </url>`)
    .join('')}
</urlset>`;

  fs.writeFileSync(path.join(BUILD_DIR, 'sitemap.xml'), sitemap);
  console.log('✅ Generated sitemap.xml');
}

function generateRobots() {
  const robots = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml`;

  fs.writeFileSync(path.join(BUILD_DIR, 'robots.txt'), robots);
  console.log('✅ Generated robots.txt');
}

function generateRSS(posts) {
  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Jonathan Yates</title>
  <link>${BASE_URL}/blog</link>
  <description>Jonathan Yates' Blog</description>
  <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
  ${posts
    .map((post) => `
  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${escapeXml(`${BASE_URL}/blog/${encodeURIComponent(post.slug)}`)}</link>
    <description>${escapeXml(post.summary)}</description>
    <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
    <guid>${escapeXml(`${BASE_URL}/blog/${encodeURIComponent(post.slug)}`)}</guid>
  </item>`)
    .join('')}
</channel>
</rss>`;

  fs.writeFileSync(path.join(BUILD_DIR, 'rss.xml'), rss);
  fs.mkdirSync(path.join(BUILD_DIR, 'rss'), { recursive: true });
  fs.writeFileSync(path.join(BUILD_DIR, 'rss', 'index.html'), rss);
  console.log('✅ Generated rss.xml');
}

const posts = getBlogPosts();
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}
generateSitemap(posts);
generateRobots();
generateRSS(posts);
