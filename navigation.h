#pragma once

// ════════════════════════════════════════════════════════════════
//  navigation.h — Start node exit + node handler
// ════════════════════════════════════════════════════════════════

#include "config.h"
#include "pid_follow.h"
#include "oled_display.h"
#include "firebase_mgr.h"

// ════════════════════════════════════════════════════════════════
//  CLEAR START NODE (Node-0)
//
//  Robot is ON the start node. directions[0] is always 'S'.
//  Execute node-clear logic (same as handleNode 'S' case) to
//  drive the robot off node-0, then hand over to PID following.
//  After this, the next detected node will use directions[1].
// ════════════════════════════════════════════════════════════════

void clearStartNode() {
  Serial.println("Node #0 — clearing start node");
  Serial.print("Command: "); Serial.println(directions[0]);

  digitalWrite(NODE_LED, HIGH);

  oledNavigating(0, totalSteps, directions[0]);
  queueStatus("running");

  // Drive forward to physically leave the start node
  stopMotors(); delay(100);
  driveForward(NODE_CLEAR_MS);

  // Keep driving until sensors see a clean line (not still on the node)
  // This ensures the robot is fully off the node before PID takes over
  while (true) {
    readSensors();
    if (onLine() && !isNode()) break;   // found clean single line
    if (!onLine()) break;               // overshot — spinSearch will fix it
    setMotors(BASE_SPEED, BASE_SPEED);
    delay(10);
  }

  // Brief pause to let the robot settle before PID kicks in
  stopMotors();
  delay(START_SETTLE_MS);

  digitalWrite(NODE_LED, LOW);
  resetPID();

  Serial.println("Start node cleared — PID takes over");
}

// ════════════════════════════════════════════════════════════════
//  NODE HANDLER
//  Called when isNode() is true during navigation
//  Returns true if destination reached (cmd == 'X')
// ════════════════════════════════════════════════════════════════

bool handleNode() {
  commandIndex++;
  digitalWrite(NODE_LED, HIGH);

  Serial.print("NODE #"); Serial.print(commandIndex);
  Serial.print(" / "); Serial.println(totalSteps);

  // No command defined for this node — go straight
  if (commandIndex >= totalSteps) {
    Serial.println("No command — going straight");
    stopMotors(); delay(100);
    driveForward(NODE_CLEAR_MS);
    digitalWrite(NODE_LED, LOW);
    resetPID();
    return false;
  }

  char cmd = directions[commandIndex];
  Serial.print("Command: "); Serial.println(cmd);

  oledNavigating(commandIndex, totalSteps, cmd);

  if (cmd == 'X') { queueStatus("reached"); flushStatus(); }
  else            queueStatus("running");

  switch (cmd) {

    case 'S':
      stopMotors(); delay(100);
      driveForward(NODE_CLEAR_MS);
      stopMotors(); delay(POST_NODE_SETTLE_MS);
      break;

    case 'L':
      stopMotors(); delay(100);
      driveForward(NODE_CLEAR_MS);
      spinLeft();
      stopMotors(); delay(POST_NODE_SETTLE_MS);
      resetPID();
      break;

    case 'R':
      stopMotors(); delay(100);
      driveForward(NODE_CLEAR_MS);
      spinRight();
      stopMotors(); delay(POST_NODE_SETTLE_MS);
      resetPID();
      break;

    case 'X':
      // Hard brake immediately — kill momentum from PID
      // setMotors(-BASE_SPEED, -BASE_SPEED);
      // delay(60);
      stopMotors();
      Serial.println("DESTINATION REACHED");
      digitalWrite(NODE_LED, HIGH);
      oledArrived(toNodeName);
      resetPID();
      return true;

    default:
      Serial.println("Unknown — going straight");
      stopMotors(); delay(100);
      driveForward(NODE_CLEAR_MS);
      break;
  }

  digitalWrite(NODE_LED, LOW);
  resetPID();
  return false;
}