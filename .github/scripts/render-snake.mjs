import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2] || "github-data.json";
const outputPath = process.argv[3] || "assets/snake.svg";
const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const user = payload.data?.user;
const calendar = user?.contributionsCollection?.contributionCalendar;

if (!user || !calendar) {
  throw new Error("No contribution calendar found in GitHub payload.");
}

const escapeXml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const weeks = calendar.weeks ?? [];
const days = weeks.flatMap((week, weekIndex) =>
  (week.contributionDays ?? []).map((day) => ({ ...day, weekIndex }))
);
const maxCount = Math.max(1, ...days.map((day) => day.contributionCount || 0));
const cell = 12;
const gap = 5;
const startX = 76;
const startY = 126;

const colorFor = (count) => {
  if (!count) return "#111111";
  if (count >= maxCount * 0.75) return "#d4af37";
  if (count >= maxCount * 0.45) return "#9c7e25";
  if (count >= maxCount * 0.2) return "#6e5b20";
  return "#2a2414";
};

const rects = days.map((day) => {
  const x = startX + day.weekIndex * (cell + gap);
  const y = startY + day.weekday * (cell + gap);
  return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${colorFor(day.contributionCount)}" stroke="#ffffff" stroke-opacity="0.06"><title>${escapeXml(day.date)}: ${day.contributionCount} contributions</title></rect>`;
}).join("");

const activeDays = days.filter((day) => day.contributionCount > 0).slice(-36);
const fallbackDays = days.slice(-36);
const pathDays = activeDays.length >= 2 ? activeDays : fallbackDays;
const points = pathDays.map((day) => {
  const x = startX + day.weekIndex * (cell + gap) + cell / 2;
  const y = startY + day.weekday * (cell + gap) + cell / 2;
  return `${x},${y}`;
}).join(" ");
const head = pathDays.at(-1);
const headX = head ? startX + head.weekIndex * (cell + gap) + cell / 2 : startX;
const headY = head ? startY + head.weekday * (cell + gap) + cell / 2 : startY;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="320" viewBox="0 0 1200 320" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(user.login)} Contribution Snake</title>
  <desc id="desc">GitHub contribution calendar rendered as a gold snake path.</desc>
  <defs>
    <linearGradient id="gold" x1="0" x2="1">
      <stop offset="0" stop-color="#fff3b2"/>
      <stop offset="0.5" stop-color="#d4af37"/>
      <stop offset="1" stop-color="#6e5b20"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="320" fill="#000"/>
  <text x="54" y="58" fill="#ffffff" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="25" font-weight="900">CONTRIBUTION SNAKE</text>
  <text x="54" y="86" fill="#d4af37" font-family="Consolas, monospace" font-size="14">GRAPHQL CALENDAR / ${escapeXml(user.login)} / TOTAL CONTRIBUTIONS: ${calendar.totalContributions}</text>
  <g>${rects}</g>
  <polyline points="${points}" fill="none" stroke="url(#gold)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)">
    <animate attributeName="stroke-dasharray" values="0 1600;520 1080;0 1600" dur="7s" repeatCount="indefinite"/>
  </polyline>
  <circle cx="${headX}" cy="${headY}" r="10" fill="#d4af37" filter="url(#glow)">
    <animate attributeName="r" values="8;12;8" dur="2.4s" repeatCount="indefinite"/>
  </circle>
  <text x="76" y="286" fill="#ffffff" opacity="0.56" font-family="Consolas, monospace" font-size="13">Rendered from GitHub GraphQL contributionCalendar. Private contribution visibility follows GitHub account settings.</text>
</svg>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, svg);
