//helps to include header file for only one once at the time of compilation
#pragma once


// ── WiFi & Firebase ───────────────────────────────────────────────
#define WIFI_SSID        "Iqoo9"  
#define WIFI_PASSWORD    "12121212"
#define API_KEY          "AIzaSyCLC9FBJeIkl1xPtSH5o-lNZhevqhyXM-A"
#define DATABASE_URL     "https://pathguidedrobot-default-rtdb.firebaseio.com"

// ── IR Sensor Pins ────────────────────────────────────────────────
#define IR1 34   // Far Left
#define IR2 35   // Left
#define IR3 32   // Center
#define IR4 19   // Right
#define IR5 18   // Far Right

// ── Motor Pins ────────────────────────────────────────────────────
#define ENA 14
#define IN1 26
#define IN2 27
#define ENB 12
#define IN3 25
#define IN4 33

// ── OLED ──────────────────────────────────────────────────────────
#define I2C_SDA      21
#define I2C_SCL      22
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64
#define OLED_ADDR    0x3C

// ── LED ───────────────────────────────────────────────────────────
#define NODE_LED 2  

// ── PID Constants ─────────────────────────────────────────────────
#define KP  45.0f
#define KI   0.0f
#define KD  80.0f

// ── Speed ─────────────────────────────────────────────────────────
#define BASE_SPEED      110
#define LEFT_TRIM         0
#define RIGHT_TRIM        6
#define MIN_SPEED         0
#define MAX_SPEED       255
#define SPIN_SPEED      100

// ── Timing ────────────────────────────────────────────────────────
#define NODE_CLEAR_MS        150   // drive forward to clear a node — reduce if overshooting
#define POST_NODE_SETTLE_MS  200   // stop+settle after clearing node before PID resumes — tune if overshooting
#define START_SETTLE_MS      300   // delay after clearing start node before PID
#define VISITOR_DISPLAY_MS  2000   // ms to show visitor name on OLED

// ── Firebase ──────────────────────────────────────────────────────
#define HEARTBEAT_MS    5000   // heartbeat every 5s
#define POLL_MS         2000   // poll Firebase every 2s

// ── Node Detection ────────────────────────────────────────────────
#define NODE_THRESHOLD     4   // all sensors black = node
#define INTEGRAL_LIMIT   0f // PID integral windup clamp

// ── State Machine ─────────────────────────────────────────────────
enum RobotState {
  STATE_IDLE,
  STATE_NAVIGATING,
  STATE_ARRIVED
};