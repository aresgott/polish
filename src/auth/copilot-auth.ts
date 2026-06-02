import { hasCopilotEnvToken } from "./copilot-env.js";
import { withPolishCopilotClient } from "./copilot-client.js";

export async function hasCopilotAuth(): Promise<boolean> {
  if (hasCopilotEnvToken()) return true;

  try {
    return await withPolishCopilotClient(async (client) => {
      const status = await client.getAuthStatus();
      return status.isAuthenticated;
    });
  } catch {
    return false;
  }
}
