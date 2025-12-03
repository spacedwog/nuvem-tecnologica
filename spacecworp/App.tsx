import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Modal, ScrollView, TouchableOpacity, RefreshControl, TextInput, Alert } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { fetchStatus, sendCommand } from './ApiClient';

// CNPJ da empresa autorizada
const EMPRESA_CNPJ = "62.904.267/0001-60";

// Validação simples de CNPJ (apenas formato básico)
function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/[^\d]/g, "");
  return cleaned.length === 14;
}

// Função para buscar notificações do ESP32-CAM (endpoint /notify ou similar)
async function fetchNotifications(): Promise<{ time: string; msg: string; type?: string }[]> {
  const url = 'http://192.168.15.3:80/notify';
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    return await resp.json();
  } catch (e) {
    return [];
  }
}

export default function App() {
  // Estado para tela de login
  const [cnpj, setCnpj] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Demais estados do app principal (após login)
  const [modalVisible, setModalVisible] = useState(false);
  const [log, setLog] = useState<{ time: string; msg: string; type?: string }[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [textToSend, setTextToSend] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const notificationsPolling = useRef<NodeJS.Timeout | null>(null);

  // Poll para notificações automáticas do ESP32-CAM enquanto conectado
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
    };
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

  // Lógica de login por CNPJ
  const handleLogin = () => {
    const validFormat = isValidCNPJ(cnpj);
    if (!validFormat) {
      setLoginError("CNPJ inválido.");
      return;
    }
    if (cnpj.trim() === EMPRESA_CNPJ) {
      setIsLoggedIn(true);
      setLoginError(null);
    } else {
      setLoginError("CNPJ não autorizado.");
    }
  };

  // Tela de login
  if (!isLoggedIn) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.heading}>Login por CNPJ</Text>
        <TextInput
          style={styles.inputText}
          value={cnpj}
          onChangeText={setCnpj}
          placeholder="Digite o CNPJ"
          keyboardType="numeric"
          maxLength={18}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
        >
          <Text style={styles.loginButtonText}>Entrar</Text>
        </TouchableOpacity>
        {loginError && <Text style={styles.error}>{loginError}</Text>}
      </View>
    );
  }

  // Tela principal do app após login
  return (
    <View style={styles.container}>
      {/* ...demais conteúdo igual ao original... */}
      {/* (Restante do App permanece igual, não foi removido para brevidade) */}
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loginButton: { backgroundColor: '#0077ff', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 36, marginTop: 12, elevation: 2 },
  loginButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  // demais estilos do app abaixo...
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  heading: { fontSize: 20, marginBottom: 6, fontWeight: 'bold', textAlign: 'center' },
  inputText: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 16,
    minWidth: 200,
    maxWidth: 240,
  },
  error: { color: '#d60000', fontWeight: 'bold', marginTop: 10 },
  // (o restante dos estilos aqui é igual ao seu code, só omiti para brevidade)
});