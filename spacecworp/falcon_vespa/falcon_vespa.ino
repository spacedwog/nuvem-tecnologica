/*******************************************************************************
 * ESP32-CAM (Vespa) + LEDs (Motores simulados) + Ultrassônico + Sensor de Som + WiFi STA/AP + HTTP Server
 * Adaptado para controle de LEDs como motores
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

// ===================== LEDs como Motores ========================
// MOTOR B: D4 e D27
// MOTOR A: D13 e D14

#define MOTORB_A_PIN 4    // D4
#define MOTORB_B_PIN 27   // D27
#define MOTORA_A_PIN 13   // D13
#define MOTORA_B_PIN 14   // D14

void motores_stop() {
  digitalWrite(MOTORA_A_PIN, LOW);
  digitalWrite(MOTORA_B_PIN, LOW);
  digitalWrite(MOTORB_A_PIN, LOW);
  digitalWrite(MOTORB_B_PIN, LOW);
}

void motores_forward() {
  digitalWrite(MOTORA_A_PIN, LOW);
  digitalWrite(MOTORA_B_PIN, HIGH);
  digitalWrite(MOTORB_A_PIN, HIGH);
  digitalWrite(MOTORB_B_PIN, LOW);
}

void motores_backward() {
  digitalWrite(MOTORA_A_PIN, HIGH);
  digitalWrite(MOTORA_B_PIN, LOW);
  digitalWrite(MOTORB_A_PIN, LOW);
  digitalWrite(MOTORB_B_PIN, HIGH);
}

void motores_left() {
  digitalWrite(MOTORA_A_PIN, LOW);
  digitalWrite(MOTORA_B_PIN, LOW);    // Motor A parado
  digitalWrite(MOTORB_A_PIN, HIGH);   // Motor B frente máximo
  digitalWrite(MOTORB_B_PIN, LOW);
}

void motores_right() {
  digitalWrite(MOTORA_A_PIN, LOW);
  digitalWrite(MOTORA_B_PIN, HIGH);   // Motor A frente máximo
  digitalWrite(MOTORB_A_PIN, LOW);
  digitalWrite(MOTORB_B_PIN, LOW); 
}

// ==================== ULTRASSONICO =============================

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

// ==================== SENSOR DE SOM ============================

#define SOUND_SENSOR_PIN 23  // Pino do sensor de som digital

// ==================== HTTP SERVER ==============================

WebServer server(80);

void handleRoot() {
  long dist = readUltrasonic();
  int soundStatus = digitalRead(SOUND_SENSOR_PIN);
  String json = "{";
  json += "\"status\":\"online\",";
  json += "\"distancia\":" + String(dist) + ",";
  json += "\"som\":" + String(soundStatus) + ",";
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

  if (cmd == "stop") motores_stop();
  else if (cmd == "forward") motores_forward();
  else if (cmd == "back") motores_backward();
  else if (cmd == "left") motores_left();
  else if (cmd == "right") motores_right();
  else {
    server.send(400, "text/plain", "Comando invalido");
    return;
  }

  server.send(200, "text/plain", "OK: " + cmd);
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

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  pinMode(MOTORA_A_PIN, OUTPUT);
  pinMode(MOTORA_B_PIN, OUTPUT);
  pinMode(MOTORB_A_PIN, OUTPUT);
  pinMode(MOTORB_B_PIN, OUTPUT);

  pinMode(SOUND_SENSOR_PIN, INPUT);

  motores_stop();

  connectWiFi();

  server.on("/", handleRoot);
  server.on("/cmd", handleControl);

  server.begin();
  Serial.println("Servidor HTTP iniciado!");
}

// ==================== LOOP =====================================

void loop() {
  server.handleClient();

  // Segurança: para o robô se um objeto estiver muito perto
  long dist = readUltrasonic();
  if (dist > 0 && dist < 15) {
    motores_stop();
    Serial.println("⚠️ Obstáculo detectado! Robô parado.");
  }

  // Sensor de som: para ao detectar som
  if (digitalRead(SOUND_SENSOR_PIN) == HIGH) {
    Serial.println("🔊 Som detectado!");
    motores_stop(); // Altere para outra ação se desejar
    delay(1000); // aguarda 1s para evitar múltiplos disparos
  }

  delay(50);
}
