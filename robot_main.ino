// ════════════════════════════════════════════════════════════════
//  robot_main.ino — Path Guiding Robot
//
//  KEY FIX: During STATE_NAVIGATING, PID runs in its own tight
//  inner loop with ZERO interruptions from Firebase/OLED/heartbeat.
//  Those only run during STATE_IDLE and STATE_ARRIVED.
// ════════════════════════════════════════════════════════════════

#include "config.h"
#include "oled_display.h"
#include "pid_follow.h"
#include "firebase_mgr.h"
#include "navigation.h"

RobotState robotState = STATE_IDLE;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Path Guiding Robot ===");

  pinMode(IR1, INPUT); pinMode(IR2, INPUT); pinMode(IR3, INPUT);
  pinMode(IR4, INPUT); pinMode(IR5, INPUT);
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(NODE_LED, OUTPUT);
  digitalWrite(NODE_LED, LOW);

  ledcAttach(ENA, 1000, 8);
  ledcAttach(ENB, 1000, 8);

  oledInit();
  oledWifiConnecting();
  firebaseSetup();

  if (WiFi.status() == WL_CONNECTED) {
    oledWifiConnected(WiFi.localIP().toString());
    delay(1000);
    oledFirebaseConnected();
  } else {
    oledError("WiFi Failed");
  }

  Serial.println("Setup complete — waiting for command");
}

// ════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ════════════════════════════════════════════════════════════════

void loop() {

  // ── IDLE — Firebase polling runs here, robot not moving ───────
  if (robotState == STATE_IDLE) {
    flushStatus();
    sendHeartbeat();
    oledIdle();

    if (pollFirebase()) {
      oledVisitor(visitorName, fromNodeName, toNodeName);
      delay(VISITOR_DISPLAY_MS);
      queueStatus("running");
      flushStatus();   // write status NOW while still idle

      clearStartNode();
      robotState = STATE_NAVIGATING;
      Serial.println("Navigation started");
    }
    return;
  }

  // ── ARRIVED — blink LED, flush status, wait for reset ─────────
  if (robotState == STATE_ARRIVED) {
    stopMotors();
    digitalWrite(NODE_LED, HIGH);
    Serial.println("Arrived — waiting for reset");
    while (true) {
      flushStatus();       // keep flushing until status written
      sendHeartbeat();
      digitalWrite(NODE_LED, HIGH); delay(500);
      digitalWrite(NODE_LED, LOW);  delay(500);
    }
    return;
  }

  // ── NAVIGATING — tight PID loop, NO Firebase/OLED interruptions
  // flushStatus and sendHeartbeat are intentionally NOT called here
  // They run again once robot reaches destination (STATE_ARRIVED)
  // ─────────────────────────────────────────────────────────────
  if (robotState == STATE_NAVIGATING) {

    readSensors();

    // Node detected → execute next direction
    if (isNode()) {
      bool arrived = handleNode();   // Firebase status queued inside handleNode
      if (arrived) {
        robotState = STATE_ARRIVED;
      }
      return;
    }

    // Line lost → spin recovery
    if (!onLine()) {
      spinSearch();
      return;
    }

    // Normal line — PID (identical to standalone working code)
    pidFollow();
  }
}
