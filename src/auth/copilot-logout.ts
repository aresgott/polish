import { withPolishCopilotClient } from "./copilot-client.js";

type RpcConnection = {
  sendRequest: (method: string, params: Record<string, unknown>) => Promise<unknown>;
};

function getRpcConnection(client: unknown): RpcConnection | null {
  const connection = (client as { connection?: RpcConnection }).connection;
  return connection ?? null;
}

export async function runCopilotLogout(): Promise<number> {
  return withPolishCopilotClient(async (client) => {
    const status = await client.getAuthStatus();
    if (!status.isAuthenticated) {
      return 0;
    }

    if (status.authType === "env") {
      console.error(
        "\nSigned in via environment variable. Unset COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN.",
      );
      return 1;
    }

    if (status.authType === "gh-cli") {
      console.error("\nSigned in via GitHub CLI. Run: gh auth logout");
      return 1;
    }

    const connection = getRpcConnection(client);
    if (connection) {
      try {
        await connection.sendRequest("auth.logout", {});
        const after = await client.getAuthStatus();
        if (!after.isAuthenticated) return 0;
      } catch {
        // fall through to manual instructions
      }
    }

    console.error(
      "\nCould not sign out automatically. In Copilot CLI, run /logout, or remove stored credentials under ~/.copilot.",
    );
    return 1;
  });
}
