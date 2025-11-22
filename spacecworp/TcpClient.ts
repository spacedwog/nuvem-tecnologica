// Compatível com Expo Go!
export function connectWebSocketServer({ url, onLog }: { url: string; onLog: (msg: string, type?: string) => void }) {
  const ws = new WebSocket(url);

  ws.onopen = () => onLog("WebSocket conectado!", "success");
  ws.onmessage = ({ data }) => onLog("Recebido: " + data, "received");
  ws.onerror = (err) => onLog("Erro WebSocket: " + JSON.stringify(err), "error");
  ws.onclose = () => onLog("WebSocket fechado.", "closed");

  return ws;
}

export function sendWebSocketData(ws: WebSocket, message: string, onLog?: (msg: string, type?: string) => void) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
    if (onLog) onLog("Enviado: " + message, "sent");
  } else {
    if (onLog) onLog("WebSocket não está conectado.", "warning");
  }
}