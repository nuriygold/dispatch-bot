let socket = null;
let listeners = new Set();
let subscribePayload = null;
let reconnectTimer = null;
let lastUrl = null;
let reconnectAttempts = 0;
let statusListeners = new Set();

export function withWsToken(url, token) {
  if (!token) return url;
  const glue = url.includes('?') ? '&' : '?';
  return `${url}${glue}token=${encodeURIComponent(token)}`;
}

function emitStatus(status) {
  statusListeners.forEach((cb) => cb(status));
}

export function connectWs(url, subscribeMsg) {
  if (socket) socket.close();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  lastUrl = url;
  subscribePayload = subscribeMsg || null;
  emitStatus({ state: 'connecting' });
  socket = new WebSocket(url);
  socket.onopen = () => {
    reconnectAttempts = 0;
    emitStatus({ state: 'connected' });
    if (subscribePayload) {
      socket.send(JSON.stringify(subscribePayload));
    }
  };
  socket.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      listeners.forEach((cb) => cb(data));
    } catch (_err) {
      emitStatus({ state: 'error', message: 'Invalid WebSocket payload' });
    }
  };
  socket.onerror = () => {
    emitStatus({ state: 'error', message: 'WebSocket error' });
  };
  socket.onclose = () => {
    emitStatus({ state: 'reconnecting' });
    reconnectAttempts += 1;
    const delay = Math.min(10000, 1000 * 2 ** Math.min(reconnectAttempts, 3));
    reconnectTimer = setTimeout(() => connectWs(lastUrl || url, subscribePayload), delay);
  };
}

export function onMessage(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function onWsStatus(cb) {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

export function closeWs() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  lastUrl = null;
  reconnectAttempts = 0;
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  emitStatus({ state: 'disconnected' });
}
