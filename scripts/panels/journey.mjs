// Half Cairo, half Volgograd: where I'm from and where I live for now. Each
// half shows that city's real sky at render time, and a plane flies between.
import { C, FONT, CITY, clamp, mix, hhmm } from '../lib.mjs';
import { sky, skyColors, mulberry32 } from './sky.mjs';

const CAIRO = { lat: 30.0444, lon: 31.2357 };
const W = 820;
const H = 300;
const MID = W / 2;
const G = 222; // horizon

// Egypt observes DST from the last Friday of April to the last Thursday of October.
function cairoOffset(now) {
  const y = now.getUTCFullYear();
  const lastDow = (month, dow) => {
    const d = new Date(Date.UTC(y, month + 1, 0));
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - dow + 7) % 7));
    return d;
  };
  const start = lastDow(3, 5);
  const end = lastDow(9, 4);
  end.setUTCDate(end.getUTCDate() + 1);
  const local2 = new Date(now.getTime() + 2 * 3600e3);
  return local2 >= start && local2 < end ? 3 : 2;
}

const flagEG = (x, y) => `<g transform="translate(${x},${y})">
  <rect width="30" height="20" rx="2" fill="#ffffff"/><rect width="30" height="6.67" fill="#ce1126"/><rect y="13.33" width="30" height="6.67" fill="#000000"/>
  <path d="M15,7.6 l2.2,1.6 -0.8,2.6 h-2.8 l-0.8,-2.6 Z" fill="#c09300"/><rect width="30" height="20" rx="2" fill="none" stroke="#000" stroke-opacity=".25"/></g>`;
const flagRU = (x, y) => `<g transform="translate(${x},${y})">
  <rect width="30" height="20" rx="2" fill="#ffffff"/><rect y="6.67" width="30" height="6.67" fill="#0039a6"/><rect y="13.33" width="30" height="6.67" fill="#d52b1e"/>
  <rect width="30" height="20" rx="2" fill="none" stroke="#000" stroke-opacity=".25"/></g>`;

/** Sun, moon, stars and a cloud for one half of the panel. */
function heavens(id, astro, x0, seed) {
  const { sun, moon, phase } = astro;
  const [top, bottom] = skyColors(sun.alt);
  const night = clamp(-sun.alt / 12, 0, 1);
  const rand = mulberry32(seed);
  const toX = (az) => x0 + clamp(((az - 45) / 270) * MID, -30, MID + 30);
  const toY = (alt) => G - (alt / 70) * (G - 40);

  let stars = '';
  if (night > 0.05) {
    for (let i = 0; i < 40; i++) {
      stars += `<circle cx="${(x0 + rand() * MID).toFixed(0)}" cy="${(8 + rand() * (G - 60)).toFixed(0)}" r="${rand() < 0.15 ? 1.4 : 0.8}" fill="#fff"
        class="tw" style="opacity:${night.toFixed(2)};animation-duration:${(3 + rand() * 4).toFixed(1)}s;animation-delay:-${(rand() * 5).toFixed(1)}s"/>`;
    }
  }

  const warm = clamp(1 - sun.alt / 25, 0, 1);
  const sunColor = mix('#fff6d5', '#ff8a3d', warm);
  const sx = toX(sun.az);
  const sy = toY(sun.alt);
  const sunSvg =
    sun.alt > -8
      ? `<circle cx="${sx}" cy="${sy}" r="95" fill="url(#glow-${id})" opacity="${clamp((sun.alt + 8) / 10, 0, 1).toFixed(2)}"/>
         <circle cx="${sx}" cy="${sy}" r="15" fill="${sunColor}"/>`
      : '';

  const mx = toX(moon.az);
  const my = toY(moon.alt);
  const shadowDx = phase < 0.5 ? -22 * (phase / 0.5) : 22 * (1 - (phase - 0.5) / 0.5);
  const moonSvg =
    moon.alt > -2
      ? `<g opacity="${(0.35 + 0.65 * night).toFixed(2)}"><clipPath id="m-${id}"><circle cx="${mx}" cy="${my}" r="10"/></clipPath>
         <circle cx="${mx}" cy="${my}" r="10" fill="#f4f1e6"/>
         <circle cx="${mx + shadowDx}" cy="${my}" r="10.5" fill="${mix(top, bottom, my / G)}" opacity=".92" clip-path="url(#m-${id})"/></g>`
      : '';

  const tint = sun.alt > 10 ? '#ffffff' : sun.alt > -4 ? '#ffc2a8' : '#5a6488';
  const cloud = `<g class="drift" style="animation-delay:-${seed % 60}s" opacity="${sun.alt > -4 ? 0.7 : 0.25}">
    <g transform="translate(${x0 + 120},${104 + (seed % 20)})" fill="${tint}"><ellipse cx="0" cy="0" rx="30" ry="9"/><ellipse cx="-12" cy="-6" rx="14" ry="10"/><ellipse cx="9" cy="-8" rx="16" ry="12"/></g></g>`;

  return {
    defs: `<linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
      <linearGradient id="water-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(bottom, '#000000', 0.35)}"/><stop offset="1" stop-color="${mix(top, '#000000', 0.6)}"/></linearGradient>
      <radialGradient id="glow-${id}"><stop offset="0" stop-color="${sunColor}" stop-opacity=".75"/><stop offset="1" stop-color="${sunColor}" stop-opacity="0"/></radialGradient>`,
    sky: `<rect width="${W}" height="${H}" fill="url(#sky-${id})"/>${stars}${moonSvg}${sunSvg}${cloud}`,
    water: `<rect y="${G}" width="${W}" height="${H - G}" fill="url(#water-${id})"/>`,
    reflect: sun.alt > -2 && sx > x0 && sx < x0 + MID ? { x: sx, color: sunColor } : null,
    light: clamp((sun.alt + 6) / 20, 0, 1), // 0 = dark, 1 = daylight
    lamps: clamp((3 - sun.alt) / 8, 0, 1),
  };
}

function shimmer(r, i0) {
  if (!r) return '';
  let out = '';
  for (let i = 0; i < 7; i++) {
    const w = 28 - i * 2.6;
    out += `<rect x="${(r.x - w / 2).toFixed(1)}" y="${G + 8 + i * 10}" width="${w.toFixed(1)}" height="2" rx="1" fill="${r.color}" class="shim" style="animation-delay:-${(i0 + i * 0.4).toFixed(1)}s"/>`;
  }
  return out;
}

export function renderJourney(now = new Date()) {
  const off = cairoOffset(now);
  const cairoTime = new Date(now.getTime() + off * 3600e3);
  const volgoTime = new Date(now.getTime() + CITY.utcOffset * 3600e3);
  const L = heavens('c', sky(now, CAIRO), 0, 11);
  const R = heavens('v', sky(now, CITY), MID, 47);
  const rand = mulberry32(5);

  // Cairo ground: dunes, pyramids, palm — shaded by Cairo's daylight.
  const sand = mix('#3a2c22', '#e2b26b', L.light);
  const lit = mix('#4a3a2c', '#dcab5f', L.light);
  const shade = mix('#241b16', '#a87436', L.light);
  const palm = mix('#14261a', '#2f7d3a', L.light);
  const trunk = mix('#2a1c12', '#6b4423', L.light);
  const pyramid = (x, apex, w) =>
    `<polygon points="${x - w},${G} ${x},${apex} ${x + w},${G}" fill="${lit}"/><polygon points="${x},${apex} ${x + w},${G} ${x + w * 0.28},${G}" fill="${shade}"/>`;
  const cairo = `
    <path d="M0,${G} L0,${G - 12} C110,${G - 24} 260,${G - 10} ${MID + 40},${G - 6} L${MID + 40},${G} Z" fill="${sand}"/>
    ${pyramid(52, 178, 38)}${pyramid(160, 112, 92)}${pyramid(282, 160, 52)}
    <polygon points="160,112 252,${G} 186,${G}" fill="#fff" class="shine"/>
    <g class="palm">
      <rect x="364" y="${G - 74}" width="6" height="74" rx="3" fill="${trunk}"/>
      <g fill="${palm}"><path d="M367,${G - 74} q-30,-6 -44,14 q22,-16 44,-10Z"/><path d="M367,${G - 74} q30,-8 46,10 q-22,-12 -46,-6Z"/>
      <path d="M367,${G - 74} q-14,-24 -38,-24 q24,6 38,20Z"/><path d="M367,${G - 74} q12,-26 38,-26 q-24,8 -38,22Z"/></g>
    </g>`;

  // Volgograd ground: city blocks, hill, the Motherland Calls — lit by Volgograd's sky.
  const land = mix('#05070d', '#24324a', R.light);
  let blocks = '';
  let windows = '';
  for (let x = MID + 20; x < 640; ) {
    const bw = 12 + Math.floor(rand() * 22);
    const bh = 14 + Math.floor(rand() * 40) * (x > 580 ? 0.5 : 1);
    blocks += `<rect x="${x}" y="${G - bh}" width="${bw}" height="${bh}"/>`;
    for (let wy = G - bh + 5; wy < G - 4; wy += 7)
      for (let wx = x + 3; wx < x + bw - 4; wx += 6) if (rand() < 0.35) windows += `<rect x="${wx}" y="${wy}" width="2.4" height="3"/>`;
    x += bw + 1 + Math.floor(rand() * 3);
  }
  const month = volgoTime.getUTCMonth();
  let snow = '';
  if (month === 11 || month <= 2) {
    for (let i = 0; i < 24; i++) {
      snow += `<circle cx="${MID + 20 + ((i * 97) % 390)}" cy="0" r="${1.3 + (i % 3) * 0.6}" fill="#fff" class="snow" style="animation-duration:${12 + (i % 5) * 2}s;animation-delay:-${(i * 1.4) % 18}s"/>`;
    }
  }
  const volga = `
    <path d="M600,${G} C640,${G - 30} 680,${G - 62} 730,${G - 64} C780,${G - 66} 805,${G - 48} ${W},${G - 40} L${W},${G} Z" fill="${land}"/>
    <ellipse cx="730" cy="${G - 120}" rx="40" ry="62" fill="url(#flood)" opacity="${R.lamps.toFixed(2)}"/>
    <g transform="translate(730,${G - 64}) scale(0.8)" fill="${land}" stroke="${land}" stroke-linecap="round">
      <rect x="-7" y="-7" width="14" height="7" stroke="none"/>
      <path stroke="none" d="M-5,-7 L6,-7 L4,-30 L5,-47 L2,-54 L-3,-54 L-6,-46 L-9,-30 L-17,-12 L-10,-7 Z"/>
      <path stroke="none" d="M-3,-50 C-12,-50 -22,-44 -26,-36 C-20,-38 -16,-34 -14,-28 C-12,-36 -8,-40 -4,-42 Z"/>
      <circle cx="0" cy="-58" r="3.6" stroke="none"/>
      <line x1="2" y1="-52" x2="12" y2="-67" stroke-width="3.2"/><line x1="12" y1="-67" x2="25" y2="-98" stroke-width="2"/>
      <line x1="-2" y1="-51" x2="-19" y2="-58" stroke-width="2.8"/>
    </g>
    <g fill="${land}">${blocks}</g>
    <g fill="#ffd27a" opacity="${(R.lamps * 0.9).toFixed(2)}">${windows}</g>
    <rect x="520" y="${G - 70}" width="4" height="70" fill="${land}"/>
    <circle cx="522" cy="${G - 72}" r="2" fill="#ff3b30" class="blink" opacity="${Math.max(R.lamps, 0.35).toFixed(2)}"/>
    ${snow}`;

  // Flight: Cairo pin → Volgograd pin. The plane is drawn nose-first along +x,
  // so rotate="auto" keeps it facing where it's going.
  const route = 'M160,104 C280,0 520,0 668,150';
  const plane = `<g>
      <animateMotion dur="16s" repeatCount="indefinite" rotate="auto" keyPoints="0;1;1" keyTimes="0;0.8;1" calcMode="linear" path="${route}"/>
      <path transform="scale(1.25)" fill="#ffffff" stroke="#0d1117" stroke-opacity=".35" stroke-width="1" stroke-linejoin="round"
        d="M22,0 C22,-2 19,-3 16,-3 L4,-3 L-6,-16 L-11,-16 L-4,-3 L-14,-3 L-19,-9 L-22,-9 L-19,0 L-22,9 L-19,9 L-14,3 L-4,3 L-11,16 L-6,16 L4,3 L16,3 C19,3 22,2 22,0 Z"/>
    </g>`;

  const label = (x, flag, city, time, note, anchorRight) => {
    const w = 196;
    const bx = anchorRight ? x - w : x;
    return `<g class="t in">
      <rect x="${bx}" y="16" width="${w}" height="54" rx="12" fill="#0d1117" opacity=".55"/>
      ${flag(bx + 14, 33)}
      <text x="${bx + 56}" y="38" font-size="13" font-weight="700" fill="#fff" letter-spacing="1.5">${city} <tspan font-weight="400" opacity=".85">${time}</tspan></text>
      <text x="${bx + 56}" y="57" font-size="11" fill="#fff" opacity=".75">${note}</text>
    </g>`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${L.defs}${R.defs}
    <radialGradient id="flood"><stop offset="0" stop-color="#ffe2a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe2a8" stop-opacity="0"/></radialGradient>
    <linearGradient id="seam" x1="0" y1="0" x2="1" y2="0"><stop offset="0.42" stop-color="#fff" stop-opacity="0"/><stop offset="0.58" stop-color="#fff" stop-opacity="1"/></linearGradient>
    <mask id="right"><rect width="${W}" height="${H}" fill="url(#seam)"/></mask>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath>
  </defs>
  <style>
    .t { font-family: ${FONT}; }
    .tw { animation: tw 4s ease-in-out infinite alternate; } @keyframes tw { to { opacity: .15; } }
    .drift { animation: drift 160s linear infinite; } @keyframes drift { from { transform: translateX(-200px); } to { transform: translateX(${W}px); } }
    .palm { transform-box: fill-box; transform-origin: center bottom; animation: palm 7s ease-in-out infinite alternate; }
    @keyframes palm { from { transform: rotate(-3deg); } to { transform: rotate(3deg); } }
    .shine { animation: shine 7s ease-in-out infinite; } @keyframes shine { 0%,100% { opacity: 0; } 50% { opacity: ${(0.3 * L.light).toFixed(2)}; } }
    .shim { animation: shim 3s ease-in-out infinite alternate; } @keyframes shim { from { opacity: .85; transform: translateX(-3px); } to { opacity: .2; transform: translateX(3px); } }
    .rip { animation: rip 8s ease-in-out infinite alternate; } @keyframes rip { from { transform: translateX(-14px); } to { transform: translateX(14px); } }
    .snow { animation: snow 16s linear infinite; } @keyframes snow { from { transform: translate(0,-10px); } to { transform: translate(14px,${G + 10}px); } }
    .blink { animation: blink 2s steps(1) infinite; } @keyframes blink { 50% { opacity: 0; } }
    .route { stroke-dasharray: 2 9; animation: dash 2.8s linear infinite; } @keyframes dash { to { stroke-dashoffset: -11; } }
    .ping { transform-box: fill-box; transform-origin: center; animation: ping 3.6s ease-out infinite; }
    @keyframes ping { from { transform: scale(.4); opacity: .9; } to { transform: scale(2.6); opacity: 0; } }
    .in { opacity: 0; animation: in 1.6s ease-out forwards; } @keyframes in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  </style>
  <g clip-path="url(#frame)">
    ${L.sky}
    <g mask="url(#right)">${R.sky}</g>
    ${cairo}
    ${volga}
    ${L.water}
    <g mask="url(#right)">${R.water}</g>
    ${shimmer(L.reflect, 0)}${shimmer(R.reflect, 1.3)}
    ${Array.from({ length: 12 }, (_, i) => `<rect x="${(i * 71) % W}" y="${G + 12 + ((i * 23) % 66)}" width="${24 + (i % 4) * 8}" height="1.2" fill="#fff" opacity=".12" class="rip" style="animation-delay:-${i}s"/>`).join('')}

    <path d="${route}" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" class="route" opacity=".85"/>
    <circle cx="160" cy="104" r="6" fill="#ce1126" stroke="#fff" stroke-width="2"/><circle cx="160" cy="104" r="6" fill="none" stroke="#fff" stroke-width="2" class="ping"/>
    <circle cx="668" cy="150" r="6" fill="#0039a6" stroke="#fff" stroke-width="2"/><circle cx="668" cy="150" r="6" fill="none" stroke="#fff" stroke-width="2" class="ping" style="animation-delay:-1.8s"/>
    ${plane}

    ${label(16, flagEG, 'CAIRO', hhmm(cairoTime), 'born &amp; raised', false)}
    ${label(W - 16, flagRU, 'VOLGOGRAD', hhmm(volgoTime), 'living here now', true)}
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${C.border}"/>
</svg>
`;
}
