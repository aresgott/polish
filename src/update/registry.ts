const NPM_PACKAGE = "@aresgott/polish";
const NPM_REGISTRY_URL = `https://registry.npmjs.org/${encodeURIComponent(NPM_PACKAGE)}/latest`;
const GITHUB_RELEASES_URL = `https://api.github.com/repos/aresgott/polish/releases/latest`;

export async function isPublishedOnNpm(): Promise<boolean> {
  try {
    const res = await fetch(NPM_REGISTRY_URL, {
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchLatestVersion(): Promise<string | null> {
  try {
    const npmRes = await fetch(NPM_REGISTRY_URL, {
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/json" },
    });
    if (npmRes.ok) {
      const data = (await npmRes.json()) as { version?: string };
      if (data.version?.trim()) return data.version.trim();
    }
  } catch {
    // fall through to GitHub
  }

  try {
    const ghRes = await fetch(GITHUB_RELEASES_URL, {
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!ghRes.ok) return null;
    const data = (await ghRes.json()) as { tag_name?: string };
    return data.tag_name?.replace(/^v/i, "").trim() || null;
  } catch {
    return null;
  }
}

export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/i, "")
      .split(".")
      .map((part) => parseInt(part.replace(/[^0-9].*$/, ""), 10) || 0);

  const l = parse(latest);
  const c = parse(current);

  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lv = l[i] ?? 0;
    const cv = c[i] ?? 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}
