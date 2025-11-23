/*******************************************************************************
 * ESP32-CAM (Vespa) + Motores + Ultrassônico + WiFi STA/AP + HTTP Server
 * Baseado no código de motores da RoboCore (Vespa)
 * Desenvolvido para Felipe Santos - 2025
 ******************************************************************************/

#include "RoboCore_Vespa.h"
#include <WiFi.h>
#include <WebServer.h>

// ==========================================================================
// ----------------------------- CONFIG WiFi --------------------------------
// ==========================================================================

const char* WIFI_SSID     = "FAMILIA SANTOS";
const char* WIFI_PASSWORD = "6z2h1j3k9f";

const char* AP_SSID = "Vespa-AP";
const char* AP_PASSWORD = "falcon_vespa";

// ==========================================================================
// ----------------------------- MOTORES ------------------------------------
// ==========================================================================

VespaMotors motors;

// ==========================================================================
// ----------------------------- ULTRASSONICO -------------------------------
// ==========================================================================

// Pinos recomendados no ESP32-CAM
#define TRIG_PIN 21
#define ECHO_PIN 22

long readUltrasonic() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(5);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 25000); // timeout 25ms
  long distance = duration * 0.034 / 2;

  if (duration == 0) return -1; // sem resposta
  return distance;
}

// ==========================================================================
// ----------------------------- HTTP SERVER --------------------------------
// ==========================================================================

WebServer server(80);

void handleRoot() {
  long dist = readUltrasonic();
  String json = "{";
  json += "\"status\":\"online\",";
  json += "\"distancia\":" + String(dist) + ",";
  json += "\"wifi_mode\":\"" + String(WiFi.getMode() == WIFI_STA ? "STA" : "AP") + "\"";
  json += "}";
  server.send(200, "application/json", json);
}

void handleControl() {
  if (!server.hasArg("cmd")) {
    server.send(400, "text/plain", "Erro: use /cmd?cmd=forward");
    return;
  }

  String cmd = server.arg("cmd");

  if (cmd == "stop") motors.stop();
  else if (cmd == "forward") motors.forward(120);
  else if (cmd == "back") motors.backward(120);
  else if (cmd == "left") motors.setSpeedLeft(-120), motors.setSpeedRight(120);
  else if (cmd == "right") motors.setSpeedLeft(120), motors.setSpeedRight(-120);
  else {
    server.send(400, "text/plain", "Comando invalido");
    return;
  }

  server.send(200, "text/plain", "OK: " + cmd);
}

// ==========================================================================
// ----------------------------- WiFi LOGIC ---------------------------------
// ==========================================================================

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

// ==========================================================================
// ----------------------------- SETUP --------------------------------------
// ==========================================================================

void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  connectWiFi();

  server.on("/", handleRoot);
  server.on("/cmd", handleControl);

  server.begin();
  Serial.println("Servidor HTTP iniciado!");
}

// ==========================================================================
// ----------------------------- LOOP ---------------------------------------
// ==========================================================================

void loop() {
  server.handleClient();
  
  // Segurança: se um objeto estiver muito perto, parar o robô automaticamente
  long dist = readUltrasonic();
  if (dist > 0 && dist < 15) {
    motors.stop();
    Serial.println("⚠️ Obstáculo detectado! Robô parado.");
  }

  delay(50);
}
