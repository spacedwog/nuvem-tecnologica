/*******************************************************************************
 * ESP32-CAM (Vespa)
 ******************************************************************************/

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===================== CONFIG WiFi ==============================
const char* WIFI_SSID     = "FAMILIA SANTOS";
const char* WIFI_PASSWORD = "6z2h1j3k9f";
const char* AP_SSID = "Vespa-AP";
const char* AP_PASSWORD = "falcon_vespa";

// ========== Notificação configurável =============
const char* WEBHOOK_URL = "http://exemplo.com/webhook";
bool ENABLE_WEBHOOK = false;

// ==================== HTTP SERVER ==============================
WebServer server(80);

// ====== ML SIMPLIFICADO - Classificador Threshold ===============
String runSimpleML(int sensorValue, int threshold) {
  if (sensorValue > threshold)
    return "Alta atividade detectada!";
  else
    return "Baixa atividade detectada!";
}

// ========== Estrutura para notificação ===========
struct Pin33Notify {
  int lastValue = -1;
  unsigned long lastTime = 0;
  String lastMessage = "";
} pin33Notify;

// ========== Função para retornar SSID, IP, MAC, Status hardware ==========
String getWiFiMode() {
  return String(WiFi.getMode() == WIFI_STA ? "STA" : "AP");
}

String getSSID() {
  if (WiFi.getMode() == WIFI_STA) return WiFi.SSID();
  else return AP_SSID;
}

String getIP() {
  if (WiFi.getMode() == WIFI_STA) return WiFi.localIP().toString();
  else return WiFi.softAPIP().toString();
}

String getMAC() {
  if (WiFi.getMode() == WIFI_STA) return WiFi.BSSIDstr();
  else return WiFi.softAPmacAddress();
}

String getStatusHW() {
  // Adapte conforme sensores/hardware reais
  return "OK"; // Para exemplo, sempre OK
}

// Handler root
void handleRoot() {
  String json = "{";
  json += "\"status\":\"online\",";
  json += "\"wifi_mode\":\"" + getWiFiMode() + "\",";
  json += "\"ssid\":\"" + getSSID() + "\",";
  json += "\"ip\":\"" + getIP() + "\",";
  json += "\"mac\":\"" + getMAC() + "\",";
  json += "\"status_hw\":\"" + getStatusHW() + "\"";
  json += "}";
  server.send(200, "application/json", json);
}

void handleControl() {
  if (!server.hasArg("cmd")) {
    server.send(400, "text/plain", "Erro: use /cmd?cmd=sua_mensagem_aqui");
    return;
  }

  String cmd = server.arg("cmd");
  Serial.print("Mensagem recebida via /cmd: ");
  Serial.println(cmd);

  if(cmd == "voxia"){
    int sensorValue = analogRead(32);
    int threshold = analogRead(33);

    String respostaML = runSimpleML(sensorValue, threshold);
    String resposta = "Voxia ON!\nSensor=" + String(sensorValue) + ". Resultado ML: " + respostaML;
    server.send(200, "text/plain", resposta);
    Serial.println(resposta);
    return;
  }
  server.send(200, "text/plain", "Mensagem recebida: " + cmd);
}

// ===== NOTIFICAÇÃO: endpoint /notify para o app =====
void handleNotify() {
  StaticJsonDocument<256> doc;
  doc["pin"] = 33;
  doc["value"] = pin33Notify.lastValue;
  doc["time"] = pin33Notify.lastTime;
  doc["msg"] = pin33Notify.lastMessage;
  doc["type"] = "notify";
  String out;
  serializeJson(doc, out);
  // Como array para expandir facilmente
  server.send(200, "application/json", "[" + out + "]");
}

// ========== ALGORITMO DE VALIDAÇÃO DE CNPJ ==========
bool validarCNPJ(String cnpj) {
  // Remove pontuação
  String digits = "";
  for (int i = 0; i < cnpj.length(); i++) {
    char c = cnpj.charAt(i);
    if (c >= '0' && c <= '9') digits += c;
  }
  if (digits.length() != 14) return false;

  int mult1[12] = {5,4,3,2,9,8,7,6,5,4,3,2};
  int mult2[13] = {6,5,4,3,2,9,8,7,6,5,4,3,2};
  int soma = 0, resto;

  // Cálculo do primeiro dígito verificador
  for (int i = 0; i < 12; i++)
    soma += (digits.charAt(i) - '0') * mult1[i];
  resto = soma % 11;
  int dv1 = resto < 2 ? 0 : 11 - resto;

  // Cálculo do segundo dígito verificador
  soma = 0;
  for (int i = 0; i < 12; i++)
    soma += (digits.charAt(i) - '0') * mult2[i];
  soma += dv1 * mult2[12];
  resto = soma % 11;
  int dv2 = resto < 2 ? 0 : 11 - resto;

  // Verifica dígitos
  if ((digits.charAt(12) - '0') == dv1 && (digits.charAt(13) - '0') == dv2)
    return true;
  else
    return false;
}

// ========== ENDPOINT /api/login-cnpj ==========
void handleLoginCNPJ() {
  if (server.method() != HTTP_POST || !server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"JSON obrigatório\"}");
    return;
  }
  String body = server.arg("plain");
  StaticJsonDocument<128> doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    server.send(400, "application/json", "{\"error\":\"JSON malformado\"}");
    return;
  }
  // Extrai o CNPJ enviado
  const char* cnpj = doc["cnpj"];
  if (!cnpj) {
    server.send(400, "application/json", "{\"error\":\"CNPJ não encontrado\"}");
    return;
  }
  // Valida CNPJ com algoritmo
  bool autorizado = validarCNPJ(String(cnpj));
  StaticJsonDocument<64> resp;
  resp["autorizado"] = autorizado;
  if (!autorizado) resp["error"] = "CNPJ inválido";
  String out;
  serializeJson(resp, out);
  server.send(200, "application/json", out);
}

// ============ ENDPOINT /empresa ============
// Recebe JSON do app com os dados empresariais consultados
void handleEmpresa() {
  if (server.method() != HTTP_POST || !server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"JSON obrigatório\"}");
    return;
  }
  String body = server.arg("plain");
  StaticJsonDocument<2048> doc; // Tamanho ajustável conforme dados enviados
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    server.send(400, "application/json", "{\"error\":\"JSON malformado\"}");
    return;
  }

  // Exemplos de campos esperados:
  const char* razao = doc["nome"];
  const char* fantasia = doc["fantasia"];
  const char* cnpj = doc["cnpj"];
  const char* situacao = doc["situacao"];
  // ... adicione todos os outros campos relevantes conforme seu app

  Serial.println("=== Dados empresariais recebidos ===");
  Serial.print("Razão social: "); Serial.println(razao);
  Serial.print("Nome fantasia: "); Serial.println(fantasia);
  Serial.print("CNPJ: "); Serial.println(cnpj);
  Serial.print("Situação: "); Serial.println(situacao);
  // Imprima outros campos se quiser

  // Você pode salvar, processar ou armazenar os dados aqui!

  server.send(200, "application/json", "{\"ok\":true,\"msg\":\"Dados empresariais recebidos com sucesso\"}");
}

// Notificação alteração pino 33 ======================
void sendNotification(int newValue) {
  String mensagem = "Mudança detectada no Potenciometro: novo valor = " + String(newValue);
  Serial.println(mensagem);
  pin33Notify.lastValue = newValue;
  pin33Notify.lastTime = millis();
  pin33Notify.lastMessage = mensagem;
  if (ENABLE_WEBHOOK && WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(WEBHOOK_URL);
    http.addHeader("Content-Type", "application/json");
    String payload = "{\"pin\":33,\"value\":" + String(newValue) + "}";
    http.POST(payload);
    http.end();
  }
}

// ==================== WiFi Logic ===============================
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("Conectando ao WiFi...");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConectado no modo STA!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFalha! Iniciando modo Soft-AP...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASSWORD);
    Serial.println("Soft-AP iniciado.");
    Serial.print("IP AP: ");
    Serial.println(WiFi.softAPIP());
  }
}

// ==================== SETUP ====================================
void setup() {
  Serial.begin(115200);
  connectWiFi();
  server.on("/", handleRoot);
  server.on("/cmd", handleControl);
  server.on("/notify", handleNotify);
  server.on("/api/login-cnpj", HTTP_POST, handleLoginCNPJ);
  server.on("/empresa", HTTP_POST, handleEmpresa);  // <- Novo endpoint para dados empresariais
  server.begin();
  Serial.println("Servidor HTTP iniciado!");
  pin33Notify.lastValue = analogRead(33);
  pin33Notify.lastMessage = "Inicializado: Potenciometro = " + String(pin33Notify.lastValue);
  pin33Notify.lastTime = millis();
}

// ==================== LOOP =====================================
void loop() {
  server.handleClient();
  int currentValue33 = analogRead(33);
  if (currentValue33 != pin33Notify.lastValue) {
    sendNotification(currentValue33);
  }
  delay(50);
}
