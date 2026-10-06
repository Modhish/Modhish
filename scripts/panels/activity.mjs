// `git log`, but across all of my public GitHub activity.
import { C, esc, clip, frame, ago, USER } from '../lib.mjs';

function line(e) {
  const repo = e.repo.name.replace(`${USER}/`, '');
  const p = e.payload || {};
  const sha = (p.head || e.id || '').slice(0, 7);
  switch (e.type) {
    case 'PushEvent': {
      const msg = p.commits?.at(-1)?.message?.split('\n')[0];
      const branch = (p.ref || '').replace('refs/heads/', '');
      return { sha, tag: 'push', color: C.green, repo, text: msg || `pushed to ${branch}` };
    }
    case 'PullRequestEvent':
      return { sha, tag: 'pr', color: C.purple, repo, text: `${p.action} #${p.number ?? p.pull_request?.number}: ${p.pull_request?.title ?? ''}` };
    case 'CreateEvent':
      return { sha, tag: 'new', color: C.cyan, repo, text: p.ref_type === 'repository' ? 'created repository' : `created ${p.ref_type} ${p.ref}` };
    case 'IssuesEvent':
      return { sha, tag: 'issue', color: C.yellow, repo, text: `${p.action}: ${p.issue?.title ?? ''}` };
    case 'ReleaseEvent':
      return { sha, tag: 'release', color: C.orange, repo, text: p.release?.name || p.release?.tag_name || 'published a release' };
    case 'WatchEvent':
      return { sha, tag: 'star', color: C.yellow, repo: e.repo.name, text: 'starred' };
    case 'ForkEvent':
      return { sha, tag: 'fork', color: C.blue, repo: e.repo.name, text: 'forked' };
    default:
      return null;
  }
}

export function renderActivity(gh, now = new Date()) {
  const W = 820;
  const items = gh.events.map((e) => ({ ...line(e), at: e.created_at })).filter((x) => x.tag);
  // Collapse runs of identical lines (e.g. ten pushes to the same branch).
  const seen = new Set();
  const rows = items.filter((r) => {
    const k = `${r.tag}|${r.repo}|${r.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 7);

  const top = 70;
  const lh = 22;
  let body = `<text x="26" y="${top}" class="t" font-size="13"><tspan fill="${C.green}">❯</tspan><tspan fill="${C.text}"> git log --author=${USER} --all-repos --oneline</tspan></text>`;

  if (!rows.length) {
    body += `<text x="26" y="${top + lh + 6}" class="t" font-size="13" fill="${C.muted}">nothing public lately — probably deep in a private repo 👀</text>`;
  }
  rows.forEach((r, i) => {
    const y = top + 8 + lh * (i + 1);
    const repoTxt = clip(r.repo, 26);
    body += `<g class="t row" font-size="12.5" style="animation-delay:${(0.12 * i + 0.3).toFixed(2)}s">
      <text x="26" y="${y}" fill="${C.yellow}">${esc(r.sha.padEnd(7, ' '))}</text>
      <text x="96" y="${y}" fill="${r.color}">${esc(r.tag)}</text>
      <text x="160" y="${y}" fill="${C.cyan}">${esc(repoTxt)}</text>
      <text x="360" y="${y}" fill="${C.text}">${esc(clip(r.text, 44))}</text>
      <text x="${W - 26}" y="${y}" text-anchor="end" fill="${C.muted}">${esc(ago(r.at, now))}</text>
    </g>`;
  });

  const H = top + 8 + lh * (Math.max(rows.length, 1) + 1) + 18;
  body += `<text x="26" y="${H - 22}" class="t" font-size="13"><tspan fill="${C.green}">❯</tspan><tspan class="cur" fill="${C.text}"> ▌</tspan></text>`;

  return frame({
    w: W,
    h: H,
    title: 'activity — live from the GitHub events API',
    style: `.row { opacity: 0; animation: in .35s ease-out forwards; }
    @keyframes in { to { opacity: 1; } }
    .cur { animation: cur 1s steps(1) infinite; } @keyframes cur { 50% { opacity: 0; } }`,
    body,
  });
}
