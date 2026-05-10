#pragma once

// ════════════════════════════════════════════════════════════════
//  oled_display.h — Non-blocking OLED display manager
//  Rule: OLED never delays or blocks robot movement
// ════════════════════════════════════════════════════════════════

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

bool oledReady = false;

// ── Init ──────────────────────────────────────────────────────────
void oledInit() {
  Wire.begin(I2C_SDA, I2C_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("OLED not found — continuing without display");
    oledReady = false;
    return;
  }
  oledReady = true;
  display.clearDisplay();
  display.display();
  Serial.println("OLED ready");
}

// ── Internal helper ───────────────────────────────────────────────
void oledShow(String line1, String line2 = "", String line3 = "", String line4 = "") {
  if (!oledReady) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0);  display.println(line1);
  display.setCursor(0, 18); display.println(line2);
  display.setCursor(0, 36); display.println(line3);
  display.setCursor(0, 52); display.println(line4);

  display.display();
}

// ── Public screens ────────────────────────────────────────────────

void oledWifiConnecting() {
  oledShow("Path Guiding Robot", "", "WiFi connecting...");
}

void oledWifiConnected(String ip) {
  oledShow("WiFi Connected", ip, "", "Waiting...");
}

void oledFirebaseConnected() {
  oledShow("Firebase OK", "", "Waiting for", "command...");
}

// Show visitor name briefly — called BEFORE navigation starts
// Does NOT block — just updates screen
void oledVisitor(String name, String from, String to) {
  if (!oledReady) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Visitor:");

  display.setTextSize(2);
  display.setCursor(0, 10);
  display.println(name.substring(0, 10)); // truncate if long

  display.setTextSize(2);
  display.setCursor(0, 32);
  display.println("From: " + from);
  display.setCursor(0, 50);
  display.println("To:   " + to);

  display.display();
}

// Show during navigation — node count and direction
void oledNavigating(int currentNode, int totalNodes, char cmd) {
  String dirStr = "";
  switch (cmd) {
    case 'S': dirStr = "FORWARD";  break;
    case 'L': dirStr = "TURN LEFT"; break;
    case 'R': dirStr = "TURN RIGHT"; break;
    case 'X': dirStr = "STOP";     break;
    default:  dirStr = "FORWARD";  break;
  }
  oledShow(
    "Navigating",
    "Node " + String(currentNode) + " of " + String(totalNodes),
    "> " + dirStr,
    ""
  );
}

// Show when arrived
void oledArrived(String destination) {
  if (!oledReady) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(2);
  display.setCursor(0, 0);
  display.println("  ARRIVED");

  display.drawLine(0, 25, 128, 25, SSD1306_WHITE);

  display.setTextSize(3);
  display.setCursor(50, 35);
  // wrap long names
  if (destination.length() > 8) {
    display.println(destination.substring(0, 8));
    display.setCursor(0, 40);
    display.println(destination.substring(8));
  } else {
    display.println(destination);
  }
  display.display();
}

// Show error
void oledError(String msg) {
  oledShow("!! ERROR !!", msg, "", "Check Serial");
}

// Show idle
void oledIdle() {
  oledShow("Path Guiding Robot", "", "Status: IDLE", "Waiting...");
}
