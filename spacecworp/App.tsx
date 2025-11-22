import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import connectWebSocketServer from "./TcpClient";

export default function App() {
  function handleConnect() {
    connectWebSocketServer("ws://192.168.15.8:8000"); // troque pelo seu servidor
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