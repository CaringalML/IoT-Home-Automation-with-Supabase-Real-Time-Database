/*
  XIAO ESP32S3 Supabase REAL-TIME with HEARTBEAT SYSTEM
  
  This upgraded version includes:
  - WebSocket for real-time updates ✅
  - Heartbeat system to maintain online status ✅
  - Automatic reconnection handling ✅
  - Robust error handling and recovery ✅
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>

// ===========================================
// CONFIGURATION
// ===========================================

// WiFi Configuration
const char* ssid = "2degrees WiFi 26AC";
const char* password = "gYHBxgPnZENS3XGR";

// Supabase Configuration
const char* supabaseHost = "ylhiygblpcwsopivkayn.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsaGl5Z2JscGN3c29waXZrYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjg2NTIsImV4cCI6MjA2NjkwNDY1Mn0.MpXVM1dUkLHXEoUv48gI5t1Putrxjdraexcjuetl6M0";

// Device Configuration
String targetDeviceId = "XIAO_LIGHT_001"; 

// Hardware pins
const int LIGHT_PIN = 3;
const int STATUS_LED = LED_BUILTIN; 
const int BOOT_BUTTON = 0;

// Timing Configuration
const unsigned long HEARTBEAT_INTERVAL = 60000;    // 60 seconds
const unsigned long RECONNECT_INTERVAL = 5000;     // 5 seconds
const unsigned long STATUS_UPDATE_INTERVAL = 30000; // 30 seconds
const unsigned long BUTTON_DEBOUNCE = 200;         // 200ms

// State variables
bool lightStatus = false;
int lastKnownStatus = -1;
unsigned long lastHeartbeat = 0;
unsigned long lastReconnectAttempt = 0;
unsigned long lastStatusUpdate = 0;
unsigned long lastButtonPress = 0;
bool websocketConnected = false;

WebSocketsClient webSocket;

// ===========================================
// SETUP FUNCTION
// ===========================================

void setup() {
  Serial.begin(115200);
  delay(2000);

  // Setup hardware
  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);
  pinMode(BOOT_BUTTON, INPUT_PULLUP);
  
  digitalWrite(LIGHT_PIN, LOW);
  digitalWrite(STATUS_LED, LOW);

  Serial.println("==========================================");
  Serial.println("🚀 SUPABASE HEARTBEAT SYSTEM v2.0");
  Serial.println("==========================================");

  connectToWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    connectToWebSocket();
    sendInitialHeartbeat();
  }
}

// ===========================================
// MAIN LOOP
// ===========================================

void loop() {
  // Handle WebSocket
  if (WiFi.status() == WL_CONNECTED) {
    webSocket.loop();
    
    // Send heartbeat periodically
    if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
      sendHeartbeat();
    }
    
    // Update device status periodically
    if (millis() - lastStatusUpdate > STATUS_UPDATE_INTERVAL) {
      updateDeviceStatusInDatabase(lightStatus);
      lastStatusUpdate = millis();
    }
    
    // Try to reconnect WebSocket if disconnected
    if (!websocketConnected && millis() - lastReconnectAttempt > RECONNECT_INTERVAL) {
      Serial.println("🔄 Attempting WebSocket reconnection...");
      connectToWebSocket();
      lastReconnectAttempt = millis();
    }
  } else {
    // WiFi disconnected, try to reconnect
    Serial.println("📶 WiFi disconnected, reconnecting...");
    connectToWiFi();
  }
  
  handleButtonPress();
  updateStatusLED();
  
  delay(100); // Small delay to prevent tight loop
}

// ===========================================
// WIFI & WEBSOCKET FUNCTIONS
// ===========================================

void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  
  Serial.print("📶 Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" ✅ Connected!");
    Serial.print("📍 IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(" ❌ Failed to connect!");
  }
}

void connectToWebSocket() {
  String wsPath = "/realtime/v1/websocket?apikey=" + String(supabaseKey) + "&vsn=1.0.0";
  
  webSocket.beginSSL(supabaseHost, 443, wsPath.c_str());
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(RECONNECT_INTERVAL);
  
  Serial.println("🔌 Connecting to WebSocket...");
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("🔌 WebSocket Disconnected!\n");
      websocketConnected = false;
      break;
      
    case WStype_CONNECTED:
      Serial.printf("✅ WebSocket Connected: %s\n", payload);
      websocketConnected = true;
      subscribeToChanges();
      // Send heartbeat immediately after connection
      sendHeartbeat();
      break;
      
    case WStype_TEXT:
      handleWebSocketMessage(payload);
      break;
      
    case WStype_ERROR:
      Serial.printf("❌ WebSocket Error: %s\n", payload);
      websocketConnected = false;
      break;
      
    case WStype_PONG:
      Serial.println("🏓 WebSocket Pong received");
      break;
  }
}

void subscribeToChanges() {
  String subscription = R"({"topic":"realtime:public:devices:device_id=eq.)" + targetDeviceId + R"(","event":"phx_join","payload":{},"ref":1})";
  webSocket.sendTXT(subscription);
  Serial.println("🔔 Subscribed to device changes");
}

void handleWebSocketMessage(uint8_t * payload) {
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, payload);
  
  if (error) {
    Serial.print("❌ JSON parsing failed: ");
    Serial.println(error.c_str());
    return;
  }

  String event = doc["event"];
  if (event == "UPDATE") {
    JsonObject record = doc["payload"]["record"];
    if (record.containsKey("status")) {
      int newStatus = record["status"];
      if (newStatus != lastKnownStatus) {
        Serial.println("📱 Remote command received!");
        setLightStatus(newStatus == 1);
        lastKnownStatus = newStatus;
      }
    }
  }
}

// ===========================================
// HEARTBEAT FUNCTIONS
// ===========================================

void sendInitialHeartbeat() {
  Serial.println("💓 Sending initial heartbeat...");
  sendHeartbeat();
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("💓 Heartbeat skipped - WiFi disconnected");
    return;
  }
  
  HTTPClient http;
  String url = "https://" + String(supabaseHost) + "/rest/v1/rpc/update_device_heartbeat";
  
  http.begin(url);
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  http.addHeader("Content-Type", "application/json");
  
  // Create heartbeat payload
  DynamicJsonDocument payload(200);
  payload["device_id_param"] = targetDeviceId;
  
  String payloadString;
  serializeJson(payload, payloadString);
  
  int httpCode = http.POST(payloadString);
  
  if (httpCode >= 200 && httpCode < 300) {
    String response = http.getString();
    Serial.print("💓 Heartbeat sent successfully");
    
    // Parse response to check success
    DynamicJsonDocument responseDoc(300);
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error && responseDoc["success"]) {
      Serial.println(" ✅");
      lastHeartbeat = millis();
    } else {
      Serial.println(" ⚠️ (Server reported failure)");
      Serial.println("Response: " + response);
    }
  } else {
    Serial.println("💓 Heartbeat failed: " + String(httpCode));
    String response = http.getString();
    Serial.println("Error response: " + response);
  }
  
  http.end();
}

// ===========================================
// DEVICE CONTROL FUNCTIONS
// ===========================================

void setLightStatus(bool status) {
  lightStatus = status;
  digitalWrite(LIGHT_PIN, status ? HIGH : LOW);
  Serial.println("💡 Light " + String(status ? "ON" : "OFF"));
  
  // Update database immediately when status changes
  updateDeviceStatusInDatabase(status);
  lastStatusUpdate = millis();
}

void toggleLight() {
  setLightStatus(!lightStatus);
}

void updateDeviceStatusInDatabase(bool newStatus) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = "https://" + String(supabaseHost) + "/rest/v1/devices?device_id=eq." + targetDeviceId;
  
  http.begin(url);
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  // Update both status and heartbeat
  DynamicJsonDocument updateDoc(200);
  updateDoc["status"] = newStatus ? 1 : 0;
  updateDoc["is_online"] = true;
  updateDoc["last_heartbeat"] = "now()";
  
  String updateString;
  serializeJson(updateDoc, updateString);
  
  int httpCode = http.PATCH(updateString);

  if (httpCode >= 200 && httpCode < 300) {
    Serial.println("✅ Device status updated in database");
  } else {
    Serial.println("❌ Failed to update device status: " + String(httpCode));
  }
  
  http.end();
}

void handleButtonPress() {
  if (digitalRead(BOOT_BUTTON) == LOW) {
    // Debounce button press
    if (millis() - lastButtonPress > BUTTON_DEBOUNCE) {
      Serial.println("🔘 Button pressed!");
      toggleLight();
      lastButtonPress = millis();
    }
  }
}

void updateStatusLED() {
  // LED patterns to indicate different states
  static unsigned long lastLedUpdate = 0;
  static bool ledState = false;
  
  if (millis() - lastLedUpdate > 500) { // Update every 500ms
    if (WiFi.status() != WL_CONNECTED) {
      // Fast blink for WiFi disconnected
      ledState = !ledState;
      digitalWrite(STATUS_LED, ledState);
    } else if (!websocketConnected) {
      // Slow blink for WebSocket disconnected
      if (millis() - lastLedUpdate > 1000) {
        ledState = !ledState;
        digitalWrite(STATUS_LED, ledState);
        lastLedUpdate = millis();
      }
    } else {
      // Solid on for fully connected
      digitalWrite(STATUS_LED, HIGH);
    }
    
    if (WiFi.status() != WL_CONNECTED || !websocketConnected) {
      lastLedUpdate = millis();
    }
  }
}

// ===========================================
// DIAGNOSTIC FUNCTIONS
// ===========================================

void printSystemStatus() {
  Serial.println("==========================================");
  Serial.println("📊 SYSTEM STATUS");
  Serial.println("==========================================");
  Serial.println("Device ID: " + targetDeviceId);
  Serial.println("WiFi Status: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
  Serial.println("IP Address: " + WiFi.localIP().toString());
  Serial.println("WebSocket: " + String(websocketConnected ? "Connected" : "Disconnected"));
  Serial.println("Light Status: " + String(lightStatus ? "ON" : "OFF"));
  Serial.println("Last Heartbeat: " + String(millis() - lastHeartbeat) + "ms ago");
  Serial.println("Free Heap: " + String(ESP.getFreeHeap()) + " bytes");
  Serial.println("Uptime: " + String(millis() / 1000) + " seconds");
  Serial.println("==========================================");
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

void restartESP32() {
  Serial.println("🔄 Restarting ESP32...");
  delay(1000);
  ESP.restart();
}

void performSelfTest() {
  Serial.println("🧪 Performing self-test...");
  
  // Test LED
  digitalWrite(STATUS_LED, HIGH);
  delay(500);
  digitalWrite(STATUS_LED, LOW);
  
  // Test light relay
  digitalWrite(LIGHT_PIN, HIGH);
  delay(500);
  digitalWrite(LIGHT_PIN, LOW);
  
  Serial.println("✅ Self-test completed");
}

// Uncomment below for serial command interface
/*
void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "status") {
      printSystemStatus();
    } else if (command == "heartbeat") {
      sendHeartbeat();
    } else if (command == "toggle") {
      toggleLight();
    } else if (command == "test") {
      performSelfTest();
    } else if (command == "restart") {
      restartESP32();
    } else if (command == "help") {
      Serial.println("Available commands: status, heartbeat, toggle, test, restart, help");
    } else {
      Serial.println("Unknown command. Type 'help' for available commands.");
    }
  }
}
*/
