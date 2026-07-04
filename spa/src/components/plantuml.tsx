import { useState, useEffect } from 'react';
import * as plantumlEncoder from 'plantuml-encoder';
import { fnv1aHex } from '../lib/hash';

const SERVER = 'https://www.plantuml.com/plantuml/svg/';

interface PlantUmlEncoder {
  encode(source: string): string;
}

export function PlantUML({ children }: { children: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const source = typeof children === 'string' ? children.trim() : '';

  useEffect(() => {
    if (!source) return;
    let url: string;
    if (import.meta.env.PROD) {
      // Prod: SVGs are prerendered by scripts/generate-diagrams.js at build
      // time and served from our own origin.
      url = `/diagrams/${fnv1aHex(source)}.svg`;
    } else {
      // Dev: render remotely via plantuml.com for a fast authoring loop.
      // plantuml-encoder ships no types; handle CJS/ESM default-export interop
      const mod = plantumlEncoder as PlantUmlEncoder & { default?: PlantUmlEncoder };
      const encoder = mod.default ?? mod;
      url = `${SERVER}${encoder.encode(source)}`;
    }
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.text();
      })
      .then((text) => {
        const b64 = btoa(unescape(encodeURIComponent(text)));
        setSvg(`data:image/svg+xml;base64,${b64}`);
      })
      .catch(() => setError(true));
  }, [source]);

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-800">
        <code>{source}</code>
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="flex h-40 items-center justify-center text-zinc-400">
        Loading diagram…
      </div>
    );
  }

  return (
    <div className="my-6">
      <div
        className={`overflow-auto rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 ${
          zoomed ? 'max-h-none' : 'max-h-[500px]'
        }`}
      >
        <img
          src={svg}
          alt="PlantUML diagram"
          className={`mx-auto transition-transform duration-200 dark:invert dark:hue-rotate-180 ${
            zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          onClick={() => setZoomed(!zoomed)}
        />
      </div>
      <p className="mt-1 text-center text-xs text-zinc-400">Click to {zoomed ? 'zoom out' : 'zoom in'}</p>
    </div>
  );
}
