import { maybeCheckForUpdate } from "../update/check.js";

export async function updateCommand(): Promise<void> {
  await maybeCheckForUpdate({ force: true });
}
