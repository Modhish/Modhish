// Yozhik (Ёжик), the profile hedgehog. State lives in data/pet.json and is
// changed by visitors through issues (see scripts/interact.mjs).
import { C, esc, frame, ago, clip, cityTime } from '../lib.mjs';

export const XP = { apple: 3, pet: 1, play: 2 };
export const VERB = { apple: 'fed an apple 🍎', pet: 'gave pets 🤲', play: 'played catch 🎾' };

export const level = (xp) => Math.floor(Math.sqrt(xp / 5)) + 1;
const xpFor = (lv) => 5 * (lv - 1) ** 2;

const SPRITE = [
  '......S.S.S.....',
  '....SSsSsSsS....',
  '...SsSsSsSsSS...',
  '..SsSsSsSsSsFF..',
  '.SsSsSsSsSsFFFF.',
  '.SSsSsSsSsFFEFF.',
  'SsSsSsSsSsFFFFFN',
  'SSsSsSsSsSFCFFF.',
  '.SSSSSSSSSFFFF..',
  '..FFFFFFFFFFF...',
  '...PP....PP.....',
];
const PAL = { S: '#5b3a29', s: '#8f5e3d', F: '#ecc9a2', E: '#111111', N: '#2b1a12', C: '#f29a9a', P: '#4a2e20' };

export function mood(state, now = new Date()) {
  const hour = cityTime(now).getUTCHours();
  const sinceAny = state.last ? (now - new Date(state.last.at)) / 3600e3 : Infinity;
  const sinceApple = state.lastApple ? (now - new Date(state.lastApple)) / 3600e3 : Infinity;
  if (sinceAny < 3) return { key: 'joy', text: 'overjoyed — someone just visited!' };
  if (hour < 7) return { key: 'sleep', text: `asleep — it's ${hour}am in Volgograd` };
  if (sinceApple > 24) return { key: 'hungry', text: 'hungry… an apple would help' };
  return { key: 'ok', text: 'content, wandering around the README' };
}

/** The sprite split into layers so each part can move on its own. */
function sprite(px, m) {
  const layers = { spines: '', body: '', nose: '', legA: '', legB: '' };
  SPRITE.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const c = ch === 'E' && m === 'sleep' ? 'F' : ch;
      const rect = `<rect x="${x * px}" y="${y * px}" width="${px + 0.4}" height="${px + 0.4}" fill="${PAL[c]}"/>`;
      if (ch === 'S' || ch === 's') layers.spines += rect;
      else if (ch === 'N') layers.nose += rect;
      else if (ch === 'P') layers[x < 6 ? 'legA' : 'legB'] += rect;
      else layers.body += rect;
    }),
  );
  const eye =
    m === 'sleep'
      ? `<rect x="${12 * px}" y="${5.6 * px}" width="${px}" height="${px * 0.3}" fill="${PAL.E}"/>`
      : `<rect x="${12.5 * px}" y="${5.15 * px}" width="${px * 0.35}" height="${px * 0.35}" fill="#ffffff"/>
         <rect x="${12 * px}" y="${5 * px}" width="${px + 0.4}" height="${px + 0.4}" fill="${PAL.F}" class="lid"/>`;
  return `<g class="legA">${layers.legA}</g><g class="legB">${layers.legB}</g>
    <g class="bristle">${layers.spines}</g>${layers.body}${eye}<g class="sniff">${layers.nose}</g>`;
}

function friends(state) {
  const n = Object.keys(state.visitors || {}).length;
  return `${n} friend${n === 1 ? '' : 's'}`;
}

function season(month) {
  if (month >= 8 && month <= 10) return 'autumn';
  if (month === 11 || month <= 1) return 'winter';
  return month <= 4 ? 'spring' : 'summer';
}

function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

/** Ambient life in the scene: weather by real season, critters by time of day. */
function ambient(local, sceneW, ground) {
  const r = rng(7);
  const s = season(local.getUTCMonth());
  const hour = local.getUTCHours();
  const night = hour < 6 || hour >= 20;
  let out = '';

  if (s === 'autumn') {
    const colors = ['#e8833a', '#d9a13b', '#c4462f', '#b8732e'];
    for (let i = 0; i < 7; i++) {
      const x = 20 + r() * (sceneW - 40);
      out += `<g class="leaf" style="animation-duration:${(7 + r() * 5).toFixed(1)}s;animation-delay:-${(r() * 10).toFixed(1)}s">
        <path transform="translate(${x.toFixed(0)},40)" d="M0,0 C6,-6 14,-2 12,6 C6,10 0,6 0,0 Z" fill="${colors[i % 4]}"/></g>`;
    }
  } else if (s === 'winter') {
    for (let i = 0; i < 22; i++) {
      out += `<circle cx="${(r() * sceneW).toFixed(0)}" cy="40" r="${(1.5 + r() * 2).toFixed(1)}" fill="#ffffff" class="snow"
        style="animation-duration:${(5 + r() * 6).toFixed(1)}s;animation-delay:-${(r() * 10).toFixed(1)}s"/>`;
    }
  }

  if (night) {
    for (let i = 0; i < 6; i++) {
      out += `<circle cx="${(30 + r() * (sceneW - 60)).toFixed(0)}" cy="${(70 + r() * (ground - 110)).toFixed(0)}" r="2.6" fill="#f6ff8a" class="fly"
        style="animation-delay:-${(r() * 6).toFixed(1)}s"/>`;
    }
  } else if (s !== 'winter') {
    out += `<g>
      <animateMotion dur="11s" repeatCount="indefinite" path="M40,110 C120,40 220,150 300,80 C330,60 260,40 200,90 C140,140 60,160 40,110 Z"/>
      <g class="wing"><ellipse cx="-5" cy="0" rx="6" ry="8" fill="${C.purple}"/><ellipse cx="5" cy="0" rx="6" ry="8" fill="${C.pink}"/></g>
      <rect x="-1" y="-6" width="2" height="12" rx="1" fill="#2b1a12"/>
    </g>`;
  }
  return { svg: out, label: `${s}${night ? ' night' : ''}` };
}

export function renderPet(state, now = new Date()) {
  const W = 820;
  const H = 330;
  const px = 13;
  const sceneW = 340;
  const ground = 284;
  const m = mood(state, now);
  const lv = level(state.xp);
  const cur = state.xp - xpFor(lv);
  const need = xpFor(lv + 1) - xpFor(lv);
  const local = cityTime(now);

  const spriteW = 16 * px;
  const spriteH = 11 * px;
  const sx = 50;
  const sy = ground - spriteH + 4;

  const extras = {
    sleep: `<g class="t" fill="${C.muted}" font-weight="700">
      <text x="${sx + 200}" y="${sy + 20}" font-size="16" class="z">z</text>
      <text x="${sx + 214}" y="${sy}" font-size="22" class="z" style="animation-delay:-1s">z</text>
      <text x="${sx + 232}" y="${sy - 22}" font-size="28" class="z" style="animation-delay:-2s">Z</text></g>`,
    hungry: `<g transform="translate(${sx + 214},${sy - 46})" class="pulse">
      <circle cx="-22" cy="52" r="4" fill="${C.text}" opacity="0.6"/><circle cx="-10" cy="38" r="6" fill="${C.text}" opacity="0.6"/>
      <ellipse cx="18" cy="10" rx="36" ry="26" fill="${C.text}" opacity="0.92"/>
      <circle cx="18" cy="13" r="12" fill="${C.red}"/><rect x="17" y="-4" width="2.4" height="7" fill="#5b3a29"/><ellipse cx="24" cy="-2" rx="6" ry="3" fill="${C.green}"/></g>`,
    joy:
      [0, 1, 2, 3]
        .map((i) => `<text x="${sx + 150 + i * 20}" y="${sy + 10}" font-size="${20 - i * 2}" class="heart" style="animation-delay:-${(i * 0.55).toFixed(2)}s">❤</text>`)
        .join('') +
      [0, 1, 2]
        .map((i) => `<path transform="translate(${sx + 30 + i * 70},${sy - 10 + (i % 2) * 20})" d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="${C.yellow}" class="spark" style="animation-delay:-${(i * 0.4).toFixed(1)}s"/>`)
        .join(''),
    ok: '',
  }[m.key];

  // Apples he's been given, bobbing in the grass.
  let appleSvg = '';
  for (let i = 0; i < Math.min(3, state.apples); i++) {
    const ax = [26, 300, 318][i];
    appleSvg += `<g class="bob" style="animation-delay:-${i * 0.6}s"><circle cx="${ax}" cy="${ground + 4}" r="7.5" fill="${C.red}"/>
      <rect x="${ax - 1}" y="${ground - 8}" width="2" height="5" fill="#5b3a29"/><ellipse cx="${ax + 4}" cy="${ground - 7}" rx="4" ry="2" fill="${C.green}"/></g>`;
  }

  // Grass tufts that sway.
  let grass = '';
  for (let x = 12; x < sceneW - 8; x += 22) {
    grass += `<path d="M${x},${ground + 10} q2,-14 -3,-20 M${x + 4},${ground + 10} q0,-16 4,-22 M${x + 8},${ground + 10} q3,-10 7,-13" class="blade" style="animation-delay:-${((x * 7) % 30) / 10}s"/>`;
  }

  const amb = ambient(local, sceneW, ground);
  const moving = m.key === 'ok' || m.key === 'hungry';
  const walkClass = moving ? 'walk' : '';
  const flipClass = moving ? 'flip' : '';
  const bodyClass = m.key === 'joy' ? 'hop' : m.key === 'sleep' ? 'breathe slow' : 'breathe';

  const recent = (state.history || []).slice(0, 4);
  const tx = 372;
  const barW = 410;
  const fill = need ? Math.min(1, cur / need) : 1;

  const body = `
    <clipPath id="scene"><rect x="0" y="39" width="${sceneW}" height="${H - 39}"/></clipPath>
    <g clip-path="url(#scene)">
      <rect x="0" y="39" width="${sceneW}" height="${H - 39}" fill="url(#bg)"/>
      ${amb.svg}
      <ellipse cx="${sceneW / 2}" cy="${ground + 30}" rx="${sceneW / 2 + 30}" ry="40" fill="#1b3a24"/>
      <ellipse cx="${sceneW / 2}" cy="${ground + 14}" rx="${sceneW / 2 - 10}" ry="16" fill="#24502f"/>
      <g stroke="#3f8f4f" stroke-width="2" fill="none" stroke-linecap="round">${grass}</g>
      <ellipse cx="${sx + spriteW / 2}" cy="${ground + 6}" rx="${spriteW / 2.4}" ry="7" fill="#000" opacity="0.25" class="${walkClass}"/>
      ${appleSvg}
      <g transform="translate(${sx},${sy})">
        <g class="${walkClass}"><g class="${flipClass}"><g class="${bodyClass} ${moving ? 'stepping' : ''}">${sprite(px, m.key)}</g></g></g>
      </g>
      ${extras}
      <text x="12" y="${H - 12}" class="t" font-size="10" fill="#ffffff" opacity="0.4">live: ${esc(amb.label)} in Volgograd</text>
    </g>
    <line x1="${sceneW}" y1="39" x2="${sceneW}" y2="${H}" stroke="${C.border}"/>

    <g class="t">
      <text x="${tx}" y="84" font-size="24" font-weight="700" fill="${C.text}">Yozhik <tspan fill="${C.muted}" font-weight="400" font-size="17">· Ёжик</tspan></text>
      <text x="${tx}" y="108" font-size="12.5" fill="${C.muted}">profile hedgehog · born ${esc(state.born.slice(0, 10))} · ${friends(state)}</text>

      <text x="${tx}" y="142" font-size="13" fill="${C.text}"><tspan fill="${C.yellow}" font-weight="700">LV ${lv}</tspan>  ${cur}/${need} xp to next level</text>
      <rect x="${tx}" y="150" width="${barW}" height="9" rx="4.5" fill="${C.panel}" stroke="${C.border}"/>
      <rect x="${tx}" y="150" width="${(barW * fill).toFixed(1)}" height="9" rx="4.5" fill="url(#xp)" class="xpbar"/>

      <text x="${tx}" y="186" font-size="13" fill="${C.text}">mood: <tspan fill="${C.cyan}">${esc(m.text)}</tspan></text>
      <text x="${tx}" y="210" font-size="13" fill="${C.text}">🍎 ${state.apples} apples   🤲 ${state.pets} pets   🎾 ${state.plays} plays</text>
      <line x1="${tx}" y1="226" x2="${tx + barW}" y2="226" stroke="${C.border}" stroke-dasharray="3 4"/>
      ${
        recent
          .map(
            (h, i) =>
              `<text x="${tx}" y="${248 + i * 17}" font-size="11.5" fill="${C.muted}" class="row" style="animation-delay:${(0.15 * i).toFixed(2)}s"><tspan fill="${C.blue}">@${esc(clip(h.login, 20))}</tspan> ${esc(VERB[h.action])} · ${esc(ago(h.at, now))}</text>`,
          )
          .join('') || `<text x="${tx}" y="248" font-size="11.5" fill="${C.muted}">no visitors yet — be the first ↓</text>`
      }
    </g>`;

  return frame({
    w: W,
    h: H,
    title: 'yozhik.exe — tap a button below, then press “Create” on GitHub',
    defs: `<linearGradient id="xp" x1="0" x2="1"><stop offset="0" stop-color="${C.yellow}"/><stop offset="1" stop-color="${C.orange}"/></linearGradient>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1a2b"/><stop offset="1" stop-color="#14261c"/></linearGradient>`,
    style: `
      .walk { animation: walk 16s ease-in-out infinite; }
      @keyframes walk { 0%,6% { transform: translateX(0); } 42%,56% { transform: translateX(${sceneW - spriteW - sx - 24}px); } 92%,100% { transform: translateX(0); } }
      .flip { transform-box: fill-box; transform-origin: center; animation: flip 16s steps(1) infinite; }
      @keyframes flip { 0%,48% { transform: scaleX(1); } 49%,97% { transform: scaleX(-1); } 98%,100% { transform: scaleX(1); } }
      .breathe { transform-box: fill-box; transform-origin: center bottom; animation: breathe 3s ease-in-out infinite; }
      .breathe.slow { animation-duration: 5s; }
      @keyframes breathe { 50% { transform: scale(1.025, 1.05); } }
      .hop { animation: hop .8s ease-in-out infinite; }
      @keyframes hop { 0%,100% { transform: translateY(0); } 40% { transform: translateY(-22px); } }
      .stepping .legA { animation: step .32s steps(1) infinite; }
      .stepping .legB { animation: step .32s steps(1) infinite; animation-delay: -.16s; }
      @keyframes step { 50% { transform: translateY(-4px); } }
      .bristle { transform-box: fill-box; transform-origin: center bottom; animation: bristle 6s ease-in-out infinite; }
      @keyframes bristle { 0%,85%,100% { transform: none; } 90% { transform: scale(1.04, 1.08); } }
      .sniff { animation: sniff 1.2s ease-in-out infinite; }
      @keyframes sniff { 0%,60%,100% { transform: none; } 70% { transform: translate(2px,-1px); } 80% { transform: translate(0,1px); } 90% { transform: translate(2px,0); } }
      .lid { opacity: 0; animation: lid 4.5s steps(1) infinite; }
      @keyframes lid { 0%,94% { opacity: 0; } 95%,100% { opacity: 1; } }
      .z { animation: z 3s ease-in-out infinite; opacity: 0; }
      @keyframes z { 0% { opacity: 0; transform: translateY(6px); } 40% { opacity: 1; } 100% { opacity: 0; transform: translateY(-16px); } }
      .heart { fill: ${C.pink}; animation: heart 2.2s ease-out infinite; opacity: 0; }
      @keyframes heart { 0% { opacity: 0; transform: translateY(0) scale(.6); } 30% { opacity: 1; transform: translateY(-12px) scale(1); } 100% { opacity: 0; transform: translateY(-60px) scale(.8); } }
      .spark { transform-box: fill-box; transform-origin: center; animation: spark 1.4s ease-in-out infinite; }
      @keyframes spark { 0%,100% { opacity: 0; transform: scale(.3) rotate(0); } 50% { opacity: 1; transform: scale(1.1) rotate(45deg); } }
      .pulse { transform-box: fill-box; transform-origin: left bottom; animation: pulse 2s ease-in-out infinite; }
      @keyframes pulse { 50% { transform: scale(1.08); } }
      .bob { animation: bob 2.4s ease-in-out infinite; }
      @keyframes bob { 50% { transform: translateY(-3px); } }
      .blade { transform-box: fill-box; transform-origin: center bottom; animation: sway 3s ease-in-out infinite alternate; }
      @keyframes sway { from { transform: rotate(-6deg); } to { transform: rotate(6deg); } }
      .leaf { animation: leaf 9s linear infinite; }
      @keyframes leaf { 0% { transform: translate(0,-20px) rotate(0); opacity: 0; } 10% { opacity: 1; } 50% { transform: translate(24px,110px) rotate(200deg); } 90% { opacity: 1; } 100% { transform: translate(-10px,250px) rotate(400deg); opacity: 0; } }
      .snow { animation: snow 8s linear infinite; }
      @keyframes snow { from { transform: translate(0,-10px); } to { transform: translate(14px,270px); } }
      .fly { animation: fly 6s ease-in-out infinite; }
      @keyframes fly { 0%,100% { opacity: .1; transform: translate(0,0); } 30% { opacity: 1; transform: translate(12px,-10px); } 60% { opacity: .3; transform: translate(-8px,6px); } }
      .wing { animation: wing .25s ease-in-out infinite alternate; }
      @keyframes wing { from { transform: scaleX(1); } to { transform: scaleX(.25); } }
      .xpbar { animation: grow 1.4s ease-out; transform-box: fill-box; transform-origin: left; }
      @keyframes grow { from { transform: scaleX(0); } }
      .row { opacity: 0; animation: in .4s ease-out forwards; }
      @keyframes in { to { opacity: 1; } }`,
    body,
  });
}

export function renderButton(kind) {
  const meta = {
    apple: ['🍎', 'feed an apple', C.red],
    pet: ['🤲', 'pet Yozhik', C.purple],
    play: ['🎾', 'play catch', C.green],
  }[kind];
  const [icon, label, color] = meta;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="48" viewBox="0 0 260 48">
  <rect x="0.5" y="0.5" width="259" height="47" rx="12" fill="${C.bg}" stroke="${color}" stroke-opacity="0.7"/>
  <text x="130" y="30" text-anchor="middle" font-family="${"'JetBrains Mono',Consolas,monospace"}" font-size="15" fill="${C.text}">${icon}  ${esc(label)}</text>
</svg>
`;
}
