import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import ts from 'typescript';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(scriptDirectory, '../..');
const projectsPath = 'spa/src/data/projects.ts';
const shaPattern = /^[a-f0-9]{7,64}$/;

function propertyName(node) {
  return ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : undefined;
}

function stringValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return undefined;
}

export function extractProjects(source) {
  const file = ts.createSourceFile('projects.ts', source, ts.ScriptTarget.Latest, true);
  let initializer;
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'projects' &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      initializer = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (!initializer) throw new Error('Could not find the projects array');

  return initializer.elements.map((element) => {
    if (!ts.isObjectLiteralExpression(element)) throw new Error('Project entry must be an object');
    const project = { id: '', title: '', description: '', technologies: [], github: undefined };
    for (const property of element.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = propertyName(property.name);
      if (name === 'id' || name === 'title' || name === 'description' || name === 'github') {
        const value = stringValue(property.initializer);
        if (value !== undefined) project[name] = value;
      } else if (name === 'technologies' && ts.isArrayLiteralExpression(property.initializer)) {
        project.technologies = property.initializer.elements
          .map(stringValue)
          .filter((value) => value !== undefined);
      }
    }
    if (!project.title || !project.description) {
      throw new Error('Project entry is missing metadata');
    }
    return project;
  });
}

export function collectProjectEvents(previousSource, currentSource, siteURL = 'https://jyates.dev') {
  const baseURL = siteURL.replace(/\/$/, '');
  const projectKeys = (project) =>
    [
      project.id && `id:${project.id}`,
      project.github && `github:${project.github}`,
      `title:${project.title}`,
    ].filter(Boolean);
  const previousProjects = new Set(extractProjects(previousSource).flatMap(projectKeys));
  return extractProjects(currentSource)
    .filter((project) => projectKeys(project).every((key) => !previousProjects.has(key)))
    .map((project) => ({
      topic: 'projects',
      title: project.title,
      summary: project.description,
      url: `${baseURL}/projects`,
    }));
}

export function blogEventFromSource(source, slug, siteURL = 'https://jyates.dev') {
  const { data } = matter(source);
  if (data.draft === true) return undefined;
  if (typeof data.title !== 'string' || typeof data.summary !== 'string') {
    throw new Error(`Blog post ${slug} is missing title or summary metadata`);
  }
  return {
    topic: 'blog',
    title: data.title,
    summary: data.summary,
    url: `${siteURL.replace(/\/$/, '')}/blog/${slug}`,
  };
}

export function shouldPublishBlogEvent(previousSource, currentSource) {
  const current = matter(currentSource).data;
  if (current.draft === true) return false;
  if (previousSource === undefined) return true;
  return matter(previousSource).data.draft === true;
}

function git(repoRoot, args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
}

function commitExists(repoRoot, sha) {
  try {
    git(repoRoot, ['cat-file', '-e', `${sha}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

export function collectNotifications({
  before,
  after,
  repoRoot = defaultRepoRoot,
  siteURL = 'https://jyates.dev',
}) {
  if (!shaPattern.test(after)) throw new Error('Current commit SHA is invalid');
  const manifest = { version: 1, id: after, events: [] };
  if (!shaPattern.test(before) || /^0+$/.test(before) || !commitExists(repoRoot, before)) {
    return manifest;
  }

  const changedPostPaths = git(repoRoot, [
    'diff',
    '--diff-filter=AM',
    '--name-only',
    before,
    after,
    '--',
    'spa/src/blog/posts/*.mdx',
  ])
    .split('\n')
    .filter(Boolean);
  for (const postPath of changedPostPaths) {
    const source = fs.readFileSync(path.join(repoRoot, postPath), 'utf8');
    const slug = path.basename(postPath, '.mdx');
    let previousSource;
    try {
      previousSource = git(repoRoot, ['show', `${before}:${postPath}`]);
    } catch {
      // The file is new in this deploy.
    }
    if (!shouldPublishBlogEvent(previousSource, source)) continue;
    const event = blogEventFromSource(source, slug, siteURL);
    if (event) manifest.events.push(event);
  }

  try {
    const previousProjects = git(repoRoot, ['show', `${before}:${projectsPath}`]);
    const currentProjects = fs.readFileSync(path.join(repoRoot, projectsPath), 'utf8');
    manifest.events.push(...collectProjectEvents(previousProjects, currentProjects, siteURL));
  } catch (error) {
    if (git(repoRoot, ['diff', '--name-only', before, after, '--', projectsPath]).trim()) throw error;
  }

  if (manifest.events.length > 20) {
    throw new Error('A single deploy cannot publish more than 20 content notifications');
  }
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , before = '', after = '', siteURL = 'https://jyates.dev'] = process.argv;
  const manifest = collectNotifications({ before, after, siteURL });
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}
