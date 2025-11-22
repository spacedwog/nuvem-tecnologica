import TcpSocket from 'react-native-tcp-socket';

export function connectTcpServer({ host, port, onLog }: { host: string; port: number; onLog: (msg: string) => void }) {
  const client = TcpSocket.createConnection({ host, port }, () => {
    onLog(`Conectado ao servidor TCP (${host}:${port})`);
    client.write('Hello server!');
  });

  client.on('data', (data) => {
    onLog('Recebido: ' + data.toString());
  });

  client.on('error', (error) => {
    onLog('Erro: ' + error.message);
  });

  client.on('close', () => {
    onLog('Conexão encerrada.');
  });

  return client;
}