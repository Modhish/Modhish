// From the Nile to the Volga: where I'm from, and where I live for now.
import { C, FONT, CITY, esc, hhmm } from '../lib.mjs';

const CAIRO = { lat: 30.0444, lon: 31.2357 };

// Egypt observes DST from the last Friday of April to the last Thursday of October.
function cairoOffset(now) {
  const y = now.getUTCFullYear();
  const lastDow = (month, dow) => {
    const d = new Date(Date.UTC(y, month + 1, 0));
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - dow + 7) % 7));
    return d;
  };
  const start = lastDow(3, 5); // last Friday of April, 00:00 local
  const end = lastDow(9, 4); // last Thursday of October, 24:00 local
  end.setUTCDate(end.getUTCDate() + 1);
  const local2 = new Date(now.getTime() + 2 * 3600e3);
  return local2 >= start && local2 < end ? 3 : 2;
}

function km(a, b) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const flagEG = (x, y) => `<g transform="translate(${x},${y})">
  <rect width="30" height="20" rx="2" fill="#ffffff"/><rect width="30" height="6.67" fill="#ce1126"/><rect y="13.33" width="30" height="6.67" fill="#000000"/>
  <path d="M15,7.6 l2.2,1.6 -0.8,2.6 h-2.8 l-0.8,-2.6 Z" fill="#c09300"/><rect width="30" height="20" rx="2" fill="none" stroke="#000" stroke-opacity=".25"/></g>`;
const flagRU = (x, y) => `<g transform="translate(${x},${y})">
  <rect width="30" height="20" rx="2" fill="#ffffff"/><rect y="6.67" width="30" height="6.67" fill="#0039a6"/><rect y="13.33" width="30" height="6.67" fill="#d52b1e"/>
  <rect width="30" height="20" rx="2" fill="none" stroke="#000" stroke-opacity=".25"/></g>`;

export function renderJourney(now = new Date()) {
  const W = 820;
  const H = 300;
  const G = 232; // ground line
  const off = cairoOffset(now);
  const cairo = new Date(now.getTime() + off * 3600e3);
  const volgo = new Date(now.getTime() + CITY.utcOffset * 3600e3);
  const dist = Math.round(km(CAIRO, CITY) / 10) * 10;
  const diff = CITY.utcOffset - off;
  const diffText = diff === 0 ? 'same time zone right now' : `Volgograd is ${diff}h ahead of Cairo`;

  // Flight route between the two pins.
  const route = 'M178,128 C300,10 500,10 630,158';

  let snow = '';
  for (let i = 0; i < 26; i++) {
    const x = 540 + ((i * 97) % 270);
    snow += `<circle cx="${x}" cy="0" r="${1.4 + (i % 3) * 0.7}" fill="#fff" class="snow" style="animation-duration:${12 + (i % 5) * 2}s;animation-delay:-${(i * 1.4) % 18}s"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="jsky" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f4a259"/><stop offset="0.32" stop-color="#e4785c"/><stop offset="0.62" stop-color="#4b3f7a"/><stop offset="1" stop-color="#1c2a4f"/>
    </linearGradient>
    <linearGradient id="jtop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1117" stop-opacity=".55"/><stop offset=".6" stop-color="#0d1117" stop-opacity="0"/></linearGradient>
    <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2b26b"/><stop offset="1" stop-color="#b9823f"/></linearGradient>
    <linearGradient id="snowg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d6ea"/><stop offset="1" stop-color="#8ea3c4"/></linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="1" y2="0"><stop offset="0.3" stop-color="#e2b26b"/><stop offset="0.7" stop-color="#9fb2cf"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#e8eeff" stop-opacity=".55"/><stop offset="1" stop-color="#e8eeff" stop-opacity="0"/></radialGradient>
    <radialGradient id="jsun"><stop offset="0" stop-color="#fff3c4" stop-opacity=".9"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>
    <clipPath id="jframe"><rect width="${W}" height="${H}" rx="14"/></clipPath>
  </defs>
  <style>
    .t { font-family: ${FONT}; }
    .rays { transform-origin: 96px 92px; animation: spin 60s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .palm { transform-box: fill-box; transform-origin: center bottom; animation: palm 7s ease-in-out infinite alternate; }
    @keyframes palm { from { transform: rotate(-3deg); } to { transform: rotate(3deg); } }
    .river { animation: river 7s linear infinite; }
    @keyframes river { to { transform: translateX(-40px); } }
    .snow { animation: snow 16s linear infinite; }
    @keyframes snow { from { transform: translate(0,-10px); } to { transform: translate(16px,${G + 10}px); } }
    .route { stroke-dasharray: 2 9; animation: dash 2.8s linear infinite; }
    @keyframes dash { to { stroke-dashoffset: -11; } }
    .ping { transform-box: fill-box; transform-origin: center; animation: ping 3.6s ease-out infinite; }
    @keyframes ping { from { transform: scale(.4); opacity: .9; } to { transform: scale(2.6); opacity: 0; } }
    .in { opacity: 0; animation: in 1.6s ease-out forwards; }
    @keyframes in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .shine { animation: shine 7s ease-in-out infinite; }
    @keyframes shine { 0%,100% { opacity: .0; } 50% { opacity: .35; } }
    .bird { animation: bird 28s linear infinite; }
    @keyframes bird { from { transform: translate(-40px,0); } to { transform: translate(300px,-30px); } }
    .flap { animation: flap .9s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
    @keyframes flap { to { transform: scaleY(-.6); } }
  </style>
  <g clip-path="url(#jframe)">
    <rect width="${W}" height="${H}" fill="url(#jsky)"/>
    <rect width="${W}" height="${H}" fill="url(#jtop)"/>

    <!-- Cairo: sun, pyramids, palm, the Nile -->
    <circle cx="96" cy="92" r="70" fill="url(#jsun)"/>
    <g class="rays" stroke="#fff3c4" stroke-width="3" stroke-linecap="round" opacity=".7">
      ${Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return `<line x1="${(96 + Math.cos(a) * 34).toFixed(1)}" y1="${(92 + Math.sin(a) * 34).toFixed(1)}" x2="${(96 + Math.cos(a) * 44).toFixed(1)}" y2="${(92 + Math.sin(a) * 44).toFixed(1)}"/>`;
      }).join('')}
    </g>
    <circle cx="96" cy="92" r="26" fill="#fff0b8"/>
    <g class="bird"><path class="flap" d="M120,70 q6,-6 12,0 q6,-6 12,0" stroke="#5a2e1c" stroke-width="2" fill="none"/></g>

    <path d="M0,${G} L0,${G - 10} C120,${G - 22} 260,${G - 8} 420,${G - 4} L420,${G} Z" fill="url(#sand)"/>
    <polygon points="70,${G} 160,118 250,${G}" fill="#d9a85c"/><polygon points="160,118 250,${G} 186,${G}" fill="#a87436"/>
    <polygon points="160,118 250,${G} 186,${G}" fill="#fff" class="shine"/>
    <polygon points="226,${G} 276,164 326,${G}" fill="#d9a85c"/><polygon points="276,164 326,${G} 290,${G}" fill="#a87436"/>
    <polygon points="20,${G} 54,180 88,${G}" fill="#cf9b52"/><polygon points="54,180 88,${G} 64,${G}" fill="#9e6c32"/>
    <g class="palm">
      <rect x="354" y="${G - 70}" width="6" height="70" rx="3" fill="#6b4423"/>
      <g fill="#2f7d3a"><path d="M357,${G - 70} q-30,-6 -44,14 q22,-16 44,-10Z"/><path d="M357,${G - 70} q30,-8 46,10 q-22,-12 -46,-6Z"/>
      <path d="M357,${G - 70} q-14,-24 -38,-24 q24,6 38,20Z"/><path d="M357,${G - 70} q12,-26 38,-26 q-24,8 -38,22Z"/></g>
    </g>

    <!-- Volgograd: hill, statue, snow -->
    <circle cx="706" cy="${G - 120}" r="62" fill="url(#glow)"/>
    <path d="M400,${G} L400,${G - 4} C520,${G - 6} 620,${G - 70} 700,${G - 74} C760,${G - 76} 800,${G - 50} ${W},${G - 40} L${W},${G} Z" fill="url(#snowg)"/>
    <g transform="translate(700,${G - 74}) scale(0.82)" fill="#1a2238" stroke="#1a2238" stroke-linecap="round">
      <rect x="-7" y="-7" width="14" height="7" stroke="none"/>
      <path stroke="none" d="M-5,-7 L6,-7 L4,-30 L5,-47 L2,-54 L-3,-54 L-6,-46 L-9,-30 L-17,-12 L-10,-7 Z"/>
      <path stroke="none" d="M-3,-50 C-12,-50 -22,-44 -26,-36 C-20,-38 -16,-34 -14,-28 C-12,-36 -8,-40 -4,-42 Z"/>
      <circle cx="0" cy="-58" r="3.6" stroke="none"/>
      <line x1="2" y1="-52" x2="12" y2="-67" stroke-width="3.2"/><line x1="12" y1="-67" x2="25" y2="-98" stroke-width="2"/>
      <line x1="-2" y1="-51" x2="-19" y2="-58" stroke-width="2.8"/>
    </g>
    ${snow}

    <!-- rivers: the Nile flows into the Volga -->
    <rect y="${G}" width="${W}" height="${H - G}" fill="#1d4f7a"/>
    <rect y="${G}" width="${W}" height="${H - G}" fill="url(#ground)" opacity=".18"/>
    <g class="river" stroke="#ffffff" stroke-opacity=".25" stroke-width="2" fill="none">
      ${Array.from({ length: 4 }, (_, i) => `<path d="M0,${G + 14 + i * 14} ${Array.from({ length: 23 }, (_, k) => `q10,${k % 2 ? 4 : -4} 20,0`).join(' ')} ${Array.from({ length: 22 }, (_, k) => `q10,${k % 2 ? 4 : -4} 20,0`).join(' ')}"/>`).join('')}
    </g>
    <text x="24" y="${H - 14}" class="t" font-size="10" fill="#fff" opacity=".6">the Nile</text>
    <text x="${W - 24}" y="${H - 14}" text-anchor="end" class="t" font-size="10" fill="#fff" opacity=".6">the Volga</text>

    <!-- the route -->
    <path d="${route}" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" class="route" opacity=".9"/>
    <circle cx="178" cy="128" r="6" fill="#ce1126" stroke="#fff" stroke-width="2"/><circle cx="178" cy="128" r="6" fill="none" stroke="#fff" stroke-width="2" class="ping"/>
    <circle cx="630" cy="158" r="6" fill="#0039a6" stroke="#fff" stroke-width="2"/><circle cx="630" cy="158" r="6" fill="none" stroke="#fff" stroke-width="2" class="ping" style="animation-delay:-1.8s"/>
    <g>
      <animateMotion dur="16s" repeatCount="indefinite" rotate="auto" keyPoints="0;1;1" keyTimes="0;0.8;1" calcMode="linear" path="${route}"/>
      <path d="M-11,0 L-4,-2 L2,-10 L5,-10 L2,-2 L9,-2 L12,-5 L14,-5 L12,0 L14,5 L12,5 L9,2 L2,2 L5,10 L2,10 L-4,2 L-11,0 Z" fill="#ffffff" transform="scale(1.3)"/>
    </g>
    <g class="t in" style="animation-delay:.6s">
      <rect x="306" y="40" width="208" height="24" rx="12" fill="#0d1117" opacity=".55"/>
      <text x="410" y="56" text-anchor="middle" font-size="11.5" fill="#ffffff">from the Nile to the Volga ✈</text>
    </g>

    <!-- labels -->
    <g class="t in" style="animation-delay:.1s">
      <rect x="18" y="16" width="236" height="64" rx="12" fill="#0d1117" opacity=".6"/>
      ${flagEG(32, 28)}
      <text x="72" y="43" font-size="13" font-weight="700" fill="#fff" letter-spacing="1.5">CAIRO, EGYPT</text>
      <text x="72" y="62" font-size="11" fill="#fff" opacity=".8">born &amp; raised · ${hhmm(cairo)} ${off === 3 ? 'EEST' : 'EET'}</text>
    </g>
    <g class="t in" style="animation-delay:.35s">
      <rect x="${W - 286}" y="16" width="268" height="64" rx="12" fill="#0d1117" opacity=".6"/>
      ${flagRU(W - 272, 28)}
      <text x="${W - 232}" y="43" font-size="13" font-weight="700" fill="#fff" letter-spacing="1.5">VOLGOGRAD, RUSSIA</text>
      <text x="${W - 232}" y="62" font-size="11" fill="#fff" opacity=".8">living here for now · ${hhmm(volgo)} MSK</text>
    </g>
    <g class="t in" style="animation-delay:1s">
      <rect x="${W / 2 - 200}" y="${G - 40}" width="400" height="26" rx="13" fill="#0d1117" opacity=".6"/>
      <text x="${W / 2}" y="${G - 23}" text-anchor="middle" font-size="11.5" fill="#ffffff">an Egyptian developer · ${dist.toLocaleString('en-US')} km from home · ${esc(diffText)}</text>
    </g>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${C.border}"/>
</svg>
`;
}
