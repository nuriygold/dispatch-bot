import pino from 'pino';

function resolveTransport() {
  if (process.env.NODE_ENV === 'production' || process.env.LOG_PRETTY === '0') {
    return undefined;
  }

  try {
    require.resolve('pino-pretty');
    return { target: 'pino-pretty' };
  } catch {
    return undefined;
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: resolveTransport(),
});
