import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type UpdateCheckState = {
  lastCheckedAt: number;
  skippedVersion?: string;
};

const CHECK_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

export function getUpdateStatePath(): string {
  return join(homedir(), ".polish", "update-check.json");
}

export async function loadUpdateState(): Promise<UpdateCheckState | null> {
  try {
    const raw = await readFile(getUpdateStatePath(), "utf8");
    return JSON.parse(raw) as UpdateCheckState;
  } catch {
    return null;
  }
}

export async function saveUpdateState(state: UpdateCheckState): Promise<void> {
  const path = getUpdateStatePath();
  await mkdir(join(homedir(), ".polish"), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

export function isCheckDue(state: UpdateCheckState | null, now = Date.now()): boolean {
  if (!state?.lastCheckedAt) return true;
  return now - state.lastCheckedAt >= CHECK_INTERVAL_MS;
}
