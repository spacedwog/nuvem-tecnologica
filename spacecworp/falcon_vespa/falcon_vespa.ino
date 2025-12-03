/*******************************************************************************
 * ESP32-CAM (Vespa) + WiFi STA/AP + HTTP Server + API /api/login-cnpj
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

// ========= CNPJ Autorizado para login da empresa ===========
const char* CNPJ_AUTORIZADO = "62.904.267/0001-60";

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
  // Compara com o CNPJ autorizado
  bool autorizado = (String(cnpj) == String(CNPJ_AUTORIZADO));
  StaticJsonDocument<64> resp;
  resp["autorizado"] = autorizado;
  if (!autorizado) resp["error"] = "CNPJ não autorizado";
  String out;
  serializeJson(resp, out);
  server.send(200, "application/json", out);
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
