import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Modal, ScrollView } from 'react-native';
import { useState } from 'react';
import { connectWebSocketServer } from './TcpClient';

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [client, setClient] = useState<any | null>(null);

  function addLog(message: string) {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  }

  function handleConnect() {
    connectWebSocketServer({ url: "ws://192.168.15.8:8081", onLog: addLog });
  }

  function handleDisconnect() {
    if (client) {
      client.destroy();
      setClient(null);
      addLog('Desconectado manualmente.');
    }
  }

  return (
    <View style={styles.container}>
      <Text>Log da conexão TCP/IP</Text>
      <Button title="Conectar TCP/IP" onPress={handleConnect} />
      <Button title="Desconectar" onPress={handleDisconnect} />
      <Button title="Exibir log" onPress={() => setModalVisible(true)} />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Log da conexão TCP/IP</Text>
          <ScrollView style={styles.logContainer}>
            {log.map((item, i) => (
              <Text key={i} style={styles.logText}>{item}</Text>
            ))}
          </ScrollView>
          <Button title="Fechar" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d47b5296', alignItems: 'center', justifyContent: 'center', },
  modalContainer: { flex: 1, padding: 42, backgroundColor: '#a656acff', },
  modalTitle: { fontSize: 22, marginBottom: 12, fontWeight: 'bold', },
  logContainer: { flex: 1, marginBottom: 16, },
  logText: { fontSize: 16, paddingVertical: 4, },
});