import fs from "node:fs";
import path from "node:path";

const outputPath = process.argv[2] || "github-data.json";
const token = process.env.GITHUB_TOKEN;
const login = process.env.PROFILE_LOGIN || process.env.GITHUB_REPOSITORY_OWNER;

if (!token) {
  throw new Error("GITHUB_TOKEN is required to query GitHub GraphQL.");
}

if (!login) {
  throw new Error("PROFILE_LOGIN or GITHUB_REPOSITORY_OWNER is required.");
}

const query = `
query ProfileData($login: String!) {
  user(login: $login) {
    login
    name
    bio
    company
    websiteUrl
    location
    followers {
      totalCount
    }
    following {
      totalCount
    }
    repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      nodes {
        name
        url
        description
        forkCount
        stargazerCount
        isFork
        updatedAt
        primaryLanguage {
          name
          color
        }
      }
    }
    organizations(first: 20) {
      totalCount
      nodes {
        login
        name
        url
      }
    }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            weekday
            contributionCount
            color
          }
        }
      }
    }
  }
}
`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "sillionona-os-profile"
  },
  body: JSON.stringify({ query, variables: { login } })
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`GitHub GraphQL request failed: ${response.status} ${body}`);
}

const payload = await response.json();

if (payload.errors?.length) {
  throw new Error(JSON.stringify(payload.errors, null, 2));
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
