import TcpSocket from 'react-native-tcp-socket';

export default function connectTcpServer(host: string, port: number) {
  const client = TcpSocket.createConnection({ port, host }, () => {
    console.log('Connected to TCP server!');
    client.write('Hello server!');
  });

  client.on('data', (data) => {
    console.log('Received from server:', data.toString());
  });

  client.on('error', (error) => {
    console.log('Error:', error);
  });

  client.on('close', () => {
    console.log('Connection closed!');
  });

  return client;
}