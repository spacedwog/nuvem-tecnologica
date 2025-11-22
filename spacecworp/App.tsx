import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import connectTcpServer from './TcpClient';

export default function App() {
  function handleConnect() {
    connectTcpServer('192.168.0.100', 8000); // Altere para IP/porta do servidor desejado
  }

  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <Button title="Connect TCP/IP" onPress={handleConnect} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});