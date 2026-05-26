import * as p from "@clack/prompts";
import { getVersion } from "../version.js";
import { detectInstallMethod, manualUpdateHint, runUpdateInstall } from "./install.js";
import { fetchLatestVersion, isNewerVersion } from "./registry.js";
import { isCheckDue, loadUpdateState, saveUpdateState } from "./state.js";

function shouldSkipUpdateCheck(): boolean {
  if (process.env.POLISH_SKIP_UPDATE_CHECK === "1") return true;
  if (!process.stdin.isTTY || !process.stdout.isTTY) return true;
  return false;
}

export async function maybeCheckForUpdate(options?: { force?: boolean }): Promise<void> {
  if (!options?.force && shouldSkipUpdateCheck()) return;

  const current = getVersion();
  const state = await loadUpdateState();
  if (!options?.force && !isCheckDue(state)) return;

  const latest = await fetchLatestVersion();
  const now = Date.now();

  if (!latest) {
    await saveUpdateState({
      lastCheckedAt: now,
      skippedVersion: state?.skippedVersion,
    });
    return;
  }

  if (!isNewerVersion(latest, current)) {
    await saveUpdateState({
      lastCheckedAt: now,
      skippedVersion: undefined,
    });
    if (options?.force) {
      console.log(`polish is up to date (${current}).`);
    }
    return;
  }

  if (!options?.force && state?.skippedVersion === latest) {
    await saveUpdateState({ lastCheckedAt: now, skippedVersion: latest });
    return;
  }

  if (shouldSkipUpdateCheck()) {
    if (options?.force) {
      const method = await detectInstallMethod();
      console.log(`Update available: ${current} → ${latest}`);
      console.log(manualUpdateHint(method));
    }
    return;
  }

  console.log(`\nA new version of polish is available: ${current} → ${latest}`);
  const install = await p.confirm({
    message: "Install update now? (Y/n)",
    initialValue: true,
  });

  if (p.isCancel(install) || !install) {
    await saveUpdateState({ lastCheckedAt: now, skippedVersion: latest });
    const method = await detectInstallMethod();
    console.log(`Skipped ${latest}. ${manualUpdateHint(method)}\n`);
    return;
  }

  await runInstall(latest, state?.skippedVersion);
}

async function runInstall(latest: string, previousSkipped?: string): Promise<void> {
  const method = await detectInstallMethod();
  const code = await runUpdateInstall(method);

  if (code === 0) {
    await saveUpdateState({ lastCheckedAt: Date.now(), skippedVersion: undefined });
    console.log(`\n✓ Updated to ${latest}.`);
    return;
  }

  await saveUpdateState({
    lastCheckedAt: Date.now(),
    skippedVersion: previousSkipped,
  });
  console.error(`\nUpdate failed. ${manualUpdateHint(method)}`);
  process.exit(code);
}
