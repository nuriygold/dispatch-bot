import fetch from 'node-fetch';
import { config } from '../config';

export async function embedText(text: string): Promise<number[]> {
  const url = `${config.azure.endpoint}/openai/deployments/${config.azure.deployments.gpt35}/embeddings?api-version=2024-02-15-preview`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.azure.apiKey,
    },
    body: JSON.stringify({ input: text }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`embedding failed: ${res.status} ${t}`);
  }
  const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  return data.data?.[0]?.embedding || [];
}
