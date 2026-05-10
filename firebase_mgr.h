#pragma once

// ════════════════════════════════════════════════════════════════
//  firebase_mgr.h — WiFi + Firebase connection
//
//  KEY DESIGN:
//  - Fetches directions ONCE at startup into local array
//  - Robot then works fully offline — no Firebase needed
//  - Status updates are fire-and-forget (non-blocking)
//  - Heartbeat is non-blocking
// ════════════════════════════════════════════════════════════════

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include "config.h"

// ── Firebase objects ──────────────────────────────────────────────
FirebaseData fbdo;
FirebaseData fbdoStatus;   // separate FirebaseData for status writes
FirebaseAuth auth;
FirebaseConfig fbConfig;
bool signupOK = false;

// ── Timers ────────────────────────────────────────────────────────
unsigned long lastHeartbeat = 0;
unsigned long lastPoll      = 0;

// ── Direction buffer — filled ONCE from Firebase ──────────────────
#define MAX_DIRECTIONS 20
char directions[MAX_DIRECTIONS];
int  totalSteps   = 0;
int  commandIndex = 0;

// ── Visitor & destination info ────────────────────────────────────
String visitorName   = "";
String fromNodeName  = "";
String toNodeName    = "";

// ── Pending status update (fire and forget) ───────────────────────
String pendingStatus    = "";
bool   hasPendingStatus = false;

// ════════════════════════════════════════════════════════════════
//  SETUP — blocks until WiFi + Firebase ready
//  Called once in setup() — robot does not move yet
// ════════════════════════════════════════════════════════════════

void firebaseSetup() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi connecting");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    Serial.print(".");
    delay(500);
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi FAILED — running offline mode");
    return;
  }
  Serial.println("\nWiFi OK: " + WiFi.localIP().toString());

  fbConfig.api_key      = API_KEY;
  fbConfig.database_url = DATABASE_URL;

  if (Firebase.signUp(&fbConfig, &auth, "", "")) {
    signupOK = true;
    Serial.println("Firebase auth OK");
  } else {
    Serial.println("Firebase auth failed: " + String(fbConfig.signer.signupError.message.c_str()));
  }

  fbConfig.token_status_callback = tokenStatusCallback;
  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectWiFi(true);
}

// ════════════════════════════════════════════════════════════════
//  PARSE DIRECTIONS
//  "Forward,Left,Stop" → directions[] = {'S','L','X'}
// ════════════════════════════════════════════════════════════════

int parseDirections(String raw) {
  int count    = 0;
  int startIdx = 0;

  Serial.println("Parsing: " + raw);

  while (startIdx < (int)raw.length() && count < MAX_DIRECTIONS) {
    int commaIdx = raw.indexOf(',', startIdx);
    String token;

    if (commaIdx == -1) {
      token    = raw.substring(startIdx);
      startIdx = raw.length();
    } else {
      token    = raw.substring(startIdx, commaIdx);
      startIdx = commaIdx + 1;
    }
    token.trim();

    if      (token == "Forward") directions[count] = 'S';
    else if (token == "Left")    directions[count] = 'L';
    else if (token == "Right")   directions[count] = 'R';
    else if (token == "Stop")    directions[count] = 'X';
    else                         directions[count] = 'S';

    Serial.println("  [" + String(count) + "] " + token + " → " + directions[count]);
    count++;
  }
  return count;
}

// ════════════════════════════════════════════════════════════════
//  FETCH COMMAND — called ONCE when status == "pending"
//  Reads ALL data from Firebase into local variables
//  After this robot works completely offline
// ════════════════════════════════════════════════════════════════

bool fetchCommand() {
  if (!Firebase.ready() || !signupOK) return false;

  // Read directions
  if (!Firebase.RTDB.getString(&fbdo, "navigation_command/directions")) {
    Serial.println("Failed to read directions: " + fbdo.errorReason());
    return false;
  }
  String rawDirections = fbdo.stringData();

  // Read visitor name
  if (Firebase.RTDB.getString(&fbdo, "navigation_command/visitor")) {
    visitorName = fbdo.stringData();
  }

  // Read from node name
  if (Firebase.RTDB.getString(&fbdo, "navigation_command/from")) {
    fromNodeName = fbdo.stringData();
  }

  // Read to node name
  if (Firebase.RTDB.getString(&fbdo, "navigation_command/to")) {
    toNodeName = fbdo.stringData();
  }

  // Parse directions into local array — robot now independent of Firebase
  totalSteps   = parseDirections(rawDirections);
  commandIndex = 0;

  if (totalSteps == 0) {
    Serial.println("No valid directions — ignoring command");
    return false;
  }

  Serial.println("Fetched " + String(totalSteps) + " steps for " + visitorName);
  Serial.println("Route: " + fromNodeName + " → " + toNodeName);
  return true;
}

// ════════════════════════════════════════════════════════════════
//  FIRE AND FORGET STATUS UPDATE
//  Queues a status string — written in background during IDLE moments
//  Robot movement is NEVER blocked by this
// ════════════════════════════════════════════════════════════════

void queueStatus(String status) {
  pendingStatus    = status;
  hasPendingStatus = true;
  Serial.println("Status queued: " + status);
}

// Call this every loop — writes queued status without blocking movement
void flushStatus() {
  if (!hasPendingStatus)           return;
  if (!Firebase.ready() || !signupOK) { hasPendingStatus = false; return; }

  // Use separate fbdoStatus so robot fbdo is not touched
  Firebase.RTDB.setString(&fbdoStatus, "navigation_command/status", pendingStatus);
  // No waiting — fire and forget
  hasPendingStatus = false;
  Serial.println("Status flushed: " + pendingStatus);
}

// ════════════════════════════════════════════════════════════════
//  HEARTBEAT — non-blocking
// ════════════════════════════════════════════════════════════════

void sendHeartbeat() {
  if (!Firebase.ready() || !signupOK) return;
  if (millis() - lastHeartbeat < HEARTBEAT_MS) return;
  lastHeartbeat = millis();
  Firebase.RTDB.setInt(&fbdoStatus, "esp32/lastHeartbeat", (int)millis());
}

//  POLL FIREBASE — non-blocking, checks every POLL_MS
//  Only active during STATE_IDLE
//  Returns true if new valid command was fetched

bool pollFirebase() {
  if (!Firebase.ready() || !signupOK) return false;
  if (millis() - lastPoll < POLL_MS) return false;
  lastPoll = millis();

  if (!Firebase.RTDB.getString(&fbdo, "navigation_command/status")) return false;
  if (fbdo.stringData() != "pending") return false;

  Serial.println("Pending command found — fetching...");
  return fetchCommand();
}
