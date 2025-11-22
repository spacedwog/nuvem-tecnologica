export function connectWebSocketServer({ url, onLog }: { url: string; onLog: (msg: string) => void }) {
  const ws = new WebSocket(url);

  ws.onopen = () => onLog("WebSocket conectado!");
  ws.onmessage = ({ data }) => onLog("Recebido: " + data);
  ws.onerror = (err) => onLog("Erro WebSocket: " + JSON.stringify(err));
  ws.onclose = () => onLog("WebSocket fechado.");

  return ws;
}