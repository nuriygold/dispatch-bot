import { config } from '../config';

export function computeCostCents(usage?: { prompt_tokens?: number; completion_tokens?: number }): number {
  if (!usage) return 0;
  const input = usage.prompt_tokens || 0;
  const output = usage.completion_tokens || 0;
  const { inputTokenCents, outputTokenCents } = config.cost;
  return Math.round(input * inputTokenCents + output * outputTokenCents);
}
