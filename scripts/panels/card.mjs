// A fastfetch-style system card, except the "system" is me.
import { C, esc, frame, CITY } from '../lib.mjs';

// "AM" monogram, drawn as pixels so it renders the same in every font.
const LOGO = [
  '.###...#...#',
  '#...#..##.##',
  '#...#..#.#.#',
  '#####..#.#.#',
  '#...#..#...#',
  '#...#..#...#',
  '#...#..#...#',
];

function uptime(createdAt, now) {
  const start = new Date(createdAt);
  let months = (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + now.getUTCMonth() - start.getUTCMonth();
  if (now.getUTCDate() < start.getUTCDate()) months--;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} year${y === 1 ? '' : 's'}, ${m} month${m === 1 ? '' : 's'}`;
}

const n = (v, fallback = '—') => (v === null || v === undefined ? fallback : v.toLocaleString('en-US'));

export function renderCard(gh, now = new Date()) {
  const W = 820;
  const rows = [
    ['OS', 'Full-Stack Developer · UI Architect'],
    ['Origin', 'Cairo, Egypt  →  living in Volgograd, Russia'],
    ['Host', `${gh.company}`],
    ['Uptime', `${uptime(gh.createdAt, now)} on GitHub`],
    ['Packages', `${n(gh.repos)} repos · ★ ${n(gh.stars)} stars`],
    ['Languages', 'Java · Dart · TypeScript · JavaScript · Python'],
    ['', 'C · C++ · PHP · SQL · HTML/CSS · Lex/Yacc'],
    ['Mobile', 'Flutter (iOS·Android·Web·Desktop) · GetX · Isar'],
    ['Frontend', 'React · Vue · Tailwind · Widgetbook · PWA'],
    ['Backend', 'Spring Boot · Spring Cloud · OpenFeign · Kafka'],
    ['', 'FastAPI · Django · Flask · Retrofit'],
    ['Arch', 'Microservices · Hexagonal · REST · GraphQL · JWT'],
    ['Data', 'MongoDB · PostgreSQL · MySQL · SQLite'],
    ['DevOps', 'Docker · Compose · Jenkins · Nginx · Actions · Maven'],
    ['Testing', 'JUnit · Mockito · WireMock · Bruno · flutter_test'],
    ['AI', 'MCP servers · LLM pipelines · SHAP · AI agents'],
    ['Commits', `${n(gh.contributions)} contributions in the last year`],
    ['Network', `${n(gh.followers)} followers · ${n(gh.following)} following`],
    ['Links', 't.me/Modhish1 · ahmedmodhish.netlify.app'],
    ['', 'linkedin.com/in/ahmed-modhish-227a1a178'],
    ['Status', 'open to full-stack, mobile & backend work'],
  ];

  const x0 = 260;
  const top = 68;
  const lh = 19.5;
  const user = 'ahmed@modhish';

  let body = '';

  // Logo with a vertical gradient.
  const p = 13;
  const logoY = top + (lh * (rows.length + 2)) / 2 - 50;
  body += `<g fill="url(#logo)">`;
  LOGO.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '#') body += `<rect x="${44 + x * p}" y="${logoY + y * p}" width="${p - 2}" height="${p - 2}" rx="2"/>`;
    }),
  );
  body += `</g>
    <text x="${44 + (LOGO[0].length * p) / 2}" y="${logoY + LOGO.length * p + 34}" text-anchor="middle" class="t" font-size="12" letter-spacing="2" fill="${C.muted}">&lt;/&gt; full-stack</text>`;

  body += `<g class="t" font-size="13.5">
    <text x="${x0}" y="${top}"><tspan fill="${C.blue}" font-weight="700">ahmed</tspan><tspan fill="${C.text}">@</tspan><tspan fill="${C.blue}" font-weight="700">modhish</tspan></text>
    <text x="${x0}" y="${top + lh}" fill="${C.muted}">${'─'.repeat(user.length)}</text>`;
  rows.forEach(([k, v], i) => {
    const y = top + lh * (i + 2);
    // Values sit in an aligned column; a row with no key continues the one above.
    body += `<text x="${x0}" y="${y}" class="row" style="animation-delay:${(0.05 * i).toFixed(2)}s"><tspan fill="${C.blue}" font-weight="700">${k ? esc(k) + ':' : ''}</tspan><tspan x="${x0 + 92}" fill="${C.text}">${esc(v)}</tspan></text>`;
  });
  body += `</g>`;

  // Language bar.
  const barY = top + lh * (rows.length + 2) + 4;
  const barW = W - x0 - 34;
  if (gh.languages.length) {
    let x = x0;
    let segs = '';
    let legend = '';
    let lx = x0;
    gh.languages.forEach((l, i) => {
      const w = Math.max(2, l.pct * barW);
      segs += `<rect x="${x.toFixed(1)}" y="${barY}" width="${w.toFixed(1)}" height="8" fill="${l.color}"/>`;
      x += w;
      const label = `${l.name} ${(l.pct * 100).toFixed(1)}%`;
      if (i < 5) {
        legend += `<circle cx="${lx + 4}" cy="${barY + 25}" r="4" fill="${l.color}"/><text x="${lx + 13}" y="${barY + 29}" fill="${C.muted}">${esc(label)}</text>`;
        lx += 22 + label.length * 7.2;
      }
    });
    body += `<clipPath id="bar"><rect x="${x0}" y="${barY}" width="${barW}" height="8" rx="4"/></clipPath>
      <g clip-path="url(#bar)">${segs}</g>
      <g class="t" font-size="11">${legend}</g>`;
  }

  // Colour blocks, like every neofetch screenshot ever.
  const blocks = [C.bg, C.red, C.green, C.yellow, C.blue, C.purple, C.cyan, C.text];
  const by = barY + 48;
  body += blocks.map((c, i) => `<rect x="${x0 + i * 26}" y="${by}" width="26" height="14" fill="${c}"/>`).join('');
  body += `<text x="${W - 34}" y="${by + 11}" text-anchor="end" class="t" font-size="11" fill="${C.muted}">synced ${now.toISOString().slice(0, 10)}<tspan class="cur" fill="${C.green}"> ▌</tspan></text>`;

  const H = by + 40;
  return frame({
    w: W,
    h: H,
    title: 'ahmed@volgograd: ~ — fastfetch',
    defs: `<linearGradient id="logo" gradientUnits="userSpaceOnUse" x1="0" y1="${logoY}" x2="0" y2="${logoY + LOGO.length * 13}"><stop offset="0" stop-color="${C.cyan}"/><stop offset="0.55" stop-color="${C.blue}"/><stop offset="1" stop-color="${C.purple}"/></linearGradient>`,
    style: `.row { opacity: 0; animation: in .4s ease-out forwards; }
    @keyframes in { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
    .cur { animation: cur 1s steps(1) infinite; } @keyframes cur { 50% { opacity: 0; } }`,
    body,
  });
}
