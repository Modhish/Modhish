// Applies one visitor interaction (from an issue) to data/pet.json.
// Inputs arrive via env vars — never interpolated into shell — because issue
// titles and logins are user-controlled.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { XP, VERB, level } from './panels/pet.mjs';

// Only repeats of the *same* action by the same visitor are throttled.
const COOLDOWN_SEC = 60;
const file = new URL('../data/pet.json', import.meta.url);

const title = (process.env.ISSUE_TITLE || '').toLowerCase();
const login = (process.env.ISSUE_USER || 'someone').replace(/[^\w-]/g, '').slice(0, 39);
const action = /apple|feed|cookie/.test(title) ? 'apple' : /play/.test(title) ? 'play' : /pet/.test(title) ? 'pet' : null;

async function reply(text, changed) {
  console.log(text);
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\nreply<<EOF\n${text}\nEOF\n`);
  }
}

if (!action) {
  await reply("Yozhik sniffed this issue but didn't understand it 🦔 — try one of the buttons on the profile!", false);
  process.exit(0);
}

const state = JSON.parse(await readFile(file, 'utf8'));
const now = new Date();
const lastSame = state.history.find((h) => h.login === login && h.action === action);
if (lastSame && now - new Date(lastSame.at) < COOLDOWN_SEC * 1e3) {
  await reply(`Yozhik is still munching on that, @${login} — try a different button, or the same one again in a minute 🦔`, false);
  process.exit(0);
}

const before = level(state.xp);
state.xp += XP[action];
state[{ apple: 'apples', pet: 'pets', play: 'plays' }[action]] += 1;
if (action === 'apple') state.lastApple = now.toISOString();
state.last = { login, action, at: now.toISOString() };
state.visitors[login] = (state.visitors[login] || 0) + 1;
state.history = [{ login, action, at: now.toISOString() }, ...state.history].slice(0, 20);
await writeFile(file, JSON.stringify(state, null, 2) + '\n');

const after = level(state.xp);
const lines = [
  `@${login} ${VERB[action]} — thank you! 🦔`,
  after > before ? `\n🎉 **Yozhik levelled up to LV ${after}!**` : '',
  `\nHe'll show it on the profile in 1–5 minutes (GitHub caches images briefly): https://github.com/Modhish`,
];
await reply(lines.join(''), true);
