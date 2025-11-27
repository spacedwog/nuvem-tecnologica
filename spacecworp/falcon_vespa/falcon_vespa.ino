/*******************************************************************************
 * ESP32-CAM (Vespa) + WiFi STA/AP + HTTP Server - Envio de mensagens + ML
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

// ==================== HTTP SERVER ==============================

WebServer server(80);

// ====== ML SIMPLIFICADO - Classificador Threshold ===============
// Simula dado de sensor e classifica em duas categorias diferentes

String runSimpleML(int sensorValue) {
  const int threshold = 60; // valor fictício
  String resultado;

  if (sensorValue > threshold) {
    resultado = "Alta atividade detectada!";
  } else {
    resultado = "Baixa atividade detectada!";
  }
  return resultado;
}

// Handler root
void handleRoot() {
  String json = "{";
  json += "\"status\":\"online\",";
  json += "\"wifi_mode\":\"" + String(WiFi.getMode() == WIFI_STA ? "STA" : "AP") + "\"";
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

  // Executa ML quando ativado via comando
  if(cmd == "voxia"){
    // Simula leitura de sensor (substitua por real: ex. analogRead(X))
    int sensorValue = random(0, 101);

    String respostaML = runSimpleML(sensorValue);

    String resposta = "Voxia ON!\nSensor=" + String(sensorValue) + ". Resultado ML: " + respostaML;
    server.send(200, "text/plain", resposta);
    Serial.println(resposta);
    return;
  }

  // Responde OK com eco da mensagem
  server.send(200, "text/plain", "Mensagem recebida: " + cmd);
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
  server.begin();
  Serial.println("Servidor HTTP iniciado!");
}

// ==================== LOOP =====================================

void loop() {
  server.handleClient();
  delay(50);
}
