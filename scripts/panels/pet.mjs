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
  return { key: 'ok', text: 'content, sniffing around the README' };
}

function sprite(px, m) {
  let rects = '';
  SPRITE.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const c = ch === 'E' && m === 'sleep' ? 'F' : ch;
      rects += `<rect x="${x * px}" y="${y * px}" width="${px + 0.3}" height="${px + 0.3}" fill="${PAL[c]}"/>`;
    }),
  );
  if (m === 'sleep') {
    rects += `<rect x="${12 * px}" y="${5.6 * px}" width="${px}" height="${px * 0.3}" fill="${PAL.E}"/>`;
  } else {
    // eyelid that blinks every few seconds
    rects += `<rect x="${12 * px}" y="${5 * px}" width="${px + 0.3}" height="${px + 0.3}" fill="${PAL.F}" class="lid"/>`;
  }
  return rects;
}

export function renderPet(state, now = new Date()) {
  const W = 820;
  const H = 270;
  const px = 9;
  const m = mood(state, now);
  const lv = level(state.xp);
  const cur = state.xp - xpFor(lv);
  const need = xpFor(lv + 1) - xpFor(lv);

  const sx = 70;
  const sy = 112;
  const extras = {
    sleep: `<g class="t" fill="${C.muted}" font-weight="700">
      <text x="${sx + 140}" y="${sy + 10}" font-size="14" class="z">z</text>
      <text x="${sx + 150}" y="${sy - 6}" font-size="18" class="z" style="animation-delay:-1s">z</text>
      <text x="${sx + 164}" y="${sy - 26}" font-size="22" class="z" style="animation-delay:-2s">Z</text></g>`,
    hungry: `<g transform="translate(${sx + 150},${sy - 52})">
      <circle cx="-14" cy="44" r="3" fill="${C.text}" opacity="0.6"/><circle cx="-6" cy="34" r="5" fill="${C.text}" opacity="0.6"/>
      <ellipse cx="18" cy="10" rx="30" ry="22" fill="${C.text}" opacity="0.9"/>
      <circle cx="18" cy="12" r="10" fill="${C.red}"/><rect x="17" y="-2" width="2" height="6" fill="#5b3a29"/><ellipse cx="23" cy="0" rx="5" ry="2.5" fill="${C.green}"/></g>`,
    joy: [0, 1, 2]
      .map((i) => `<text x="${sx + 120 + i * 22}" y="${sy + 4}" font-size="${16 - i * 2}" class="heart" style="animation-delay:-${i * 0.7}s">❤</text>`)
      .join(''),
    ok: '',
  }[m.key];

  // Recently-fed apples scattered on the grass.
  const apples = Math.min(3, state.apples);
  let appleSvg = '';
  for (let i = 0; i < apples; i++) {
    const ax = sx - 30 + i * 14 + (i === 1 ? 150 : 0);
    appleSvg += `<circle cx="${ax}" cy="${sy + 104}" r="6" fill="${C.red}"/><rect x="${ax - 0.8}" y="${sy + 95}" width="1.6" height="4" fill="#5b3a29"/>`;
  }

  const recent = (state.history || []).slice(0, 3);
  const tx = 330;
  const fill = need ? Math.min(1, cur / need) : 1;

  const body = `
    <ellipse cx="${sx + 72}" cy="${sy + 108}" rx="120" ry="16" fill="#1b3a24"/>
    <ellipse cx="${sx + 72}" cy="${sy + 104}" rx="100" ry="10" fill="#24502f"/>
    ${appleSvg}
    <g transform="translate(${sx},${sy})"><g class="${m.key === 'joy' ? 'hop' : 'breathe'}">${sprite(px, m.key)}</g></g>
    ${extras}

    <g class="t">
      <text x="${tx}" y="78" font-size="22" font-weight="700" fill="${C.text}">Yozhik <tspan fill="${C.muted}" font-weight="400" font-size="16">· Ёжик</tspan></text>
      <text x="${tx}" y="102" font-size="12.5" fill="${C.muted}">profile hedgehog · born ${esc(state.born.slice(0, 10))} · ${Object.keys(state.visitors || {}).length} friends</text>

      <text x="${tx}" y="134" font-size="13" fill="${C.text}"><tspan fill="${C.yellow}" font-weight="700">LV ${lv}</tspan>  ${cur}/${need} xp to next level</text>
      <rect x="${tx}" y="142" width="440" height="8" rx="4" fill="${C.panel}" stroke="${C.border}"/>
      <rect x="${tx}" y="142" width="${(440 * fill).toFixed(1)}" height="8" rx="4" fill="url(#xp)"/>

      <text x="${tx}" y="176" font-size="13" fill="${C.text}">mood: <tspan fill="${C.cyan}">${esc(m.text)}</tspan></text>
      <text x="${tx}" y="198" font-size="13" fill="${C.text}">🍎 ${state.apples} apples   🤲 ${state.pets} pets   🎾 ${state.plays} plays</text>
      ${recent
        .map(
          (h, i) =>
            `<text x="${tx}" y="${226 + i * 16}" font-size="11" fill="${C.muted}"><tspan fill="${C.blue}">@${esc(clip(h.login, 20))}</tspan> ${esc(VERB[h.action])} · ${esc(ago(h.at, now))}</text>`,
        )
        .join('') || `<text x="${tx}" y="226" font-size="11" fill="${C.muted}">no visitors yet — be the first ↓</text>`}
    </g>`;

  return frame({
    w: W,
    h: H,
    title: 'yozhik.exe — tap a button below, then press “Create” on GitHub',
    defs: `<linearGradient id="xp" x1="0" x2="1"><stop offset="0" stop-color="${C.yellow}"/><stop offset="1" stop-color="${C.orange}"/></linearGradient>`,
    style: `
      .breathe { transform-origin: 72px 99px; animation: breathe 3.2s ease-in-out infinite; }
      @keyframes breathe { 50% { transform: scale(1.03, 1.05); } }
      .hop { animation: hop .9s ease-in-out infinite; }
      @keyframes hop { 0%,100% { transform: translateY(0); } 40% { transform: translateY(-14px); } }
      .lid { opacity: 0; animation: lid 4.5s steps(1) infinite; }
      @keyframes lid { 0%,94% { opacity: 0; } 95%,100% { opacity: 1; } }
      .z { animation: z 3s ease-in-out infinite; opacity: 0; }
      @keyframes z { 0% { opacity: 0; transform: translateY(6px); } 40% { opacity: 1; } 100% { opacity: 0; transform: translateY(-12px); } }
      .heart { fill: ${C.pink}; animation: heart 2.1s ease-out infinite; opacity: 0; }
      @keyframes heart { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(-40px); } }`,
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
