import { EventEmitter } from 'events';

export type TaskEvent =
  | { type: 'task_started'; campaignId: string; taskId: string; title?: string }
  | {
      type: 'task_completed';
      campaignId: string;
      taskId: string;
      title?: string;
      success: boolean;
      output?: string;
    }
  | {
      type: 'task_progress';
      campaignId: string;
      taskId: string;
      step: number;
      tool: string;
      status: 'running' | 'done' | 'error';
      snippet?: string;
      ts: number;
    }
  | { type: 'campaign_paused' | 'campaign_resumed'; campaignId: string }
  | { type: 'task_cancelled'; campaignId: string; taskId: string }
  | { type: 'plan_switched'; campaignId: string; planName: string };

class OrchestratorEvents extends EventEmitter {}

export const events = new OrchestratorEvents();

export function emitTaskStarted(payload: { campaignId: string; taskId: string; title?: string }) {
  events.emit('task_event', { type: 'task_started', ...payload } satisfies TaskEvent);
}

export function emitTaskCompleted(payload: {
  campaignId: string;
  taskId: string;
  title?: string;
  success: boolean;
  output?: string;
}) {
  events.emit('task_event', { type: 'task_completed', ...payload } satisfies TaskEvent);
}

export function emitTaskProgress(payload: {
  campaignId: string;
  taskId: string;
  step: number;
  tool: string;
  status: 'running' | 'done' | 'error';
  snippet?: string;
}) {
  events.emit('task_event', { ...payload, type: 'task_progress', ts: Date.now() } satisfies TaskEvent);
}

export function emitCampaignPaused(campaignId: string) {
  events.emit('task_event', { type: 'campaign_paused', campaignId });
}

export function emitCampaignResumed(campaignId: string) {
  events.emit('task_event', { type: 'campaign_resumed', campaignId });
}

export function emitTaskCancelled(campaignId: string, taskId: string) {
  events.emit('task_event', { type: 'task_cancelled', campaignId, taskId });
}

export function emitPlanSwitched(campaignId: string, planName: string) {
  events.emit('task_event', { type: 'plan_switched', campaignId, planName });
}
