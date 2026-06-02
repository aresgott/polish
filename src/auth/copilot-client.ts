import { CopilotClient } from "@github/copilot-sdk";

export function createPolishCopilotClient(): CopilotClient {
  return new CopilotClient({
    logLevel: "error",
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
