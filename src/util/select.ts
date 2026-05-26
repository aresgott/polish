import * as p from "@clack/prompts";
import type { Provider } from "../config/provider.js";
import { PROVIDER_LABELS, PROVIDERS } from "../config/provider.js";

export async function selectProvider(): Promise<Provider | null> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return null;
  }

  const options = PROVIDERS.map((value) => ({
    value,
    label: PROVIDER_LABELS[value],
  }));

  const selected = await p.select({
    message: "Choose how to sign in",
    options,
  });

  if (p.isCancel(selected)) {
    return null;
  }

  return selected as Provider;
}
