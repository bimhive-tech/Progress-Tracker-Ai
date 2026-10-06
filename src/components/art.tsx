import { useId, useMemo } from 'react';
import clsx from 'clsx';

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function random(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

const PALETTES = [
  { top: '#5d5b55', left: '#42413d', right: '#373633', line: '#6c6a63' }, // graphite
  { top: '#cdb87a', left: '#a08b50', right: '#7f6e3f', line: '#dbc88f' }, // BIM Hive gold
  { top: '#9b968c', left: '#76726a', right: '#615e57', line: '#aaa59b' }, // stone
];

const ISO_X = 0.866;
const ISO_Y = 0.5;

function project(x: number, y: number, z: number) {
  return [200 + (x - y) * ISO_X * 10, 70 + (x + y) * ISO_Y * 10 - z * 10] as const;
}

function poly(points: (readonly [number, number])[]) {
  return points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
}

/** Deterministic isometric "massing model" used as each project's thumbnail. */
export function PlaceholderArt({ seed, className }: { seed: string; className?: string }) {
  const skyId = useId();
  const svg = useMemo(() => {
    const rnd = random(hash(seed));
    const boxes: { x: number; y: number; w: number; d: number; h: number; p: (typeof PALETTES)[number] }[] = [];
    const slots = [
      [2, 2],
      [9, 1],
      [1, 9],
      [8, 8],
      [15, 3],
      [3, 15],
    ] as const;
    const count = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < count; i++) {
      const [sx, sy] = slots[i]!;
      const accent = rnd();
      boxes.push({
        x: sx + rnd() * 1.5,
        y: sy + rnd() * 1.5,
        w: 4 + rnd() * 2.5,
        d: 4 + rnd() * 2.5,
        h: 3 + Math.floor(rnd() * 8),
        p: accent > 0.72 ? PALETTES[1]! : accent > 0.55 ? PALETTES[2]! : PALETTES[0]!,
      });
    }
    const trees = Array.from({ length: 7 }, () => ({ x: rnd() * 24 - 2, y: rnd() * 24 - 2, r: 5 + rnd() * 4 }));
    boxes.sort((a, b) => a.x + a.y - (b.x + b.y));
    return { boxes, trees };
  }, [seed]);

  return (
    <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" className={clsx('block size-full', className)} aria-hidden>
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2d2c29" />
          <stop offset="1" stopColor="#232220" />
        </linearGradient>
      </defs>
      <rect width="400" height="250" fill={`url(#${skyId})`} />
      {/* ground plate + roads */}
      <polygon points={poly([project(-6, -6, 0), project(26, -6, 0), project(26, 26, 0), project(-6, 26, 0)])} fill="#2f2e2b" />
      <polyline points={poly([project(-6, 7.2, 0), project(26, 7.2, 0)])} stroke="#393834" strokeWidth="9" fill="none" />
      <polyline points={poly([project(7.2, -6, 0), project(7.2, 26, 0)])} stroke="#393834" strokeWidth="9" fill="none" />
      {svg.trees
        .filter((t) => t.y < 4 || t.x < 4)
        .map((t, i) => (
          <Tree key={`b${i}`} x={t.x} y={t.y} r={t.r} />
        ))}
      {svg.boxes.map((b, i) => {
        const { x, y, w, d, h, p } = b;
        const floors = Array.from({ length: h - 1 }, (_, k) => k + 1);
        return (
          <g key={i} strokeLinejoin="round">
            <polygon points={poly([project(x + w, y, 0), project(x + w, y + d, 0), project(x + w, y + d, h), project(x + w, y, h)])} fill={p.right} />
            <polygon points={poly([project(x, y + d, 0), project(x + w, y + d, 0), project(x + w, y + d, h), project(x, y + d, h)])} fill={p.left} />
            {floors.map((k) => (
              <g key={k} stroke={p.line} strokeWidth="0.7" opacity="0.8">
                <line x1={project(x + w, y, k)[0]} y1={project(x + w, y, k)[1]} x2={project(x + w, y + d, k)[0]} y2={project(x + w, y + d, k)[1]} />
                <line x1={project(x, y + d, k)[0]} y1={project(x, y + d, k)[1]} x2={project(x + w, y + d, k)[0]} y2={project(x + w, y + d, k)[1]} />
              </g>
            ))}
            <polygon points={poly([project(x, y, h), project(x + w, y, h), project(x + w, y + d, h), project(x, y + d, h)])} fill={p.top} stroke={p.line} strokeWidth="0.6" />
          </g>
        );
      })}
      {svg.trees
        .filter((t) => !(t.y < 4 || t.x < 4))
        .map((t, i) => (
          <Tree key={`f${i}`} x={t.x} y={t.y} r={t.r} />
        ))}
    </svg>
  );
}

function Tree({ x, y, r }: { x: number; y: number; r: number }) {
  const [cx, cy] = project(x, y, 0);
  return (
    <g>
      <ellipse cx={cx + 2} cy={cy + 1} rx={r * 0.8} ry={r * 0.35} fill="#000" opacity="0.25" />
      <line x1={cx} y1={cy} x2={cx} y2={cy - r * 0.9} stroke="#6d6556" strokeWidth="1.2" />
      <circle cx={cx} cy={cy - r * 1.2} r={r * 0.75} fill="#5f7758" />
      <circle cx={cx - r * 0.25} cy={cy - r * 1.4} r={r * 0.45} fill="#79926e" />
    </g>
  );
}

/** The BIM Hive building mark, traced from the brand logo. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 685 842" fill="currentColor" fillRule="evenodd" className={className} aria-hidden>
      <path d="M0 842V141L244 0l245 141v229l196 112v244L484 842h-88V597l47-27 46 27v134l104-60V537L443 450l-152 87v305h-93V135L93 195v647ZM291 135l105 60v175l-105 59Z" />
    </svg>
  );
}
