import { useState } from 'react';
import useSWR from 'swr';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import worldData from 'world-atlas/countries-110m.json';
import { api, fetcher, type VisitStats } from '../../api';
import { NUMERIC_TO_ALPHA2, ALPHA2_TO_NAME, flagEmoji } from './iso-countries';

const world = worldData as unknown as Topology<{ countries: GeometryCollection }>;
const countries = feature(world, world.objects.countries).features as Feature<Geometry>[];

// CloudFront only resolves country-name/city for some IPs (datacenter IPs often
// don't), so name countries client-side instead of trusting the stored one.
function displayName(alpha2: string, stored?: string): string {
  return ALPHA2_TO_NAME[alpha2] || stored || alpha2;
}

const WIDTH = 800;
const HEIGHT = 420;
const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], {
  type: 'FeatureCollection',
  features: countries,
});
const path = geoPath(projection);

/** Shade intensity on a log scale so one huge country doesn't wash out the rest. */
function fillFor(count: number, max: number): string {
  if (count <= 0) return 'fill-neutral-800';
  const intensity = Math.log(count + 1) / Math.log(max + 1);
  if (intensity > 0.75) return 'fill-emerald-400';
  if (intensity > 0.5) return 'fill-emerald-500';
  if (intensity > 0.25) return 'fill-emerald-600';
  return 'fill-emerald-800';
}

export default function VisitorMap() {
  const { data, error, isLoading } = useSWR<VisitStats>(api.visits.get(), fetcher);
  const [hovered, setHovered] = useState<{ name: string; count: number } | null>(null);

  const countsByAlpha2 = new Map(data?.countries.map((c) => [c.country, c]) ?? []);
  const maxCount = data?.countries[0]?.count ?? 0;
  const topCountries = data?.countries.slice(0, 8) ?? [];

  return (
    <div
      data-testid="visitor-map"
      className="h-full overflow-y-auto bg-neutral-950 text-neutral-200 font-mono text-xs p-3 select-none"
    >
      {isLoading && <p className="text-neutral-500">locating visitors…</p>}
      {error && <p className="text-red-400">could not load visitor data (try again later)</p>}
      {data && (
        <>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-emerald-400">
              {data.total.toLocaleString()} hits from {data.countries.length}{' '}
              {data.countries.length === 1 ? 'country' : 'countries'}
            </span>
            <span className="text-neutral-500 h-4">
              {hovered
                ? `${hovered.name}: ${hovered.count.toLocaleString()} ${hovered.count === 1 ? 'hit' : 'hits'}`
                : 'hover a country'}
            </span>
          </div>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto"
            role="img"
            aria-label="World map of visitor locations"
          >
            {countries.map((c) => {
              const alpha2 = NUMERIC_TO_ALPHA2[String(c.id).padStart(3, '0')];
              const visits = alpha2 ? countsByAlpha2.get(alpha2) : undefined;
              const isYou = alpha2 !== undefined && alpha2 === data.you;
              return (
                <path
                  key={String(c.id)}
                  d={path(c) ?? undefined}
                  className={`${fillFor(visits?.count ?? 0, maxCount)} ${
                    isYou ? 'stroke-amber-400' : 'stroke-neutral-950'
                  } transition-colors hover:fill-emerald-300`}
                  strokeWidth={isYou ? 1.5 : 0.5}
                  onMouseEnter={() =>
                    setHovered({
                      name: alpha2
                        ? displayName(alpha2, visits?.countryName)
                        : (c.properties as { name?: string })?.name || '??',
                      count: visits?.count ?? 0,
                    })
                  }
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
          </svg>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
            {topCountries.map((c) => (
              <div key={c.country} className="flex justify-between gap-2">
                <span className="truncate">
                  {flagEmoji(c.country)} {displayName(c.country, c.countryName)}
                  {c.country === data.you && <span className="text-amber-400"> ◄ you</span>}
                </span>
                <span className="text-emerald-400">{c.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
          {data.countries.length === 0 && (
            <p className="text-neutral-500 mt-2">no visits recorded yet — you're early!</p>
          )}
        </>
      )}
    </div>
  );
}
