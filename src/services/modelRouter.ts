import fetch from 'node-fetch';
import { config } from '../config';

type ModelKind = 'planning' | 'execution' | 'extraction' | 'vision';

export interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
      tool_calls?: Array<{
        id: string;
        function: {
          name: string;
          arguments?: unknown;
        };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export function selectDeployment(kind: ModelKind): { deployment: string; maxTokens: number } {
  if (kind === 'planning' || kind === 'vision') {
    return { deployment: config.azure.deployments.gpt4o, maxTokens: 8000 };
  }
  if (kind === 'execution') {
    return { deployment: config.azure.deployments.gpt4t, maxTokens: 6000 };
  }
  return { deployment: config.azure.deployments.gpt35, maxTokens: 4000 };
}

export async function chatCompletion(kind: ModelKind, messages: any[], tools?: any[]): Promise<ChatCompletionResponse> {
  const { deployment, maxTokens } = selectDeployment(kind);
  const apiVersion = config.azure.apiVersions.chatCompletions;
  const url = `${config.azure.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

  const body = {
    messages,
    max_tokens: maxTokens,
    temperature: 0.2,
    tools,
    tool_choice: tools?.length ? 'auto' : undefined,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.azure.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Azure chat request failed for kind=${kind} deployment=${deployment} apiVersion=${apiVersion}: ${res.status} ${text}`,
    );
  }

  const data = (await res.json()) as ChatCompletionResponse;
  if (!data?.choices?.length) {
    throw new Error(
      `Azure chat response missing choices for kind=${kind} deployment=${deployment} apiVersion=${apiVersion}`,
    );
  }

  return data;
}
