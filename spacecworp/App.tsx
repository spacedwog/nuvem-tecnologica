import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Modal, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import React, { useState } from 'react';
import { connectWebSocketServer, sendWebSocketData } from './TcpClient'; // Use TcpClient.ts adaptado para WebSocket!

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [textToSend, setTextToSend] = useState('');

  function addLog(message: string) {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  }

  function handleConnect() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      addLog("Já conectado.");
      return;
    }
    const ws = connectWebSocketServer({
      url: "ws://192.168.15.8:8000", // ajuste com seu endpoint
      onLog: addLog,
    });
    setSocket(ws);
  }

  function handleDisconnect() {
    if (socket) {
      socket.close();
      setSocket(null);
      addLog("Desconectado manualmente.");
    }
  }

  function handleSendData() {
    if (socket && textToSend.trim() !== '') {
      sendWebSocketData(socket, textToSend, addLog);
      setTextToSend('');
    } else if (!socket || socket.readyState !== WebSocket.OPEN) {
      addLog("WebSocket não está conectado.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Log da conexão WebSocket</Text>
      <View style={styles.buttonRow}>
        <Button title="Conectar WebSocket" onPress={handleConnect} />
        <Button title="Desconectar" onPress={handleDisconnect} />
        <Button title="Exibir log" onPress={() => setModalVisible(true)} />
      </View>
      <View style={styles.sendRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Digite o texto para enviar..."
          value={textToSend}
          onChangeText={setTextToSend}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendData}>
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>
      <StatusBar style="auto" />
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Log da conexão WebSocket</Text>
            <ScrollView style={styles.logContainer}>
              {log.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum evento ainda</Text>
              ) : (
                log.map((item, i) => (
                  <Text key={i} style={styles.logText}>{item}</Text>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', },
  heading: { fontSize: 18, marginBottom: 20, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 18 },
  sendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  textInput: {
    flex: 1,
    borderColor: '#bbb',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
    backgroundColor: '#f7f7f7',
    minWidth: 180
  },
  sendButton: {
    backgroundColor: '#0077ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    elevation: 2,
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center', },
  card: {
    width: '85%',
    minHeight: 340,
    maxHeight: '75%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.23,
    shadowRadius: 9.51,
    elevation: 14,
    alignItems: 'stretch'
  },
  cardTitle: { fontSize: 22, marginBottom: 18, fontWeight: 'bold', textAlign: 'center' },
  logContainer: { flex: 1, marginBottom: 18, maxHeight: 200 },
  logText: { fontSize: 16, paddingVertical: 3, borderBottomColor: '#eee', borderBottomWidth: 1, },
  emptyText: { textAlign: 'center', fontStyle: 'italic', color: '#999', fontSize: 16 },
  closeButton: {
    backgroundColor: '#0077ff', alignSelf: 'center', borderRadius: 8,
    paddingHorizontal: 28, paddingVertical: 11, marginTop: 5,
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});