// Shared helpers for the profile panels.

export const USER = 'Modhish';
export const CITY = { name: 'Volgograd', lat: 48.708, lon: 44.513, utcOffset: 3, tz: 'MSK' };

export const FONT = "'JetBrains Mono','Fira Code','SFMono-Regular',Consolas,'Liberation Mono',monospace";

export const C = {
  bg: '#0d1117',
  panel: '#161b22',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#8b949e',
  blue: '#58a6ff',
  cyan: '#39c5cf',
  green: '#3fb950',
  yellow: '#d29922',
  orange: '#f0883e',
  red: '#f85149',
  purple: '#bc8cff',
  pink: '#ff7b9c',
};

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const clip = (s, n) => {
  const str = String(s ?? '').replace(/\s+/g, ' ').trim();
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
};

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Local wall-clock time in the city, as a Date whose UTC fields hold local values. */
export const cityTime = (now = new Date()) => new Date(now.getTime() + CITY.utcOffset * 3600e3);

export const hhmm = (d) =>
  `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

export function ago(iso, now = new Date()) {
  const s = Math.max(0, (now - new Date(iso)) / 1000);
  if (s < 60) return 'just now';
  const units = [
    ['y', 31536000],
    ['mo', 2592000],
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
  ];
  for (const [u, n] of units) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  return 'just now';
}

/** Linear blend of two #rrggbb colors. */
export function mix(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/** Wrap panel content in a rounded, bordered SVG card. */
export function frame({ w, h, title, body, defs = '', style = '' }) {
  const bar = title
    ? `<g>
    <circle cx="22" cy="20" r="5.5" fill="#ff5f57"/><circle cx="40" cy="20" r="5.5" fill="#febc2e"/><circle cx="58" cy="20" r="5.5" fill="#28c840"/>
    <text x="${w / 2}" y="24" text-anchor="middle" class="t" fill="${C.muted}" font-size="12">${esc(title)}</text>
    <line x1="0" y1="38" x2="${w}" y2="38" stroke="${C.border}"/>
  </g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${defs}
    <clipPath id="card"><rect width="${w}" height="${h}" rx="14"/></clipPath>
  </defs>
  <style>
    .t { font-family: ${FONT}; }
    ${style}
  </style>
  <g clip-path="url(#card)">
    <rect width="${w}" height="${h}" fill="${C.bg}"/>
    ${bar}
    ${body}
  </g>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="14" fill="none" stroke="${C.border}"/>
</svg>
`;
}
