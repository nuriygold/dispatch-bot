let socket = null;
let listeners = new Set();
let subscribePayload = null;
let reconnectTimer = null;

export function withWsToken(url, token) {
  if (!token) return url;
  const glue = url.includes('?') ? '&' : '?';
  return `${url}${glue}token=${encodeURIComponent(token)}`;
}

export function connectWs(url, subscribeMsg) {
  if (socket) socket.close();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  subscribePayload = subscribeMsg || null;
  socket = new WebSocket(url);
  socket.onopen = () => {
    if (subscribePayload) {
      socket.send(JSON.stringify(subscribePayload));
    }
  };
  socket.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    listeners.forEach((cb) => cb(data));
  };
  socket.onclose = () => {
    // naive reconnect
    reconnectTimer = setTimeout(() => connectWs(url, subscribePayload), 2000);
  };
}

export function onMessage(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
