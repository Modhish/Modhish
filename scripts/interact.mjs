// Applies one visitor interaction (from an issue) to data/pet.json.
// Inputs arrive via env vars — never interpolated into shell — because issue
// titles and logins are user-controlled.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { XP, VERB, level } from './panels/pet.mjs';

const COOLDOWN_MIN = 5;
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
const lastByUser = state.history.find((h) => h.login === login);
if (lastByUser && now - new Date(lastByUser.at) < COOLDOWN_MIN * 60e3) {
  await reply(`Yozhik is still busy with your last visit, @${login} — come back in a few minutes 🦔`, false);
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
  `\nThe profile will refresh in a minute or two: https://github.com/Modhish`,
];
await reply(lines.join(''), true);
