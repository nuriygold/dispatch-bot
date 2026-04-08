export type CampaignStatus = 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
export type TaskStatus = 'planned' | 'queued' | 'running' | 'done' | 'failed' | 'partial' | 'cancelled';

export interface Campaign {
  id: string;
  title: string;
  description?: string;
  status: CampaignStatus;
  cost_budget_cents?: number;
  time_budget_seconds?: number;
  callback_url?: string;
}

export interface Task {
  id: string;
  campaign_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: number;
  dependencies?: string[];
}
