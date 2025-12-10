import { Hyperbrowser } from "@hyperbrowser/sdk";

let client: Hyperbrowser | null = null;

export function getHyperbrowserClient(): Hyperbrowser {
  if (!client) {
    const apiKey = process.env.HYPERBROWSER_API_KEY;
    if (!apiKey) {
      throw new Error("HYPERBROWSER_API_KEY environment variable is required");
    }
    client = new Hyperbrowser({ apiKey });
  }
  return client;
}

export function resetClient(): void {
  client = null;
}

