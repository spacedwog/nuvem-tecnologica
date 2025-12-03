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
  Platform,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const BASE_URL = "http://192.168.15.6:80";

// Funções de CNPJ
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

async function consultaCNPJ(cnpj: string): Promise<any> {
  try {
    const cnpjLimpo = cnpj.replace(/[^\d]+/g, '');
    if (cnpjLimpo.length !== 14) throw new Error("CNPJ inválido.");
    const url = `https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`;
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error("Erro ao consultar CNPJ na ReceitaWS.");
    const json = await resp.json();
    if (json.status === 'ERROR') throw new Error(json.message);
    return json;
  } catch (e: any) {
    throw new Error(e.message || "Falha na consulta de CNPJ.");
  }
}

// Funções ESP32-CAM
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

const MODAL_PAGES = [
  "empresa",
  "enderecos",
  "atividade_principal",
  "atividades_secundarias",
  "socios",
  "extra"
];

// Monta os dados para os modais a partir das funcionalidades da ReceitaWS
function getModalPagesData(cnpjDados: any) {
  return [
    {
      title: "Empresa",
      content: (
        <>
          <Text style={modalStyles.itemLabel}>Razão social:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.nome}</Text>
          <Text style={modalStyles.itemLabel}>Nome fantasia:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.fantasia || '-'}</Text>
          <Text style={modalStyles.itemLabel}>Situação cadastral:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.situacao}</Text>
          <Text style={modalStyles.itemLabel}>Tipo:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.tipo}</Text>
          <Text style={modalStyles.itemLabel}>Natureza jurídica:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.natureza_juridica}</Text>
          <Text style={modalStyles.itemLabel}>Capital social:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.capital_social}</Text>
          <Text style={modalStyles.itemLabel}>Data de abertura:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.abertura}</Text>
        </>
      )
    },
    {
      title: "Endereços",
      content: (
        <>
          <Text style={modalStyles.itemLabel}>Endereço:</Text>
          <Text style={modalStyles.itemValue}>
            {cnpjDados.logradouro} {cnpjDados.numero} {cnpjDados.complemento}
          </Text>
          <Text style={modalStyles.itemLabel}>Bairro:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.bairro}</Text>
          <Text style={modalStyles.itemLabel}>Município:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.municipio}</Text>
          <Text style={modalStyles.itemLabel}>UF:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.uf}</Text>
          <Text style={modalStyles.itemLabel}>CEP:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.cep}</Text>
          <Text style={modalStyles.itemLabel}>Email:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.email}</Text>
          <Text style={modalStyles.itemLabel}>Telefone:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.telefone}</Text>
        </>
      )
    },
    {
      title: "CNAE Principal",
      content: (
        <>
          <Text style={modalStyles.itemLabel}>Código:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.atividade_principal?.[0]?.code || '-'}</Text>
          <Text style={modalStyles.itemLabel}>Descrição:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.atividade_principal?.[0]?.text || '-'}</Text>
        </>
      )
    },
    {
      title: "CNAEs Secundários",
      content: (
        <ScrollView style={{ maxHeight: 140 }}>
          {Array.isArray(cnpjDados.atividades_secundarias) && cnpjDados.atividades_secundarias.length > 0 ? cnpjDados.atividades_secundarias.map((a:any, i:number) => (
            <View key={i} style={{ marginBottom: 7 }}>
              <Text style={modalStyles.itemLabel}>CNAE Secundário #{i+1}</Text>
              <Text style={modalStyles.itemValue}>{a.code} - {a.text}</Text>
            </View>
          )) : <Text style={modalStyles.itemValue}>Não informado</Text>}
        </ScrollView>
      )
    },
    {
      title: "Sócios / QSA",
      content: (
        <ScrollView style={{ maxHeight: 140 }}>
          {Array.isArray(cnpjDados.qsa) && cnpjDados.qsa.length > 0 ? cnpjDados.qsa.map((s:any,i:number) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <Text style={modalStyles.itemLabel}>Nome:</Text>
              <Text style={modalStyles.itemValue}>{s.nome}</Text>
              <Text style={modalStyles.itemLabel}>Qualificação:</Text>
              <Text style={modalStyles.itemValue}>{s.qual}</Text>
            </View>
          )) : <Text style={modalStyles.itemValue}>Não informado</Text>}
        </ScrollView>
      )
    },
    {
      title: "Extra",
      content: (
        <>
          <Text style={modalStyles.itemLabel}>Status:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.status}</Text>
          <Text style={modalStyles.itemLabel}>Última atualização:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.ultima_atualizacao}</Text>
          <Text style={modalStyles.itemLabel}>Especial:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.efr || '-'}</Text>
          <Text style={modalStyles.itemLabel}>Motivo Situação:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.motivo_situacao || '-'}</Text>
          <Text style={modalStyles.itemLabel}>Situação especial:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.situacao_especial || '-'}</Text>
          <Text style={modalStyles.itemLabel}>Data da situação especial:</Text>
          <Text style={modalStyles.itemValue}>{cnpjDados.data_situacao_especial || '-'}</Text>
        </>
      )
    }
  ];
}

// COMPONENTE PRINCIPAL
export default function App() {
  // Estados padrão
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cnpj, setCnpj] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cnpjDados, setCnpjDados] = useState<any | null>(null);

  // Animações empresariais
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Modal de consulta CNPJ paginado
  const [modalPage, setModalPage] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  // Main app states
  const [log, setLog] = useState<{ time: string; msg: string; type?: string }[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [textToSend, setTextToSend] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const notificationsPolling = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
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

  function handleLogout() {
    Alert.alert("Logout", "Deseja sair do aplicativo?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => {
        setIsLoggedIn(false);
        setCnpj('');
        setIsConnected(false);
        setStatus(null);
        setLog([]);
        setCnpjDados(null);
      } }
    ]);
  }

  function handleChangeCNPJ(text: string) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setCnpj(maskCNPJ(text));
    setCnpjDados(null);
  }

  // Login usando consulta da ReceitaWS
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
      const dados = await consultaCNPJ(cnpj);
      setCnpjDados(dados);
      setSuccessMsg('Login realizado com sucesso!');
      setIsLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        setIsLoggedIn(true);
      }, 900);
    } catch (e: any) {
      setErrorMsg('CNPJ não encontrado ou inválido! ' + e.message);
      setCnpjDados(null);
      setIsLoading(false);
    }
  }

  // --- Modal de consulta de CNPJ paginado ---
  function openModalPage(page: number = 0) {
    setModalPage(page);
    setModalVisible(true);
  }
  function nextModalPage() {
    setModalPage((p) => Math.min(p+1, MODAL_PAGES.length-1));
  }
  function prevModalPage() {
    setModalPage((p) => Math.max(p-1, 0));
  }
  function closeModalPage() {
    setModalVisible(false);
    setModalPage(0);
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

  // ----------- Login empresarial via CNPJ -----------
  if (!isLoggedIn) {
    return (
      <KeyboardAvoidingView style={loginStyles.loginBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  // --- Seu app principal ---
  const modalPagesData = cnpjDados ? getModalPagesData(cnpjDados) : [];

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
        <Text style={{ color: "#aaa", marginTop: 10 }}>Empresa logada: {cnpjDados.fantasia}</Text>

        {cnpjDados && (
          <TouchableOpacity
            style={styles.cnpjButton}
            onPress={() => openModalPage(0)}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#3182ce', fontWeight: 'bold', textAlign: 'center' }}>
              Ver dados completos da Empresa
            </Text>
          </TouchableOpacity>
        )}

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

      {/* Modal paginado com dados do CNPJ */}
      {cnpjDados && (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModalPage}>
        <View style={modalStyles.wrapper}>
          <View style={modalStyles.modalCard}>
            <Text style={modalStyles.modalTitle}>
              {modalPagesData[modalPage]?.title ?? ''}
            </Text>
            <ScrollView style={modalStyles.modalContent}>
              {modalPagesData[modalPage]?.content}
            </ScrollView>
            <View style={modalStyles.modalPaginationRow}>
              <TouchableOpacity
                style={[modalStyles.modalPaginationBtn, modalPage === 0 && { opacity: 0.5 }]}
                disabled={modalPage === 0}
                onPress={prevModalPage}
              >
                <Text style={modalStyles.pgBtnText}>Anterior</Text>
              </TouchableOpacity>
              <Text style={modalStyles.pgIndicator}>{modalPage+1} / {MODAL_PAGES.length}</Text>
              <TouchableOpacity
                style={[modalStyles.modalPaginationBtn, modalPage === MODAL_PAGES.length-1 && { opacity: 0.5 }]}
                disabled={modalPage === MODAL_PAGES.length-1}
                onPress={nextModalPage}
              >
                <Text style={modalStyles.pgBtnText}>Próximo</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={modalStyles.closeModalBtn}
              onPress={closeModalPage}
            >
              <Text style={modalStyles.closeModalText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      )}

      {/* Modal antigo (LOG) permanece igual */}
      <Modal
        visible={modalVisible && !cnpjDados}
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
    width: '100%', maxWidth: 420,
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
  cnpjButton: {
    alignSelf: "center",
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 13,
    borderRadius: 9,
    backgroundColor: "#e6f0fc",
    elevation: 1,
    borderWidth: 1,
    borderColor: "#b5ccf1"
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

const modalStyles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    width: '95%',
    maxWidth: 450,
    minHeight: 320,
    maxHeight: Dimensions.get('window').height * 0.88,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 21,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.21,
    shadowRadius: 13,
    elevation: 11
  },
  modalTitle: { fontSize: 21, fontWeight: 'bold', marginBottom: 14, textAlign: 'center', color: '#2182dd' },
  modalContent: { flex: 1, marginBottom: 12, paddingHorizontal: 4 },
  modalPaginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 },
  modalPaginationBtn: {
    backgroundColor: "#e5edf7",
    borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16,
    borderWidth: 1, borderColor: "#aacbe3"
  },
  pgBtnText: { fontWeight: "bold", color: "#3182ce" },
  pgIndicator: { marginHorizontal: 13, fontWeight: "bold", color: "#193769" },
  closeModalBtn: {
    alignSelf: 'center', backgroundColor: '#3172fa',
    borderRadius: 9, paddingHorizontal: 30, paddingVertical: 12, marginTop: 2,
  },
  closeModalText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  itemLabel: { fontWeight: "bold", marginTop: 6, color: "#23578a" },
  itemValue: { color: "#222", marginBottom: 2, fontSize: 15 }
});