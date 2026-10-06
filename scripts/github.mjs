// Pulls the live numbers the panels display. Every field has a fallback so a
// flaky API never breaks the render — the panel just shows what it has.
import { USER } from './lib.mjs';

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const headers = {
  'User-Agent': `${USER}-profile-renderer`,
  Accept: 'application/vnd.github+json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function rest(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function graphql(query, variables) {
  if (!token) throw new Error('GraphQL needs a token');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GraphQL → ${JSON.stringify(json.errors ?? res.status)}`);
  return json.data;
}

const LANG_COLORS = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5', Dart: '#00B4AB',
  Java: '#b07219', 'C++': '#f34b7d', C: '#555555', PHP: '#4F5D95', Vue: '#41b883',
  HTML: '#e34c26', CSS: '#663399', Kotlin: '#A97BFF', Go: '#00ADD8', Shell: '#89e051',
};

export async function loadGithub() {
  const out = {
    name: 'Ahmed Modhish', company: 'FoodTech Lab', location: 'Volgograd, RU',
    createdAt: '2022-09-01T00:00:00Z', followers: null, following: null,
    repos: null, stars: null, contributions: null, languages: [], events: [],
  };

  try {
    const u = await rest(`/users/${USER}`);
    Object.assign(out, {
      name: u.name || out.name,
      company: (u.company || out.company).replace(/^@/, ''),
      createdAt: u.created_at,
      followers: u.followers,
      following: u.following,
      repos: u.public_repos,
    });
  } catch (e) { console.warn('user:', e.message); }

  try {
    const repos = await rest(`/users/${USER}/repos?per_page=100&type=owner`);
    const own = repos.filter((r) => !r.fork);
    out.stars = own.reduce((n, r) => n + r.stargazers_count, 0);
    // Weight languages by bytes across non-fork repos.
    const totals = {};
    await Promise.all(
      own.map(async (r) => {
        try {
          const langs = await rest(`/repos/${USER}/${r.name}/languages`);
          for (const [k, v] of Object.entries(langs)) totals[k] = (totals[k] || 0) + v;
        } catch { /* skip */ }
      }),
    );
    const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    out.languages = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, bytes]) => ({ name, pct: bytes / sum, color: LANG_COLORS[name] || '#8b949e' }));
  } catch (e) { console.warn('repos:', e.message); }

  try {
    const d = await graphql(
      `query($login:String!){ user(login:$login){ contributionsCollection { contributionCalendar { totalContributions } } } }`,
      { login: USER },
    );
    out.contributions = d.user.contributionsCollection.contributionCalendar.totalContributions;
  } catch (e) { console.warn('contributions:', e.message); }

  try {
    const events = await rest(`/users/${USER}/events/public?per_page=50`);
    out.events = events;
  } catch (e) { console.warn('events:', e.message); }

  return out;
}
