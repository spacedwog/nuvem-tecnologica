export default function connectWebSocketServer(url: string) {
  const socket = new WebSocket(url);

  socket.onopen = () => {
    console.log("Connected to WebSocket!");
    socket.send("Hello server!");
  };

  socket.onmessage = (event) => {
    console.log("Received:", event.data);
  };

  socket.onerror = (error) => {
    // Try to log error message if available, otherwise log the whole error object
    if ('message' in error) {
      // @ts-ignore
      console.log("WebSocket Error:", error.message);
    } else {
      console.log("WebSocket Error:", error);
    }
  };

  socket.onclose = () => {
    console.log("WebSocket Closed!");
  };

  return socket;
}