let socket = null;
let listeners = new Set();
let subscribePayload = null;

export function connectWs(url, subscribeMsg) {
  if (socket) socket.close();
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
    setTimeout(() => connectWs(url, subscribePayload), 2000);
  };
}

export function onMessage(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
