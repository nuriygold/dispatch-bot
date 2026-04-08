import fetch from 'node-fetch';
import { config } from '../config';

export async function embedText(text: string): Promise<number[]> {
  const deployment = config.azure.deployments.embeddings || config.azure.deployments.gpt35;
  const apiVersion = config.azure.apiVersions.embeddings;
  const url = `${config.azure.endpoint}/openai/deployments/${deployment}/embeddings?api-version=${encodeURIComponent(apiVersion)}`;
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
    throw new Error(`embedding failed for deployment=${deployment} apiVersion=${apiVersion}: ${res.status} ${t}`);
  }
  const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
  const embedding = data.data?.[0]?.embedding;
  if (!embedding?.length) {
    throw new Error(`embedding response missing vector for deployment=${deployment} apiVersion=${apiVersion}`);
  }
  return embedding;
}
