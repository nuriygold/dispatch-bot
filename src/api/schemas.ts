import { z } from 'zod';

export const createCampaignSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  cost_budget_cents: z.number().int().positive().optional(),
  time_budget_seconds: z.number().int().positive().optional(),
  callback_url: z.string().url().optional(),
});

export const createPlanSchema = z.object({
  regenerate: z.boolean().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.number().int().min(1).max(10).optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  tool_requirements: z.array(z.string()).optional(),
});

export const memoryQuerySchema = z.object({ q: z.string().min(1) });

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
