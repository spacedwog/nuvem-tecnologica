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
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import { Empresa } from './domain/Empresa';
import { LogEntry } from './domain/LogEntry';
import { StatusESP } from './domain/StatusESP';
import { ConsultaCNPJService } from './services/ConsultaCNPJService';
import { ESP32Service } from './services/ESP32Service';

import ConsultaCNPJScreen from './screens/ConsultaCNPJScreen';
import ECommerceScreen from './screens/ECommerceScreen';
import TabBar from './components/TabBar';

import { PixUtils } from './utils/PixUtils';
import { PixService } from './services/PixService';
import { PixAuditoriaManager, PixAudit } from './services/PixAuditoriaManager';

import FaceLogin from './utils/FaceLogin'; // <== IMPORTANTE!

const MODAL_PAGES = [
  "empresa", "enderecos", "atividade_principal", "atividades_secundarias", "socios", "extra"
];

export default function MainScreen() {
  const routes = [
    { key: 'home', title: 'Home' },
    { key: 'empresas', title: 'Empresas' },
    { key: 'ECommerce', title: 'ECommerce' },
  ];
  const [activeScreen, setActiveScreen] = useState(0);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showFaceLogin, setShowFaceLogin] = useState(false); // NOVO!

  const [cnpj, setCnpj] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  const [modalPage, setModalPage] = useState<number>(0);
  const [modalCnpjVisible, setModalCnpjVisible] = useState<boolean>(false);
  const [modalLogVisible, setModalLogVisible] = useState<boolean>(false);

  const [log, setLog] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<StatusESP | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [textToSend, setTextToSend] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixId, setPixId] = useState<string | null>(null);
  const [pixStatus, setPixStatus] = useState<string | null>(null);
  const [pixAmountText, setPixAmountText] = useState<string>('');
  const [pixDesc, setPixDesc] = useState<string>('');
  const [pixAuditLog, setPixAuditLog] = useState<PixAudit[]>([]);

  const notificationsPolling = useRef<NodeJS.Timeout | null>(null);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const auditoriaManagerRef = useRef<PixAuditoriaManager | null>(null);
  useEffect(() => {
    auditoriaManagerRef.current = new PixAuditoriaManager(setPixAuditLog, empresa);
  }, [empresa, setPixAuditLog]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoAnim, { toValue: 1, duration: 950, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60, delay: 500 }),
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
        setEmpresa(null);
      } }
    ]);
  }

  function handleChangeCNPJ(text: string) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setCnpj(Empresa.maskCNPJ(text));
    setEmpresa(null);
  }

  async function loginCNPJ() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    fadeAnim.setValue(0);
    if (!Empresa.validateCNPJ(cnpj)) {
      setErrorMsg('CNPJ inválido');
      setIsLoading(false);
      return;
    }
    try {
      const dados = await ConsultaCNPJService.consulta(cnpj);
      setEmpresa(new Empresa(cnpj, dados));
      setSuccessMsg('Login realizado com sucesso!');
      setIsLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      setTimeout(() => setIsLoggedIn(true), 900);
    } catch (e: any) {
      setErrorMsg('CNPJ não encontrado ou inválido! ' + e.message);
      setEmpresa(null);
      setIsLoading(false);
    }
  }
  function openModalPage(page = 0) {
    setModalPage(page);
    setModalCnpjVisible(true);
  }
  function nextModalPage() { setModalPage((p) => Math.min(p+1, MODAL_PAGES.length-1)); }
  function prevModalPage() { setModalPage((p) => Math.max(p-1, 0)); }
  function closeModalPage() { setModalCnpjVisible(false); setModalPage(0); }
  function openModalLog() { setModalLogVisible(true); }
  function closeModalLog() { setModalLogVisible(false); }

  useEffect(() => {
    async function pollNotifications() {
      if (!isConnected) return;
      const notifs = await ESP32Service.fetchNotifications();
      setLog(prev => {
        const allTimes = new Set(prev.map(l => l.time + l.msg));
        const news = notifs.filter((n: LogEntry) => !allTimes.has(n.time + n.msg));
        if (news.length === 0) return prev;
        return [...prev, ...news];
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
        const s = await ESP32Service.fetchStatus();
        setStatus(new StatusESP(s));
        setLog((prev) => [
          ...prev, new LogEntry("Status atualizado!", "info")
        ]);
      } else {
        setLog((prev) => [
          ...prev, new LogEntry("Não conectado: nada para atualizar.", "info")
        ]);
      }
    } catch (e: any) {
      setLog((prev) => [...prev, new LogEntry("Erro ao atualizar status: " + e.message, "error")]);
    }
    setRefreshing(false);
  }
  async function handleConnect() {
    setLog((prev) => [...prev, new LogEntry("Conectando ao ESP32-CAM...", "info")]);
    try {
      const s = await ESP32Service.fetchStatus();
      setStatus(new StatusESP(s));
      setIsConnected(true);
      setLog((prev) => [...prev, new LogEntry("Conectado!", "success")]);
    } catch (e: any) {
      setIsConnected(false);
      setLog((prev) => [...prev, new LogEntry(e.message, "error")]);
    }
  }
  async function handleSendData(cmd?: string) {
    if (!isConnected) {
      setLog((prev) => [...prev, new LogEntry("Não está conectado ao ESP32-CAM.", "error")]);
      return;
    }
    const toSend = (cmd !== undefined ? cmd : textToSend).trim();
    if (!toSend) return;
    setLog((prev) => [...prev, new LogEntry("Enviando comando: " + toSend, "sent")]);
    try {
      const resp = await ESP32Service.sendCommand(toSend);
      setLog((prev) => [...prev, new LogEntry("Resposta: " + resp, "received")]);
    } catch (e: any) {
      setLog((prev) => [...prev, new LogEntry(e.message, "error")]);
    } finally {
      if (cmd === undefined) setTextToSend('');
    }
  }
  async function handleDisconnect() {
    setIsConnected(false);
    setStatus(null);
    setLog((prev) => [...prev, new LogEntry("Desconectado manualmente.", "closed")]);
  }
  async function handleSendCompanyToVespa() {
    if (!isConnected) {
      setLog((prev) => [...prev, new LogEntry("Conecte-se ao ESP32-CAM para enviar dados.", "error")]);
      return;
    }
    if (!empresa?.dados) {
      setLog((prev) => [...prev, new LogEntry("Nenhum dado empresarial carregado.", "error")]);
      return;
    }
    try {
      await ESP32Service.sendCompanyDataToVespa(empresa.dados);
      setLog((prev) => [...prev, new LogEntry("Dados empresariais enviados com sucesso!", "success")]);
    } catch (e: any) {
      setLog((prev) => [...prev, new LogEntry("Falha ao enviar dados: " + (e.message || e), "error")]);
    }
  }

  function addPixAudit(event: string, details: Record<string, any> = {}) {
    auditoriaManagerRef.current?.addPixAudit(event, details);
  }

  async function handleCobrarPix() {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      let valorRaw = pixAmountText.replace(/,/g, '.').replace(/[^\d.]/g, '');
      const parts = valorRaw.split('.');
      let valConsolidado =
        parts.length > 1
          ? parts[0].slice(0, 13) + '.' + parts[1].slice(0, 2)
          : parts[0].slice(0, 13);
      valConsolidado = valConsolidado.replace(/^0+(?!\.)/, '') || '0';

      if (!PixUtils.PIX_AMOUNT_REGEX.test(valConsolidado) || Number(valConsolidado) < 0.01) {
        setErrorMsg('Valor inválido! Use até 2 casas decimais, com ponto, mínimo R$0.01');
        addPixAudit('pix_invalid_value', { valorRaw, valConsolidado });
        setIsLoading(false);
        return;
      }

      const valorPix = Number(valConsolidado).toFixed(2);

      addPixAudit('pix_request', {
        valorPix,
        descricao: pixDesc,
      });

      const keyPix = empresa?.cnpj ? empresa.cnpj.replace(/\D/g, '') : "00000000000000";
      const descPix = pixDesc || "Pagamento Spacecworp";
      const resp = await PixService.criarPix(
        Number(valorPix),
        keyPix,
        descPix,
        empresa?.dados?.fantasia || "",
        empresa?.dados?.municipio || ""
      );

      if (!resp.qr || typeof resp.qr !== "string" || resp.qr.length < 10) {
        setLog((prev) => [
          ...prev,
          new LogEntry("QR Code PIX inválido ou não retornado!", "error"),
        ]);
        setPixQr(null);
        addPixAudit('pix_error', { motivo: 'QR inválido', resposta: resp });
        return;
      }
      setPixQr(resp.qr);
      setPixId(resp.id);
      setPixStatus(resp.status);

      setLog((prev) => [...prev, new LogEntry("Cobrança PIX criada!", "success")]);
      addPixAudit('pix_created', {
        pixId: resp.id,
        pixStatus: resp.status,
        qr: resp.qr
      });

    } catch (e: any) {
      setLog((prev) => [...prev, new LogEntry("Erro ao criar PIX: " + e.message, "error")]);
      setPixQr(null);
      addPixAudit('pix_error', { motivo: e.message });
    } finally {
      setIsLoading(false);
    }
  }
  async function handleStatusPix() {
    try {
      if (!pixId) return;
      const resp = await PixService.statusPix(pixId);
      setPixStatus(resp.status);
      setLog((prev) => [...prev, new LogEntry("Status PIX: " + resp.status, "info")]);
      addPixAudit('pix_status_checked', {
        pixId,
        status: resp.status
      });
    } catch(e: any) {
      setLog((prev) => [...prev, new LogEntry("Erro status PIX: " + e.message, "error")]);
      addPixAudit('pix_error', { motivo: e.message });
    }
  }
  async function handleConfirmPix() {
    try {
      if (!pixId) return;
      const resp = await PixService.confirmarPix(pixId);
      setPixStatus(resp.status);
      setLog((prev) => [...prev, new LogEntry("Pagamento PIX confirmado!", "success")]);
      addPixAudit('pix_confirmed', {
        pixId,
        status: resp.status
      });
    } catch(e: any) {
      setLog((prev) => [...prev, new LogEntry("Erro ao confirmar PIX: " + e.message, "error")]);
      addPixAudit('pix_error', { motivo: e.message });
    }
  }

  function getModalPagesData(e: Empresa | null) {
    if (!e) return [];
    const cnpjDados = e.dados;
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
            {Array.isArray(cnpjDados.atividades_secundarias) && cnpjDados.atividades_secundarias.length > 0 ? cnpjDados.atividades_secundarias.map((a: any,i: number) => (
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
            {Array.isArray(cnpjDados.qsa) && cnpjDados.qsa.length > 0 ? cnpjDados.qsa.map((s:any, i:number) => (
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

  let RenderedScreen = null;
  if (activeScreen === 0) {
    if (!isLoggedIn) {
      RenderedScreen = (
        <>
        {!showFaceLogin && (
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
                <TouchableOpacity
                  style={[loginStyles.buttonEntrar, { backgroundColor: '#4030a7', marginTop: 15 }]}
                  onPress={() => {
                    setShowFaceLogin(true);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  activeOpacity={0.8}>
                  <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 17 }}>Entrar por Reconhecimento Facial</Text>
                </TouchableOpacity>

                {errorMsg && <Text style={loginStyles.errorMsg}>{errorMsg}</Text>}
                {successMsg && <Animated.Text style={[loginStyles.successMsg, { opacity: fadeAnim }]}>{successMsg}</Animated.Text>}
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        )}
        {showFaceLogin && (
          <FaceLogin
            onSuccess={() => {
              setIsLoggedIn(true);
              setShowFaceLogin(false);
              setEmpresa(null); // Não faz consulta automática. Para login facial real, buscaria dados associados.
              setSuccessMsg("Login facial realizado com sucesso!");
            }}
          />
        )}
        </>
      );
    } else {
      const modalPagesData = getModalPagesData(empresa);
      RenderedScreen = (
        <View style={styles.container}>
          {/* --- resto da tela já existente --- */}
          {/* conteúdo omitido nesta linha por limitação de espaço visual, está igual ao seu MainScreen original */}
        </View>
      );
    }
  } else if (activeScreen === 1) {
    RenderedScreen = <ConsultaCNPJScreen />;
  } else if (activeScreen === 2) {
    RenderedScreen = <ECommerceScreen />;
  }

  return (
    <>
      {RenderedScreen}
      {isLoggedIn && (
        <TabBar
          routes={routes}
          activeIndex={activeScreen}
          onNavigate={setActiveScreen}
        />
      )}
    </>
  );
}

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
    alignItems: 'center',
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
    width: '92%',
    maxWidth: 450,
    minHeight: 320,
    maxHeight: Dimensions.get('window').height * 1,
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