import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Modal, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import React, { useState } from 'react';
import { connectWebSocketServer, sendWebSocketData } from './TcpClient';

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [log, setLog] = useState<{ time: string; msg: string; type?: string }[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [textToSend, setTextToSend] = useState('');
  const [socketState, setSocketState] = useState<'closed' | 'connecting' | 'open'>('closed');

  function addLog(message: string, type?: string) {
    setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: message, type }]);
    if (type === 'success') setSocketState('open');
    if (type === 'closed' || type === 'error') setSocketState('closed');
  }

  function handleConnect() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      addLog("Já conectado.", "warning");
      return;
    }
    setSocketState('connecting');
    const ws = connectWebSocketServer({
      url: "wss://192.168.15.8:8000", // Endpoint público WebSocket!
      onLog: addLog,
    });
    setSocket(ws);
  }

  function handleDisconnect() {
    if (socket) {
      socket.close();
      setSocket(null);
      setSocketState('closed');
      addLog("Desconectado manualmente.", "closed");
    }
  }

  function handleSendData() {
    if (socket && textToSend.trim() !== '' && socket.readyState === WebSocket.OPEN) {
      sendWebSocketData(socket, textToSend, addLog);
      setTextToSend('');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>WebSocket Demo: Envio de Dados</Text>
      <Text style={[
        styles.connectionStatus,
        socketState === 'open' ? styles.connected : socketState === 'connecting' ? styles.connecting : styles.disconnected
      ]}>
        {socketState === 'open'
          ? "Status: Conectado"
          : socketState === 'connecting'
            ? "Status: Conectando..."
            : "Status: Desconectado"}
      </Text>
      <View style={styles.buttonRow}>
        <Button
          title="Conectar"
          onPress={handleConnect}
          color={socketState === 'open' ? 'gray' : '#0077ff'}
          disabled={socketState === 'open' || socketState === 'connecting'}
        />
        <Button
          title="Desconectar"
          onPress={handleDisconnect}
          color={socketState === 'open' ? '#d60000' : 'gray'}
          disabled={socketState !== 'open'}
        />
        <Button title="Exibir log" onPress={() => setModalVisible(true)} />
      </View>
      <View style={styles.sendRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Digite o texto para enviar..."
          value={textToSend}
          onChangeText={setTextToSend}
          editable={socketState === 'open'}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            textToSend.trim() && socketState === 'open' ? {} : styles.sendButtonDisabled
          ]}
          onPress={handleSendData}
          disabled={!textToSend.trim() || socketState !== 'open'}
        >
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
                  <Text key={i}
                    style={[
                      styles.logText,
                      item.type === "error" && styles.error,
                      item.type === "success" && styles.success,
                      item.type === "sent" && styles.sent,
                      item.type === "received" && styles.received,
                      item.type === "warning" && styles.warning,
                      item.type === "closed" && styles.closed,
                    ]}
                  >
                    [{item.time}] {item.msg}
                  </Text>
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
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  heading: { fontSize: 20, marginBottom: 6, fontWeight: 'bold', textAlign: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 14 },
  sendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  textInput: {
    flex: 1,
    borderColor: '#bbb',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
    backgroundColor: '#fbfbfb',
    minWidth: 180
  },
  sendButton: {
    backgroundColor: '#0077ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    elevation: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center', },
  card: {
    width: '94%',
    minHeight: 340,
    maxHeight: '75%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 19,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.23,
    shadowRadius: 9.51,
    elevation: 14,
    alignItems: 'stretch'
  },
  cardTitle: { fontSize: 22, marginBottom: 17, fontWeight: 'bold', textAlign: 'center' },
  logContainer: { flex: 1, marginBottom: 18, maxHeight: 240 },
  logText: {
    fontSize: 16,
    paddingVertical: 3,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  emptyText: { textAlign: 'center', fontStyle: 'italic', color: '#999', fontSize: 16 },
  closeButton: {
    backgroundColor: '#0077ff', alignSelf: 'center', borderRadius: 8,
    paddingHorizontal: 32, paddingVertical: 13, marginTop: 4,
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  connectionStatus: { marginBottom: 11, fontSize: 15, textAlign: 'center', fontWeight: 'bold' },
  connected: { color: '#079b31' },
  connecting: { color: '#ffa600' },
  disconnected: { color: '#d60000' },
  error: { color: '#d60000', fontWeight: 'bold' },
  sent: { color: '#0956dc' },
  received: { color: '#1f4959' },
  warning: { color: '#ff8b00' },
  closed: { color: '#555' },
  success: { color: '#079b31' },
});