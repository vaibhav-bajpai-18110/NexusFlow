
const test = require("node:test");
const assert = require("node:assert/strict");
const Telemetry = require("../src/models/Telemetry");

test("should accept valid telemetry data", async () => {
  const telemetry = new Telemetry({
    deviceId: "device-001",
    sensorId: "sensor-001",
    timestamp: new Date(),
    metric: "temperature",
    value: 25.5,
    unit: "C"
  });

  await assert.doesNotReject(() => telemetry.validate());
});

test("should reject telemetry without deviceId", async () => {
  const telemetry = new Telemetry({
    sensorId: "sensor-001",
    timestamp: new Date(),
    metric: "temperature",
    value: 25.5,
    unit: "C"
  });

  await assert.rejects(() => telemetry.validate());
});

test("should reject telemetry without sensorId", async () => {
  const telemetry = new Telemetry({
    deviceId: "device-001",
    timestamp: new Date(),
    metric: "temperature",
    value: 25.5,
    unit: "C"
  });

  await assert.rejects(() => telemetry.validate());
});

test("should reject telemetry without metric", async () => {
  const telemetry = new Telemetry({
    deviceId: "device-001",
    sensorId: "sensor-001",
    timestamp: new Date(),
    value: 25.5,
    unit: "C"
  });

  await assert.rejects(() => telemetry.validate());
});