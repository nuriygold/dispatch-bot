import http from 'http';
import { WebSocketServer } from 'ws';
import { createApp } from './app';
import { config } from './config';
import { logger } from './logger';
import { events } from './services/events';
import { getCampaignProgress } from './services/progress';
import { isValidWsToken } from './middleware/auth';

export function createServer() {
  const app = createApp();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: config.wsPath });

  wss.on('connection', (socket, request) => {
    const token = new URL(request.url || config.wsPath, 'http://localhost').searchParams.get('token');
    if (!isValidWsToken(token)) {
      socket.close(4401, 'unauthorized');
      return;
    }

    logger.info('WebSocket client connected');
    let subscribedCampaign: string | null = null;
    const handler = (evt: any) => {
      if (subscribedCampaign && evt.campaignId === subscribedCampaign && socket.readyState === 1) {
        socket.send(JSON.stringify(evt));
      }
    };
    events.on('task_event', handler);

    const interval = setInterval(async () => {
      if (subscribedCampaign && socket.readyState === 1) {
        try {
          const snapshot = await getCampaignProgress(subscribedCampaign);
          socket.send(JSON.stringify({ type: 'campaign_progress', campaignId: subscribedCampaign, ...snapshot }));
        } catch (_err) {
          // ignore periodic progress send errors
        }
      }
    }, 5000);

    socket.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'subscribe' && msg.campaignId) {
          subscribedCampaign = msg.campaignId;
          logger.debug({ campaignId: subscribedCampaign }, 'ws subscribed');
        }
      } catch (err) {
        logger.warn({ err }, 'ws message parse error');
      }
    });
    socket.on('close', () => {
      events.off('task_event', handler);
      clearInterval(interval);
    });
  });

  return { app, server, wss };
}
