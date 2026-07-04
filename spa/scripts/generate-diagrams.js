// Build-time PlantUML rendering.
//
// Scans src/blog/posts/*.mdx for <PlantUML>{`...`}</PlantUML> blocks (the
// authoring syntax supported by src/components/mdx.tsx), renders each one via
// the public plantuml.com server, and writes the SVGs to
// public/diagrams/<fnv1a-hash>.svg. In production the PlantUML component loads
// these prebuilt SVGs instead of hitting plantuml.com from every reader's
// browser (dev keeps the remote fetch for a fast authoring loop).
//
// No diagrams found -> succeed quietly. A failed fetch for a found diagram ->
// fail the build loudly.

import fs from 'fs';
import path from 'path';
import plantumlEncoder from 'plantuml-encoder';
import { fnv1aHex } from '../src/lib/hash.js';

const POSTS_DIR = path.join(process.cwd(), 'src/blog/posts');
const OUT_DIR = path.join(process.cwd(), 'public/diagrams');
const SERVER = 'https://www.plantuml.com/plantuml/svg/';

// Matches the MDX usage: <PlantUML>{`@startuml ... @enduml`}</PlantUML>
const PLANTUML_BLOCK = /<PlantUML>\s*\{`([\s\S]*?)`\}\s*<\/PlantUML>/g;

function findDiagramSources() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const sources = new Map(); // hash -> source
  for (const file of fs.readdirSync(POSTS_DIR)) {
    if (!file.endsWith('.mdx')) continue;
    const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
    for (const match of content.matchAll(PLANTUML_BLOCK)) {
      // The component trims its children before encoding — hash the same value.
      const source = match[1].trim();
      if (source) sources.set(fnv1aHex(source), source);
    }
  }
  return [...sources.entries()];
}

async function renderDiagram(hash, source) {
  const encoded = plantumlEncoder.encode(source);
  const res = await fetch(`${SERVER}${encoded}`);
  if (!res.ok) {
    throw new Error(`plantuml.com returned ${res.status} ${res.statusText} for diagram ${hash}`);
  }
  const svg = await res.text();
  fs.writeFileSync(path.join(OUT_DIR, `${hash}.svg`), svg);
}

const diagrams = findDiagramSources();
if (diagrams.length > 0) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  try {
    await Promise.all(diagrams.map(([hash, source]) => renderDiagram(hash, source)));
  } catch (err) {
    console.error('❌ Failed to render PlantUML diagrams:', err);
    process.exit(1);
  }
  console.log(`✅ Generated ${diagrams.length} PlantUML diagram(s) in public/diagrams/`);
}
