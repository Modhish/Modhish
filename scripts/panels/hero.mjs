// A slim terminal line that types out a few sentences on loop.
import { C, FONT, esc } from '../lib.mjs';

const LINES = [
  'Born in Cairo, building in Volgograd.',
  'I turn complexity into clear interfaces.',
  'I connect design decisions to working code.',
  'I build for the next iteration.',
];

export function renderHero() {
  const W = 820;
  const H = 56;
  const slot = 4; // seconds per line
  const cycle = slot * LINES.length;
  const charW = 10.2; // ≈ advance of a 17px monospace glyph

  const lines = LINES.map((text, i) => {
    const w = (text.length * charW + 14).toFixed(0);
    const kt = (s) => (s / cycle).toFixed(4);
    const keyTimes = `0;${kt(1.5)};${kt(slot - 0.4)};${kt(slot - 0.1)};1`;
    return `<clipPath id="c${i}"><rect x="58" y="10" height="36" width="0">
        <animate attributeName="width" values="0;${w};${w};0;0" keyTimes="${keyTimes}" dur="${cycle}s" begin="${i * slot}s" repeatCount="indefinite"/>
      </rect></clipPath>
      <text x="58" y="34" clip-path="url(#c${i})">${esc(text)}<tspan fill="${C.blue}" class="cur">▌</tspan></text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>.cur { animation: cur .9s steps(1) infinite; } @keyframes cur { 50% { opacity: 0; } }</style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${C.bg}" stroke="${C.border}"/>
  <g font-family="${FONT}" font-size="17" fill="${C.text}">
    <text x="26" y="34" fill="${C.green}">❯</text>
    ${lines}
  </g>
</svg>
`;
}
