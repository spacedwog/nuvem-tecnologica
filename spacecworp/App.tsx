import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Button,
  Modal,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const API_ENDPOINT = 'http://192.168.15.6:80/api/login-cnpj';
const CNPJ_PERMITIDO = "62.904.267/0001-60";
const BASE_URL = "http://192.168.15.6:80";

function maskCNPJ(text: string): string {
  let v = text.replace(/\D/g, '');
  v = v.slice(0, 14);
  v = v.replace(/^(\d{2})(\d)/, "$1.$2");
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
  v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
  v = v.replace(/(\d{4})(\d)/, "$1-$2");
  return v;
}

function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += +numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado !== +digitos.charAt(0)) return false;
  tamanho += 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += +numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  return resultado === +digitos.charAt(1);
}

async function autenticaCNPJ(cnpj: string): Promise<boolean> {
  try {
    const resp = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj }),
    });
    if (!resp.ok) return false;
    const json = await resp.json();
    return json.autorizado === true;
  } catch {
    return cnpj === CNPJ_PERMITIDO;
  }
}

async function fetchStatus(): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error("Resposta inválida do ESP32-CAM.");
    return await res.json();
  } catch (e) {
    throw new Error("Não foi possível conectar ao ESP32-CAM.");
  }
}

async function sendCommand(cmd: string): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/cmd?cmd=${encodeURIComponent(cmd)}`);
    if (!res.ok) throw new Error(await res.text());
    return await res.text();
  } catch (e: any) {
    throw new Error(e.message || "Falha ao enviar comando.");
  }
}

async function fetchNotifications(): Promise<{ time: string; msg: string; type?: string }[]> {
  const url = `${BASE_URL}/notify`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    return await resp.json();
  } catch (e) {
    return [];
  }
}

export default function App() {
  // Login states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cnpj, setCnpj] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Animações empresariais
  const logoAnim = useRef(new Animated.Value(0)).current; // Logo começa "oculto"
  const cardAnim = useRef(new Animated.Value(0)).current; // Card translada de baixo
  const fadeAnim = useRef(new Animated.Value(0)).current; // Sucesso fade

  useEffect(() => {
    // Entrada animada da logo e do card de login
    Animated.parallel([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 950,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 60,
        delay: 500
      }),
    ]).start();
  }, []);

  // Main app states
  const [modalVisible, setModalVisible] = useState(false);
  const [log, setLog] = useState<{ time: string; msg: string; type?: string }[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [textToSend, setTextToSend] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const notificationsPolling = useRef<NodeJS.Timeout | null>(null);

  // Logout function
  function handleLogout() {
    Alert.alert("Logout", "Deseja sair do aplicativo?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => {
        setIsLoggedIn(false);
        setCnpj('');
        setIsConnected(false);
        setStatus(null);
        setLog([]);
      } }
    ]);
  }

  // Login logic
  function handleChangeCNPJ(text: string) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setCnpj(maskCNPJ(text));
  }

  async function loginCNPJ() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    fadeAnim.setValue(0);
    if (!validateCNPJ(cnpj)) {
      setErrorMsg('CNPJ inválido');
      setIsLoading(false);
      return;
    }
    try {
      const autorizado = await autenticaCNPJ(cnpj);
      setIsLoading(false);
      if (!autorizado) {
        setErrorMsg('CNPJ não autorizado.');
        return;
      }
      setSuccessMsg('Login realizado com sucesso!');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        setIsLoggedIn(true);
      }, 900);
    } catch {
      setErrorMsg('Erro de conexão.');
      setIsLoading(false);
    }
  }

  // Main app logic
  useEffect(() => {
    async function pollNotifications() {
      if (!isConnected) return;
      const notifs = await fetchNotifications();
      if (!Array.isArray(notifs)) return;
      setLog(prev => {
        const allTimes = new Set(prev.map(l => l.time + l.msg));
        const news = notifs.filter((n: any) => !allTimes.has(n.time + n.msg));
        if (news.length === 0) return prev;
        return [...prev, ...news.map(n => ({
          time: n.time ?? new Date().toLocaleTimeString(),
          msg: n.msg,
          type: n.type ?? 'notify',
        }))];
      });
    }
    if (isConnected) {
      notificationsPolling.current = setInterval(pollNotifications, 2000);
    } else if (notificationsPolling.current) {
      clearInterval(notificationsPolling.current);
    }
    return () => {
      if (notificationsPolling.current) clearInterval(notificationsPolling.current);
    }
  }, [isConnected]);

  async function handleReload() {
    setRefreshing(true);
    try {
      if (isConnected) {
        const s = await fetchStatus();
        setStatus(s);
        setLog((prev) => [
          ...prev,
          { time: new Date().toLocaleTimeString(), msg: "Status atualizado!", type: "info" }
        ]);
      } else {
        setLog((prev) => [
          ...prev,
          { time: new Date().toLocaleTimeString(), msg: "Não conectado: nada para atualizar.", type: "info" }
        ]);
      }
    } catch (e: any) {
      setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Erro ao atualizar status: " + e.message, type: "error" }]);
    }
    setRefreshing(false);
  }

  async function handleConnect() {
    setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Conectando ao ESP32-CAM...", type: "info" }]);
    try {
      const s = await fetchStatus();
      setStatus(s);
      setIsConnected(true);
      setLog((prev) => [
        ...prev,
        { time: new Date().toLocaleTimeString(), msg: "Conectado!", type: "success" }
      ]);
    } catch (e: any) {
      setIsConnected(false);
      setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: e.message, type: "error" }]);
    }
  }

  async function handleSendData(cmd?: string) {
    if (!isConnected) {
      setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Não está conectado ao ESP32-CAM.", type: "error" }]);
      return;
    }
    const toSend = (cmd !== undefined ? cmd : textToSend).trim();
    if (!toSend) return;
    setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Enviando comando: " + toSend, type: "sent" }]);
    try {
      const resp = await sendCommand(toSend);
      setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Resposta: " + resp, type: "received" }]);
    } catch (e: any) {
      setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: e.message, type: "error" }]);
    } finally {
      if (cmd === undefined) setTextToSend('');
    }
  }

  async function handleDisconnect() {
    setIsConnected(false);
    setStatus(null);
    setLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Desconectado manualmente.", type: "closed" }]);
  }

  if (!isLoggedIn) {
    return (
      <KeyboardAvoidingView style={loginStyles.loginBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* animação empresarial */}
        <Animated.View style={{
          opacity: logoAnim,
          transform: [{
            scale: logoAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.85, 1],
            }),
          }]
        }}>
          <View style={loginStyles.logoArea}>
            {/* Você pode substituir por um SVG/Icon mais "corporativo" */}
            <MaterialIcons name="account-balance" size={57} color="#3182ce" />
            <Text style={loginStyles.empresaText}>Spacecworp</Text>
          </View>
        </Animated.View>
        <Animated.View
          style={{
            transform: [{
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [70, 0]
              })
            }],
            opacity: cardAnim,
            width: '100%'
          }}>
          <View style={loginStyles.loginCard}>
            <Text style={loginStyles.loginTitle}>Login Empresarial</Text>
            <Text style={loginStyles.loginSubtitle}>Acesso restrito via CNPJ</Text>
            <View style={loginStyles.inputArea}>
              <Ionicons name="key-outline" size={22} color="#5072b7" style={{ marginRight: 7 }} />
              <TextInput
                style={loginStyles.inputCnpj}
                value={cnpj}
                keyboardType="numeric"
                placeholder="CNPJ (XX.XXX.XXX/XXXX-XX)"
                onChangeText={handleChangeCNPJ}
                maxLength={18}
                editable={!isLoading}
                returnKeyType="done"
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity
              style={loginStyles.buttonEntrar}
              activeOpacity={0.75}
              onPress={loginCNPJ}
              disabled={isLoading || cnpj.length < 18}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 17 }}>Entrar</Text>}
            </TouchableOpacity>
            {errorMsg && <Text style={loginStyles.errorMsg}>{errorMsg}</Text>}
            {successMsg && <Animated.Text style={[loginStyles.successMsg, { opacity: fadeAnim }]}>{successMsg}</Animated.Text>}
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: '#999' }}>CNPJ autorizado: {CNPJ_PERMITIDO}</Text>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  // ... restante do app principal, igual ao exemplo anterior...
  // (Mantém toda tela principal do ESP32-CAM, log, desconectar, enviar comandos etc.)

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleReload}
            colors={["#0077ff"]}
          />
        }
      >
        <Text style={styles.heading}>ESP32-CAM (VESPA)</Text>
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
            style={styles.inputText}
            value={textToSend}
            onChangeText={setTextToSend}
            placeholder="Digite sua mensagem"
            editable={isConnected}
            onSubmitEditing={() => handleSendData()}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={() => handleSendData()}
            style={[
              styles.sendButton,
              !isConnected && styles.sendButtonDisabled
            ]}
            disabled={!isConnected || !textToSend.trim()}
          >
            <Text style={styles.sendButtonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
        {isConnected && (
          <View style={styles.statusBox}>
            <Text>Modo WiFi: <Text style={{ fontWeight: "bold" }}>{status?.wifi_mode}</Text></Text>
          </View>
        )}
        <Text style={{ color: "#aaa", marginTop: 10 }}>Empresa logada: {cnpj}</Text>
        <TouchableOpacity
          style={{
            marginTop: 16,
            backgroundColor: '#E53E3E',
            paddingHorizontal: 30,
            paddingVertical: 10,
            borderRadius: 8,
            alignSelf: 'center',
          }}
          onPress={handleLogout}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Logout</Text>
        </TouchableOpacity>
        <StatusBar style="auto" />
      </ScrollView>
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Log</Text>
            <ScrollView
              style={styles.logContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleReload}
                  colors={["#0077ff"]}
                />
              }
            >
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
                      item.type === "notify" && styles.notify,
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

// --- STYLES ---
const loginStyles = StyleSheet.create({
  loginBg: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eaf1fb' },
  loginCard: {
    width: '92%', maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 18, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.23, shadowRadius: 14, elevation: 14,
    alignItems: 'center',
  },
  logoArea: { alignItems: 'center', marginBottom: 27 },
  empresaText: { fontSize: 31, fontWeight: 'bold', color: '#193769', marginTop: 5, letterSpacing: 1.5 },
  loginTitle: { fontSize: 22, fontWeight: 'bold', color: '#3182ce', marginBottom: 8 },
  loginSubtitle: { fontSize: 14, color: '#666', marginBottom: 17 },
  inputArea: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#f5f7fc', borderRadius: 10, marginBottom: 11, borderWidth: 1, borderColor: '#cde3fa', paddingHorizontal: 9 },
  inputCnpj: { flex: 1, fontSize: 17, paddingVertical: 11, color: '#23292e' },
  buttonEntrar: { width: '100%', backgroundColor: '#3182ce', borderRadius: 10, alignItems: 'center', paddingVertical: 15, marginTop: 7, elevation: 2 },
  errorMsg: { color: '#d60000', fontWeight: 'bold', marginTop: 14 },
  successMsg: { color: '#328d3f', fontWeight: 'bold', marginTop: 14, fontSize: 17 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  heading: { fontSize: 20, marginBottom: 6, fontWeight: 'bold', textAlign: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 14 },
  sendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, justifyContent: 'center' },
  inputText: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 16,
    marginRight: 9,
    minWidth: 150,
    maxWidth: 240,
  },
  sendButton: {
    backgroundColor: '#0077ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    elevation: 2,
  },
  sendButtonDisabled: { opacity: 0.5 },
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
  notify: { color: "#c97806", fontStyle: "italic", fontWeight: "bold" },
});