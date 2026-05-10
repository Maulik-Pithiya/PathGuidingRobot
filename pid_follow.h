#pragma once

// ════════════════════════════════════════════════════════════════
//  pid_follow.h — Sensor reading, PID, motor control
// ════════════════════════════════════════════════════════════════

#include "config.h"

// ── Sensor state ──────────────────────────────────────────────────
int   s[5];
int   active[5];
float lastPosition = 0;

// ── PID state ─────────────────────────────────────────────────────
float pidError   = 0;
float prevError  = 0;
float integral   = 0;
float derivative = 0;
float PIDvalue   = 0;

int sensorWeight[5] = { -2, -1, 0, 1, 2 };

// ════════════════════════════════════════════════════════════════
//  SENSOR FUNCTIONS
// ════════════════════════════════════════════════════════════════

void readSensors() {
  s[0] = digitalRead(IR1);
  s[1] = digitalRead(IR2);
  s[2] = digitalRead(IR3);
  s[3] = digitalRead(IR4);
  s[4] = digitalRead(IR5);
  for (int i = 0; i < 5; i++) active[i] = !s[i];
}

int countActive() {
  int n = 0;
  for (int i = 0; i < 5; i++) n += active[i];
  return n;
}

bool onLine() { return countActive() > 0; }
bool isNode() { return countActive() >= NODE_THRESHOLD; }

float getError() {
  float weightedSum   = 0;
  int   activeSensors = 0;
  for (int i = 0; i < 5; i++) {
    weightedSum   += sensorWeight[i] * active[i];
    activeSensors += active[i];
  }
  if (activeSensors == 0) return prevError;
  float pos = weightedSum / activeSensors;
  lastPosition = pos;
  return pos;
}

//  PID match convert into actual wheel movement

void setMotors(int leftSpeed, int rightSpeed) {
  leftSpeed  += LEFT_TRIM;
  rightSpeed += RIGHT_TRIM;

  if (leftSpeed >= 0) { digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH); }
  else                { digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);  leftSpeed  = -leftSpeed; }

  if (rightSpeed >= 0) { digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);  }
  else                 { digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH); rightSpeed = -rightSpeed; }

  ledcWrite(ENA, constrain(leftSpeed,  MIN_SPEED, MAX_SPEED));
  ledcWrite(ENB, constrain(rightSpeed, MIN_SPEED, MAX_SPEED));
}

void stopMotors() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
  ledcWrite(ENA, 0);
  ledcWrite(ENB, 0);
}

void driveForward(int ms) {
  setMotors(BASE_SPEED, BASE_SPEED);
  delay(ms);
}

void resetPID() {
  pidError = 0; prevError = 0;
  integral = 0; derivative = 0; PIDvalue = 0;
}

// ════════════════════════════════════════════════════════════════
//  PID FOLLOW
//  Simple blocking delay(10) — same as your tested working code.
//  No rate limiter — runs every call, motors always updated.
// ════════════════════════════════════════════════════════════════

void pidFollow() {
  pidError   = getError();
  integral   = integral + pidError;
  derivative = pidError - prevError;
  PIDvalue   = (KP * pidError) + (KI * integral) + (KD * derivative);
  prevError  = pidError;
  setMotors(BASE_SPEED + PIDvalue, BASE_SPEED - PIDvalue);
  delay(10);
}

// ════════════════════════════════════════════════════════════════
//  SPIN TURNS — same as your tested working version
// ════════════════════════════════════════════════════════════════

void spinSearch() {
  resetPID();
  while (true) {
    readSensors();
    if (onLine() && !isNode()) return;
    if (lastPosition > 0) setMotors( SPIN_SPEED, -SPIN_SPEED);
    else                  setMotors(-SPIN_SPEED,  SPIN_SPEED);
    delay(10);
  }
}

void spinLeft() {
  resetPID();
  // Phase 1 — spin until fully off the node (all white)
  while (true) {
    readSensors();
    if (!onLine()) break;
    setMotors(-SPIN_SPEED, SPIN_SPEED);
    delay(10);
  }
  // Phase 2 — spin until clean single line found
  while (true) {
    readSensors();
    if (onLine() && !isNode()) return;
    setMotors(-SPIN_SPEED, SPIN_SPEED);
    delay(10);
  }
}

void spinRight() {
  resetPID();
  // Phase 1 — spin until fully off the node (all white)
  while (true) {
    readSensors();
    if (!onLine()) break;
    setMotors(SPIN_SPEED, -SPIN_SPEED);
    delay(10);
  }
  // Phase 2 — spin until clean single line found
  while (true) {
    readSensors();
    if (onLine() && !isNode()) return;
    setMotors(SPIN_SPEED, -SPIN_SPEED);
    delay(10);
  }
}