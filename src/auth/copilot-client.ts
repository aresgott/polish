import { CopilotClient } from "@github/copilot-sdk";

export function createPolishCopilotClient(): CopilotClient {
  return new CopilotClient({
    logLevel: "error",
    // The bundled Copilot CLI uses node:sqlite for its session store, which
    // emits a Node ExperimentalWarning. The SDK forwards the subprocess stderr
    // verbatim (prefixed with "[CLI subprocess]"), so silence it at the source
    // by disabling warnings in the spawned runtime's environment.
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
}

export async function withPolishCopilotClient<T>(
  fn: (client: CopilotClient) => Promise<T>,
): Promise<T> {
  const client = createPolishCopilotClient();
  try {
    await client.start();
    return await fn(client);
  } finally {
    await client.stop();
  }
}
