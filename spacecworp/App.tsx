// Adicione estes imports ao topo do arquivo
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

import { Empresa } from './src/domain/Empresa';
import { LogEntry } from './src/domain/LogEntry';
import { StatusESP } from './src/domain/StatusESP';
import { ConsultaCNPJService } from './src/services/ConsultaCNPJService';
import { ESP32Service } from './src/services/ESP32Service';

// Endpoint da API PIX
const PIX_API = "https://nuvem-tecnologica.vercel.app/api/pix";

// Função para aplicar máscara ao valor Pix durante a digitação
function formatPixValue(input) {
  let val = input.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const parts = val.split('.');
  let intPart = parts[0].replace(/^0+/, '');
  if (intPart === '') intPart = '0';
  let decPart = parts[1] || '';
  intPart = intPart.slice(0, 13);
  decPart = decPart.slice(0, 2);
  let formatted = intPart;
  if (val.includes('.') || decPart) {
    formatted += '.' + decPart;
  }
  // Se acabar com ponto, corrige para .00
  if ((val.endsWith('.') || decPart.length < 2) && formatted.match(/^\d+\.$/)) {
    formatted += '00'.slice(0, 2 - decPart.length);
  }
  return formatted;
}

// Funções para chamar API PIX (agora envia nome_fantasia e cidade)
async function criarPix(
  amount,
  key,
  description,
  nome_fantasia,
  cidade
) {
  const keySemMascara = key.replace(/\D/g, '');
  const res = await fetch(PIX_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "initiate",
      amount,
      key: keySemMascara,
      description,
      nome_fantasia,
      cidade,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function statusPix(id) {
  const res = await fetch(`${PIX_API}?action=status&id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function confirmarPix(id) {
  const res = await fetch(PIX_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "confirm", id }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const PIX_AMOUNT_REGEX = /^\d{1,13}(\.\d{1,2})?$/;

// App Component
export default function App() {
  // Estados principais
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cnpj, setCnpj] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [empresa, setEmpresa] = useState(null);

  const [modalPage, setModalPage] = useState(0);
  const [modalCnpjVisible, setModalCnpjVisible] = useState(false);
  const [modalLogVisible, setModalLogVisible] = useState(false);

  const [log, setLog] = useState([]);
  const [status, setStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [textToSend, setTextToSend] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Estados PIX
  const [pixQr, setPixQr] = useState(null);
  const [pixId, setPixId] = useState(null);
  const [pixStatus, setPixStatus] = useState(null);
  // Campo de valor Pix agora tem máscara
  const [pixAmountText, setPixAmountText] = useState('');
  const [pixDesc, setPixDesc] = useState("");

  const notificationsPolling = useRef(null);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Splash
  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoAnim, { toValue: 1, duration: 950, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60, delay: 500 }),
    ]).start();
  }, []);

  // Login
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

  function handleChangeCNPJ(text) {
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
    } catch (e) {
      setErrorMsg('CNPJ não encontrado ou inválido! ' + e.message);
      setEmpresa(null);
      setIsLoading(false);
    }
  }

  // Modal Controle
  function openModalPage(page = 0) {
    setModalPage(page);
    setModalCnpjVisible(true);
  }
  function nextModalPage() { setModalPage((p) => Math.min(p+1, MODAL_PAGES.length-1)); }
  function prevModalPage() { setModalPage((p) => Math.max(p-1, 0)); }
  function closeModalPage() { setModalCnpjVisible(false); setModalPage(0); }
  function openModalLog() { setModalLogVisible(true); }
  function closeModalLog() { setModalLogVisible(false); }

  // Notificações (Polling)
  useEffect(() => {
    async function pollNotifications() {
      if (!isConnected) return;
      const notifs = await ESP32Service.fetchNotifications();
      setLog(prev => {
        const allTimes = new Set(prev.map(l => l.time + l.msg));
        const news = notifs.filter((n) => !allTimes.has(n.time + n.msg));
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

  // Funções VESPA
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
    } catch (e) {
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
    } catch (e) {
      setIsConnected(false);
      setLog((prev) => [...prev, new LogEntry(e.message, "error")]);
    }
  }

  async function handleSendData(cmd) {
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
    } catch (e) {
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
    } catch (e) {
      setLog((prev) => [...prev, new LogEntry("Falha ao enviar dados: " + (e.message || e), "error")]);
    }
  }

  // PIX: Funções
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

      if (!PIX_AMOUNT_REGEX.test(valConsolidado) || Number(valConsolidado) <= 0) {
        setErrorMsg('Valor inválido! Use até 2 casas decimais, com ponto, mínimo R$0.01');
        setIsLoading(false);
        return;
      }

      const valorPix = Number(valConsolidado).toFixed(2);

      const keyPix = empresa?.cnpj ? empresa.cnpj.replace(/\D/g, '') : "00000000000000";
      const descPix = pixDesc || "Pagamento Spacecworp";
      const resp = await criarPix(
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
        return;
      }
      setPixQr(resp.qr);
      setPixId(resp.id);
      setPixStatus(resp.status);
      setLog((prev) => [...prev, new LogEntry("Cobrança PIX criada!", "success")]);
    } catch (e) {
      setLog((prev) => [...prev, new LogEntry("Erro ao criar PIX: " + e.message, "error")]);
      setPixQr(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusPix() {
    try {
      if (!pixId) return;
      const resp = await statusPix(pixId);
      setPixStatus(resp.status);
      setLog((prev) => [...prev, new LogEntry("Status PIX: " + resp.status, "info")]);
    } catch(e) {
      setLog((prev) => [...prev, new LogEntry("Erro status PIX: " + e.message, "error")]);
    }
  }

  async function handleConfirmPix() {
    try {
      if (!pixId) return;
      const resp = await confirmarPix(pixId);
      setPixStatus(resp.status);
      setLog((prev) => [...prev, new LogEntry("Pagamento PIX confirmado!", "success")]);
    } catch(e) {
      setLog((prev) => [...prev, new LogEntry("Erro ao confirmar PIX: " + e.message, "error")]);
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
  function getModalPagesData(e) {
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
            {Array.isArray(cnpjDados.atividades_secundarias) && cnpjDados.atividades_secundarias.length > 0 ? cnpjDados.atividades_secundarias.map((a,i) => (
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
            {Array.isArray(cnpjDados.qsa) && cnpjDados.qsa.length > 0 ? cnpjDados.qsa.map((s,i) => (
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

  // Telas e modais
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

  const modalPagesData = getModalPagesData(empresa);

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
          <Button title="Exibir log" onPress={openModalLog} />
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
        <Text style={{ color: "#aaa", marginTop: 10 }}>Empresa logada: {empresa?.dados?.fantasia || empresa?.cnpj}</Text>
        {empresa?.dados && (
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

        {empresa?.dados && isConnected && (
          <TouchableOpacity
            style={{
              marginTop: 14,
              backgroundColor: "#3182ce",
              paddingHorizontal: 28,
              paddingVertical: 12,
              alignSelf: "center",
              borderRadius: 8,
            }}
            onPress={handleSendCompanyToVespa}
            activeOpacity={0.8}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 17 }}>
              Enviar dados empresariais para a VESPA
            </Text>
          </TouchableOpacity>
        )}

        {/* Formulário PIX com máscara dinâmica */}
        <View style={{ marginTop: 18, alignSelf: "stretch", padding: 14, backgroundColor: "#f8fafc", borderRadius: 8, borderWidth: 1, borderColor: "#d5e4f7" }}>
          <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Cobrar via PIX</Text>
          <TextInput
            style={[styles.inputText, { marginBottom: 8 }]}
            value={pixAmountText}
            onChangeText={v => setPixAmountText(formatPixValue(v))}
            onBlur={() => setPixAmountText(formatPixValue(pixAmountText))}
            placeholder="Valor (R$)"
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.inputText, { marginBottom: 8 }]}
            value={pixDesc}
            onChangeText={setPixDesc}
            placeholder="Descrição"
          />
          <TouchableOpacity
            style={[styles.sendButton, { alignSelf: "center" }]}
            onPress={handleCobrarPix}
            disabled={isLoading || Number(pixAmountText) <= 0}
          >
            <Text style={styles.sendButtonText}>{isLoading ? "Carregando..." : "Gerar QR PIX"}</Text>
          </TouchableOpacity>
          {errorMsg && <Text style={{ color: '#d60000', fontWeight: 'bold', marginTop: 7 }}>{errorMsg}</Text>}
        </View>

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
      {empresa?.dados && (
      <Modal
        visible={modalCnpjVisible}
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

      {/* Modal de LOG - só dados do VESPA */}
      <Modal
        visible={modalLogVisible}
        animationType="fade"
        transparent
        onRequestClose={closeModalLog}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Log - Informações do VESPA</Text>
            <ScrollView
              style={[styles.logContainer, { minHeight: 120 }]}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleReload}
                  colors={["#0077ff"]}
                />
              }
            >
              {status && (
                <>
                  <Text style={styles.logText}>
                    <Text style={{ fontWeight: 'bold' }}>Modo WiFi:</Text> {status.wifi_mode}
                  </Text>
                  <Text style={styles.logText}>
                    <Text style={{ fontWeight: 'bold' }}>SSID:</Text> {status.ssid || "-"}
                  </Text>
                  <Text style={styles.logText}>
                    <Text style={{ fontWeight: 'bold' }}>IP:</Text> {status.ip || "-"}
                  </Text>
                  <Text style={styles.logText}>
                    <Text style={{ fontWeight: 'bold' }}>MAC:</Text> {status.mac || "-"}
                  </Text>
                  <Text style={styles.logText}>
                    <Text style={{ fontWeight: 'bold' }}>Status hardware:</Text> {status.status_hw || "-"}
                  </Text>
                </>
              )}
              <Text style={[styles.cardTitle, { fontSize: 17, marginBottom: 7, marginTop: 18 }]}>Eventos:</Text>
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
            <TouchableOpacity style={styles.closeButton} onPress={closeModalLog}>
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal PIX */}
      <Modal
        visible={!!pixQr}
        animationType="slide"
        transparent
        onRequestClose={() => setPixQr(null)}
      >
        <View style={modalStyles.wrapper}>
          <View
            style={[
              modalStyles.modalCard,
              {
                justifyContent: 'space-between',
                minHeight: 420,
                maxHeight: Dimensions.get('window').height * 0.88,
              },
            ]}
          >
            <View>
              <Text style={modalStyles.modalTitle}>Cobrança PIX</Text>

              <Text style={{ fontWeight: "bold", marginTop: 10 }}>Chave (CNPJ):</Text>
              <Text style={{ marginBottom: 8 }}>
                {empresa?.cnpj ? empresa.cnpj.replace(/\D/g, '') : "00000000000000"}
              </Text>
              <Text style={{ fontWeight: "bold", marginTop: 10 }}>Nome Fantasia:</Text>
              <Text style={{ marginBottom: 8 }}>
                {empresa?.dados?.fantasia || "-"}
              </Text>
              <Text style={{ fontWeight: "bold", marginTop: 4 }}>Cidade:</Text>
              <Text style={{ marginBottom: 8 }}>
                {empresa?.dados?.municipio || "-"}
              </Text>
              <Text style={{ fontWeight: "bold" }}>QR Code (copia e cola):</Text>
              <ScrollView style={{ maxHeight: 60, backgroundColor: "#f4f7fb", borderRadius: 8, marginBottom: 8, padding: 6 }}>
                <Text selectable style={{ fontSize: 12 }}>{pixQr}</Text>
              </ScrollView>
              <Text style={{ fontWeight: "bold", marginTop: 14 }}>Status:</Text>
              <Text>{pixStatus}</Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-around",
                  marginVertical: 12,
                }}
              >
                <TouchableOpacity
                  style={modalStyles.modalPaginationBtn}
                  onPress={handleStatusPix}
                >
                  <Text style={modalStyles.pgBtnText}>Atualizar Status</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={modalStyles.modalPaginationBtn}
                  onPress={handleConfirmPix}
                >
                  <Text style={modalStyles.pgBtnText}>Confirmar Pagamento</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={[modalStyles.closeModalBtn, { marginTop: 8, alignSelf: 'center' }]}
              onPress={() => setPixQr(null)}
            >
              <Text style={modalStyles.closeModalText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Objetos de estilos...

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