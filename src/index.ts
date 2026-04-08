import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { router } from './api/router';
import { config } from './config';
import { logger } from './logger';
import { startExecutionWorkers } from './services/executor';
import { startNightlyCron } from './cron/nightly';
import { adminRouter } from './api/adminRouter';
import { controlRouter } from './api/controlRouter';
import rateLimit from 'express-rate-limit';
import { events } from './services/events';
import { getCampaignProgress } from './services/progress';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(helmet());
app.use(cors());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(router);
app.use(adminRouter);
app.use(controlRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: config.wsPath });

// WS: subscribe per campaignId
wss.on('connection', (socket) => {
  logger.info('WebSocket client connected');
  let subscribedCampaign: string | null = null;
  const handler = (evt: any) => {
    if (subscribedCampaign && evt.campaignId === subscribedCampaign && socket.readyState === 1) {
      socket.send(JSON.stringify(evt));
    }
  };
  events.on('task_event', handler);

  // send periodic campaign_progress every 5s
  const interval = setInterval(async () => {
    if (subscribedCampaign && socket.readyState === 1) {
      try {
        const snapshot = await getCampaignProgress(subscribedCampaign);
        socket.send(JSON.stringify({ type: 'campaign_progress', campaignId: subscribedCampaign, ...snapshot }));
      } catch (_err) {
        // ignore
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

startExecutionWorkers();
startNightlyCron();

server.listen(config.port, () => {
  logger.info(`API listening on http://localhost:${config.port}`);
});
