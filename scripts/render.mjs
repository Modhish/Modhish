// Renders every live panel into dist/. Run by .github/workflows/render.yml.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadGithub } from './github.mjs';
import { renderSky } from './panels/sky.mjs';
import { renderCard } from './panels/card.mjs';
import { renderPet, renderButton } from './panels/pet.mjs';
import { renderActivity } from './panels/activity.mjs';
import { renderHero } from './panels/hero.mjs';
import { renderJourney } from './panels/journey.mjs';

const now = process.env.RENDER_AT ? new Date(process.env.RENDER_AT) : new Date();
const out = new URL('../dist/', import.meta.url);
await mkdir(out, { recursive: true });

const gh = await loadGithub();
const pet = JSON.parse(await readFile(new URL('../data/pet.json', import.meta.url), 'utf8'));

const files = {
  'hero.svg': renderHero(),
  'journey.svg': renderJourney(now),
  'sky.svg': renderSky(now),
  'card.svg': renderCard(gh, now),
  'pet.svg': renderPet(pet, now),
  'activity.svg': renderActivity(gh, now),
  'btn-apple.svg': renderButton('apple'),
  'btn-pet.svg': renderButton('pet'),
  'btn-play.svg': renderButton('play'),
};

for (const [name, svg] of Object.entries(files)) {
  await writeFile(new URL(name, out), svg);
  console.log(`wrote dist/${name} (${(svg.length / 1024).toFixed(1)} kB)`);
}
