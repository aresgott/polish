import { configCommand } from "./commands/config.js";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";
import { polishCommand } from "./commands/polish.js";
import { shellInitCommand } from "./commands/shell-init.js";
import { updateCommand } from "./commands/update.js";
import { showDonate, showUsage } from "./help.js";
import { maybeCheckForUpdate } from "./update/check.js";
import { parseArgv } from "./util/argv.js";
import { getVersion } from "./version.js";

const SKIP_UPDATE_CHECK = new Set([
  "help",
  "donate",
  "version",
  "shell-init",
  "update",
]);

async function main(): Promise<void> {
  const parsed = parseArgv();

  if (!SKIP_UPDATE_CHECK.has(parsed.command)) {
    await maybeCheckForUpdate();
  }

  switch (parsed.command) {
    case "help":
      showUsage();
      break;
    case "donate":
      showDonate();
      break;
    case "version":
      console.log(getVersion());
      break;
    case "update":
      await updateCommand();
      break;
    case "login":
      await loginCommand({ device: parsed.device, provider: parsed.provider });
      break;
    case "logout":
      await logoutCommand();
      break;
    case "shell-init":
      shellInitCommand(parsed.shell);
      break;
    case "config":
      await configCommand(parsed.args);
      break;
    case "polish":
      await polishCommand(parsed.text, {
        print: parsed.print,
        noCopy: parsed.noCopy,
        diff: parsed.diff,
        stdin: parsed.stdin,
        mode: parsed.mode,
        tone: parsed.tone,
      });
      break;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
