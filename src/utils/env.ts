import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.string().transform((v) => Number(v)).default('3000'),
  WEB_SOCKET_PATH: z.string().default('/ws'),
  POSTGRES_URL: z.string(),
  REDIS_URL: z.string(),
  AZURE_OPENAI_ENDPOINT: z.string().url(),
  AZURE_OPENAI_API_KEY: z.string(),
  AZURE_DEPLOYMENT_GPT4O: z.string(),
  AZURE_DEPLOYMENT_GPT4T: z.string(),
  AZURE_DEPLOYMENT_GPT35: z.string(),
  CALLBACK_SECRET: z.string(),
});

export function validateEnv(env: NodeJS.ProcessEnv) {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Env validation failed: ${parsed.error.message}`);
  }
  return parsed.data;
}
