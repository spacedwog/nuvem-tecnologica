import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Modal, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import React, { useState } from 'react';
import { fetchStatus, sendCommand } from './ApiClient';

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [log, setLog] = useState<{ time: string; msg: string; type?: string }[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [textToSend, setTextToSend] = useState('');

  async function handleConnect() {
    setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Conectando ao ESP32-CAM...", type: "info" }]);
    try {
      const s = await fetchStatus();
      setStatus(s);
      setIsConnected(true);
      setLog((prev) => [
        ...prev,
        { time: new Date().toLocaleTimeString(), msg: "Conectado! Distância: " + s.distancia + "cm", type: "success" }
      ]);
    } catch (e: any) {
      setIsConnected(false);
      setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: e.message, type: "error" }]);
    }
  }

  async function handleSendData() {
    if (!isConnected) {
      setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Não está conectado ao ESP32-CAM.", type: "error" }]);
      return;
    }
    if (!textToSend.trim()) return;
    setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Enviando comando: " + textToSend, type: "sent" }]);
    try {
      const resp = await sendCommand(textToSend.trim());
      setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Resposta: " + resp, type: "received" }]);
    } catch (e: any) {
      setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: e.message, type: "error" }]);
    } finally {
      setTextToSend('');
    }
  }

  async function handleDisconnect() {
    setIsConnected(false);
    setStatus(null);
    setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Desconectado manualmente.", type: "closed" }]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Controle ESP32-CAM (VESPA)</Text>
      <Text style={[
        styles.connectionStatus,
        isConnected ? styles.connected : styles.disconnected
      ]}>
        {isConnected ? "Status: Conectado" : "Status: Desconectado"}
      </Text>
      <View style={styles.buttonRow}>
        <Button
          title="Conectar"
          onPress={handleConnect}
          color={isConnected ? 'gray' : '#0077ff'}
          disabled={isConnected}
        />
        <Button
          title="Desconectar"
          onPress={handleDisconnect}
          color={isConnected ? '#d60000' : 'gray'}
          disabled={!isConnected}
        />
        <Button title="Exibir log" onPress={() => setModalVisible(true)} />
      </View>

      <View style={styles.sendRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Comando: forward, back, left, right, stop"
          value={textToSend}
          onChangeText={setTextToSend}
          editable={isConnected}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            textToSend.trim() && isConnected ? {} : styles.sendButtonDisabled
          ]}
          onPress={handleSendData}
          disabled={!textToSend.trim() || !isConnected}
        >
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>

      {isConnected && (
        <View style={styles.statusBox}>
          <Text>Distância (cm): <Text style={{ fontWeight: "bold" }}>{status?.distancia}</Text></Text>
          <Text>Modo WiFi: <Text style={{ fontWeight: "bold" }}>{status?.wifi_mode}</Text></Text>
        </View>
      )}

      <StatusBar style="auto" />
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Log</Text>
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
                      item.type === "info" && styles.info,
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
  statusBox: {
    padding: 12, marginVertical: 6, borderRadius: 10,
    backgroundColor: "#f2f9ff", alignSelf: "stretch", marginHorizontal: 12
  },
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
  disconnected: { color: '#d60000' },
  error: { color: '#d60000', fontWeight: 'bold' },
  sent: { color: '#0956dc' },
  received: { color: '#1f4959' },
  info: { color: '#407f71' },
  closed: { color: '#555' },
  success: { color: '#079b31' },
});