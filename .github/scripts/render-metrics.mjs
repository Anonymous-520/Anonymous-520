import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2] || "github-data.json";
const outputPath = process.argv[3] || "assets/github-metrics.svg";
const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const user = payload.data?.user;

if (!user) {
  throw new Error("No user data found in GitHub payload.");
}

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const repos = user.repositories?.nodes ?? [];
const publicRepos = user.repositories?.totalCount ?? repos.length;
const publicStars = repos.reduce((sum, repo) => sum + (repo.stargazerCount || 0), 0);
const publicForks = repos.reduce((sum, repo) => sum + (repo.forkCount || 0), 0);
const followers = user.followers?.totalCount ?? 0;
const following = user.following?.totalCount ?? 0;
const totalContributions = user.contributionsCollection?.contributionCalendar?.totalContributions ?? 0;
const generatedAt = new Date().toISOString();

const languages = new Map();
for (const repo of repos) {
  const language = repo.primaryLanguage;
  if (!language?.name) continue;
  const item = languages.get(language.name) ?? { count: 0, color: language.color || "#d4af37" };
  item.count += 1;
  languages.set(language.name, item);
}

const languageRows = [...languages.entries()]
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 5);
const maxLanguageCount = Math.max(1, ...languageRows.map(([, meta]) => meta.count));

const repoRows = repos.slice(0, 4).map((repo, index) => {
  const y = 76 + index * 28;
  const label = repo.name.length > 54 ? `${repo.name.slice(0, 51)}...` : repo.name;
  const language = repo.primaryLanguage?.name || "No primary language";
  return `
    <text x="24" y="${y}" fill="#d4af37" font-size="14" font-weight="800">${escapeXml(label)}</text>
    <text x="24" y="${y + 18}" fill="#ffffff" opacity="0.65" font-size="12">${escapeXml(language)} / ${repo.stargazerCount || 0} stars / ${repo.forkCount || 0} forks</text>`;
}).join("");

const languageBars = languageRows.map(([name, meta], index) => {
  const y = index * 26;
  const width = Math.max(14, Math.round((meta.count / maxLanguageCount) * 285));
  return `
      <text x="0" y="${y + 11}" fill="#ffffff" font-size="13">${escapeXml(name)}</text>
      <rect x="118" y="${y}" width="${width}" height="13" rx="6" fill="${escapeXml(meta.color)}" opacity="0.9"/>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="520" viewBox="0 0 1200 520" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(user.login)} GitHub Metrics</title>
  <desc id="desc">Public GitHub metrics generated from GitHub GraphQL.</desc>
  <defs>
    <linearGradient id="gold" x1="0" x2="1">
      <stop offset="0" stop-color="#fff4bb"/>
      <stop offset="0.55" stop-color="#d4af37"/>
      <stop offset="1" stop-color="#6c5718"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M36 0H0V36" fill="none" stroke="#ffffff" stroke-opacity="0.045"/>
    </pattern>
  </defs>
  <rect width="1200" height="520" fill="#000"/>
  <rect width="1200" height="520" fill="url(#grid)"/>
  <text x="54" y="62" fill="#ffffff" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="25" font-weight="900">GITHUB ANALYTICS</text>
  <text x="54" y="91" fill="#d4af37" font-family="Consolas, monospace" font-size="14">PUBLIC DATA / ${escapeXml(user.login)} / GENERATED ${escapeXml(generatedAt)}</text>

  <g transform="translate(54 132)" font-family="Inter, Segoe UI, Arial, sans-serif">
    ${metricCard(0, "PUBLIC REPOS", publicRepos)}
    ${metricCard(196, "PUBLIC STARS", publicStars)}
    ${metricCard(392, "PUBLIC FORKS", publicForks)}
    ${metricCard(588, "FOLLOWERS", followers)}
    ${metricCard(784, "CONTRIBUTIONS", totalContributions)}
  </g>

  <g transform="translate(54 290)" font-family="Inter, Segoe UI, Arial, sans-serif">
    <rect width="510" height="154" rx="12" fill="#050505" stroke="#ffffff" stroke-opacity="0.14"/>
    <text x="24" y="36" fill="#ffffff" font-size="17" font-weight="900">PUBLIC REPOSITORY SURFACE</text>
    ${repoRows || '<text x="24" y="84" fill="#ffffff" opacity="0.7" font-size="14">No public repositories returned by GitHub GraphQL.</text>'}
  </g>

  <g transform="translate(612 290)" font-family="Inter, Segoe UI, Arial, sans-serif">
    <rect width="534" height="154" rx="12" fill="#050505" stroke="#d4af37" stroke-opacity="0.38"/>
    <text x="24" y="36" fill="#ffffff" font-size="17" font-weight="900">PRIMARY LANGUAGE SIGNAL</text>
    <g transform="translate(24 62)">
      ${languageBars || '<text x="0" y="14" fill="#ffffff" opacity="0.7" font-size="14">No primary-language metadata returned.</text>'}
    </g>
  </g>
  <text x="54" y="486" fill="#ffffff" opacity="0.55" font-family="Consolas, monospace" font-size="13">Source: GitHub GraphQL API. Private repositories and private contributions are not displayed.</text>
</svg>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, svg);

function metricCard(x, label, value) {
  return `
    <g transform="translate(${x} 0)">
      <rect width="170" height="112" rx="10" fill="#050505" stroke="#d4af37" stroke-opacity="0.32"/>
      <text x="20" y="36" fill="#ffffff" opacity="0.65" font-size="13">${escapeXml(label)}</text>
      <text x="20" y="84" fill="#d4af37" font-size="44" font-weight="900">${escapeXml(value)}</text>
    </g>`;
}
