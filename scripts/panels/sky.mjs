// A live view over the Volga: the sun, moon, stars and city lights all follow
// the real sky above Volgograd at render time.
import { CITY, FONT, C, clamp, mix, cityTime, hhmm, esc } from '../lib.mjs';

const W = 820;
const H = 300;
const HORIZON = 214;
const RAD = Math.PI / 180;

// ---------- astronomy (low-precision, plenty for a picture) ----------

export function sky(date, place = CITY) {
  const d = date.getTime() / 86400000 - 10957.5; // days since J2000
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const lst = ((((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24) * 15 + place.lon;

  // Moon phase: days since a known new moon, as a 0..1 fraction of the cycle.
  const phase = ((((date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % 29.530588) + 29.530588) % 29.530588 / 29.530588;

  const onEcliptic = (lambda) => ({
    ra: Math.atan2(Math.cos(e) * Math.sin(lambda), Math.cos(lambda)),
    dec: Math.asin(Math.sin(e) * Math.sin(lambda)),
  });

  const sun = altAz(onEcliptic(L), lst, place.lat);
  // Treat the moon as riding the ecliptic, `phase` of a turn ahead of the sun.
  const moon = altAz(onEcliptic(L + phase * 2 * Math.PI), lst, place.lat);
  return { sun, moon, phase };
}

function altAz({ ra, dec }, lstDeg, latDeg) {
  const lat = latDeg * RAD;
  const h = lstDeg * RAD - ra;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h));
  let az = Math.atan2(-Math.sin(h), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(h)) / RAD;
  az = (az + 360) % 360;
  return { alt: alt / RAD, az };
}

// ---------- palette ----------

const KEYS = [
  [-18, '#03050c', '#0b1226'],
  [-12, '#070b1d', '#1a1f45'],
  [-6, '#1b1f4b', '#6b3f6e'],
  [-2, '#2d3a75', '#e0785a'],
  [3, '#3d5c9a', '#ffb072'],
  [10, '#4a7cc0', '#ffd29a'],
  [25, '#2f6fc4', '#a8d4ff'],
  [70, '#1f5fbf', '#8cc8ff'],
];

export function skyColors(alt) {
  if (alt <= KEYS[0][0]) return [KEYS[0][1], KEYS[0][2]];
  for (let i = 1; i < KEYS.length; i++) {
    const [a1, t1, b1] = KEYS[i];
    if (alt <= a1) {
      const [a0, t0, b0] = KEYS[i - 1];
      const t = (alt - a0) / (a1 - a0);
      return [mix(t0, t1, t), mix(b0, b1, t)];
    }
  }
  return [KEYS.at(-1)[1], KEYS.at(-1)[2]];
}

export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const toX = (az) => clamp(((az - 45) / 270) * W, -40, W + 40);
const toY = (alt) => HORIZON - (alt / 70) * (HORIZON - 34);

function describe(sunAlt, sunAz, localHour) {
  const morning = sunAz < 180;
  if (sunAlt < -12) return localHour >= 1 && localHour < 5 ? 'deep night · the city is asleep' : 'night over the Volga';
  if (sunAlt < -6) return morning ? 'blue hour before dawn' : 'blue hour after dusk';
  if (sunAlt < 0) return morning ? 'dawn over the Volga' : 'dusk over the Volga';
  if (sunAlt < 8) return morning ? 'sunrise · golden hour' : 'sunset · golden hour';
  if (localHour < 12) return 'morning';
  return localHour < 17 ? 'afternoon' : 'evening';
}

function moonName(p) {
  const names = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];
  return names[Math.round(p * 8) % 8];
}

// ---------- render ----------

export function renderSky(now = new Date()) {
  const { sun, moon, phase } = sky(now);
  const local = cityTime(now);
  const [top, bottom] = skyColors(sun.alt);
  const night = clamp(-sun.alt / 12, 0, 1); // 0 = day, 1 = full night
  const lights = clamp((3 - sun.alt) / 8, 0, 1); // city lights come on a bit before sunset
  const land = mix('#24324a', '#05070d', clamp((8 - sun.alt) / 18, 0, 1));
  const landFar = mix('#3b4f6e', '#0b1020', clamp((8 - sun.alt) / 18, 0, 1));
  const rand = mulberry32(42);

  // Stars
  let stars = '';
  if (night > 0.05) {
    for (let i = 0; i < 80; i++) {
      const x = rand() * W;
      const y = 8 + rand() * (HORIZON - 60);
      const r = rand() < 0.12 ? 1.4 : 0.8;
      const dur = (2 + rand() * 4).toFixed(1);
      const delay = (rand() * 4).toFixed(1);
      stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#fff" class="tw" style="animation-duration:${dur}s;animation-delay:-${delay}s"/>`;
    }
  }

  // Sun (glow + disc). Drawn even slightly below the horizon so twilight glows.
  const sx = toX(sun.az);
  const sy = toY(sun.alt);
  const sunWarm = clamp(1 - sun.alt / 25, 0, 1);
  const sunColor = mix('#fff6d5', '#ff8a3d', sunWarm);
  const sunSvg =
    sun.alt > -8
      ? `<circle cx="${sx}" cy="${sy}" r="120" fill="url(#sunglow)" opacity="${clamp((sun.alt + 8) / 10, 0, 1).toFixed(2)}"/>
         <circle cx="${sx}" cy="${sy}" r="15" fill="${sunColor}"/>`
      : '';

  // Moon with its phase shadow.
  const mx = toX(moon.az);
  const my = toY(moon.alt);
  const mr = 11;
  const shadowDx = phase < 0.5 ? -2 * mr * (phase / 0.5) : 2 * mr * (1 - (phase - 0.5) / 0.5);
  const moonSvg =
    moon.alt > -2
      ? `<g opacity="${(0.35 + 0.65 * night).toFixed(2)}">
        <circle cx="${mx}" cy="${my}" r="40" fill="url(#moonglow)" opacity="${night.toFixed(2)}"/>
        <clipPath id="moonclip"><circle cx="${mx}" cy="${my}" r="${mr}"/></clipPath>
        <circle cx="${mx}" cy="${my}" r="${mr}" fill="#f4f1e6"/>
        <circle cx="${mx + shadowDx}" cy="${my}" r="${mr + 0.5}" fill="${mix(top, bottom, my / HORIZON)}" opacity="0.92" clip-path="url(#moonclip)"/>
      </g>`
      : '';

  // Clouds tinted by the light.
  const cloudTint = sun.alt > 10 ? '#ffffff' : sun.alt > -4 ? '#ffc2a8' : '#5a6488';
  const cloudOp = sun.alt > -4 ? 0.75 : 0.25;
  const cloud = (x, y, s, dur, delay) =>
    `<g class="drift" style="animation-duration:${dur}s;animation-delay:-${delay}s" opacity="${cloudOp}">
      <g transform="translate(${x},${y}) scale(${s})" fill="${cloudTint}">
        <ellipse cx="0" cy="0" rx="34" ry="10"/><ellipse cx="-14" cy="-6" rx="16" ry="11"/><ellipse cx="10" cy="-9" rx="18" ry="13"/>
      </g></g>`;
  const clouds = cloud(560, 40, 0.9, 160, 10) + cloud(470, 70, 0.7, 200, 120) + cloud(300, 36, 0.6, 140, 60);

  // City blocks with windows on the left bank.
  let city = '';
  let windows = '';
  for (let x = 0; x < 560; ) {
    const bw = 14 + Math.floor(rand() * 26);
    const bh = 14 + Math.floor(rand() * 42) * (x > 420 ? 0.5 : 1);
    city += `<rect x="${x}" y="${HORIZON - bh}" width="${bw}" height="${bh}"/>`;
    for (let wy = HORIZON - bh + 5; wy < HORIZON - 4; wy += 7) {
      for (let wx = x + 3; wx < x + bw - 4; wx += 6) {
        if (rand() < 0.35) windows += `<rect x="${wx}" y="${wy}" width="2.4" height="3"/>`;
      }
    }
    x += bw + 1 + Math.floor(rand() * 3);
  }

  // Mamayev Kurgan + The Motherland Calls, floodlit at night.
  const statue = `
  <g transform="translate(700,150)" fill="${land}" stroke="${land}" stroke-linecap="round">
    <ellipse cx="0" cy="-48" rx="45" ry="70" fill="url(#flood)" stroke="none" opacity="${lights.toFixed(2)}"/>
    <rect x="-7" y="-7" width="14" height="7" stroke="none"/>
    <path stroke="none" d="M-5,-7 L6,-7 L4,-30 L5,-47 L2,-54 L-3,-54 L-6,-46 L-9,-30 L-17,-12 L-10,-7 Z"/>
    <path stroke="none" d="M-3,-50 C-12,-50 -22,-44 -26,-36 C-20,-38 -16,-34 -14,-28 C-12,-36 -8,-40 -4,-42 Z"/>
    <circle cx="0" cy="-58" r="3.6" stroke="none"/>
    <line x1="2" y1="-52" x2="12" y2="-67" stroke-width="3.2"/>
    <line x1="12" y1="-67" x2="25" y2="-98" stroke-width="2"/>
    <line x1="-2" y1="-51" x2="-19" y2="-58" stroke-width="2.8"/>
  </g>`;

  // Reflection of whichever light is up.
  const reflectX = sun.alt > -2 ? sx : moon.alt > 0 ? mx : null;
  const reflectColor = sun.alt > -2 ? sunColor : '#f4f1e6';
  let reflection = '';
  if (reflectX !== null && reflectX > 0 && reflectX < W) {
    for (let i = 0; i < 9; i++) {
      const y = HORIZON + 8 + i * 9;
      const w = 34 - i * 2.4;
      reflection += `<rect x="${(reflectX - w / 2).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="2" rx="1" fill="${reflectColor}" class="shim" style="animation-delay:-${(i * 0.37).toFixed(2)}s"/>`;
    }
  }

  let ripples = '';
  for (let i = 0; i < 14; i++) {
    const x = rand() * W;
    const y = HORIZON + 10 + rand() * 76;
    ripples += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${(18 + rand() * 30).toFixed(0)}" height="1.2" fill="#ffffff" opacity="0.10" class="rip" style="animation-delay:-${(rand() * 6).toFixed(1)}s"/>`;
  }

  const label = describe(sun.alt, sun.az, local.getUTCHours());
  const sunLine =
    sun.alt >= 0
      ? `sun ${sun.alt.toFixed(0)}° above the horizon`
      : `sun ${Math.abs(sun.alt).toFixed(0)}° below the horizon`;
  const moonLine = `${moonName(phase)} · ${Math.round((1 - Math.cos(phase * 2 * Math.PI)) * 50)}% lit`;
  const textColor = '#f0f6fc';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(bottom, '#000000', 0.35)}"/><stop offset="1" stop-color="${mix(top, '#000000', 0.6)}"/></linearGradient>
    <radialGradient id="sunglow"><stop offset="0" stop-color="${sunColor}" stop-opacity="0.75"/><stop offset="1" stop-color="${sunColor}" stop-opacity="0"/></radialGradient>
    <radialGradient id="moonglow"><stop offset="0" stop-color="#dfe8ff" stop-opacity="0.45"/><stop offset="1" stop-color="#dfe8ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="flood"><stop offset="0" stop-color="#ffe2a8" stop-opacity="0.55"/><stop offset="1" stop-color="#ffe2a8" stop-opacity="0"/></radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0d1117" stop-opacity="0.72"/><stop offset="1" stop-color="#0d1117" stop-opacity="0"/></linearGradient>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath>
  </defs>
  <style>
    .t { font-family: ${FONT}; }
    .tw { animation: tw 3s ease-in-out infinite alternate; }
    @keyframes tw { from { opacity: ${(night * 0.95).toFixed(2)}; } to { opacity: ${(night * 0.2).toFixed(2)}; } }
    .drift { animation: drift 120s linear infinite; }
    @keyframes drift { from { transform: translateX(-260px); } to { transform: translateX(${W + 120}px); } }
    .shim { animation: shim 2.4s ease-in-out infinite alternate; }
    @keyframes shim { from { opacity: 0.85; transform: translateX(-3px); } to { opacity: 0.25; transform: translateX(3px); } }
    .rip { animation: rip 6s ease-in-out infinite alternate; }
    @keyframes rip { from { transform: translateX(-12px); } to { transform: translateX(12px); } }
    .blink { animation: blink 1.6s steps(1) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
  </style>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    ${stars}
    ${moonSvg}
    ${sunSvg}
    ${clouds}
    <path fill="${landFar}" d="M0,${HORIZON} L0,196 C80,186 160,198 240,190 C320,182 400,196 480,188 L560,${HORIZON} Z"/>
    <path fill="${land}" d="M540,${HORIZON} C600,${HORIZON - 30} 640,152 700,150 C760,148 790,170 ${W},180 L${W},${HORIZON} Z"/>
    ${statue}
    <g fill="${land}">${city}</g>
    <g fill="#ffd27a" opacity="${(lights * 0.9).toFixed(2)}">${windows}</g>
    <rect x="236" y="${HORIZON - 74}" width="5" height="74" fill="${land}"/>
    <circle cx="238.5" cy="${HORIZON - 76}" r="2.2" fill="#ff3b30" class="blink" opacity="${Math.max(lights, 0.35).toFixed(2)}"/>
    <rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#water)"/>
    ${reflection}
    ${ripples}

    <rect width="380" height="${H}" fill="url(#fade)"/>
    <g class="t" fill="${textColor}">
      <text x="28" y="44" font-size="11" letter-spacing="3.5" opacity="0.8">${esc(CITY.name.toUpperCase())} · ${CITY.lat.toFixed(2)}°N ${CITY.lon.toFixed(2)}°E</text>
      <text x="26" y="98" font-size="52" font-weight="700">${hhmm(local)}<tspan font-size="18" font-weight="400" opacity="0.75" dx="8">${CITY.tz}</tspan></text>
      <text x="28" y="126" font-size="14">${esc(label)}</text>
      <text x="28" y="148" font-size="11.5" opacity="0.75">${esc(sunLine)}</text>
      <text x="28" y="166" font-size="11.5" opacity="0.75">${esc(moonLine)}</text>
    </g>
    <text x="${W - 16}" y="${H - 14}" text-anchor="end" class="t" font-size="10" fill="#ffffff" opacity="0.45">the real sky over the Volga · re-rendered hourly by GitHub Actions</text>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${C.border}"/>
</svg>
`;
}
