export function connectWebSocketServer({ url, onLog }: { url: string; onLog: (msg: string) => void }) {
  const ws = new WebSocket(url);

  ws.onopen = () => onLog("WebSocket conectado!");
  ws.onmessage = ({ data }) => onLog("Recebido: " + data);
  ws.onerror = (err) => onLog("Erro WebSocket: " + JSON.stringify(err));
  ws.onclose = () => onLog("WebSocket fechado.");

  return ws;
}

export function sendWebSocketData(ws: WebSocket, message: string, onLog?: (msg: string) => void) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
    if (onLog) onLog("Enviado: " + message);
  } else {
    if (onLog) onLog("WebSocket não está conectado.");
  }
}