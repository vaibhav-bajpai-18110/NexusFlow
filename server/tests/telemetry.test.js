
const test = require("node:test");
const assert = require("node:assert/strict");
const Telemetry = require("../src/models/Telemetry");

// 1. Accept valid telemetry data
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

// 2. Reject telemetry without deviceId
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

// 3. Reject telemetry without sensorId
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

// 4. Reject telemetry without metric
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

// 5. Reject telemetry without value
test("should reject telemetry without value", async () => {
  const telemetry = new Telemetry({
    deviceId: "device-001",
    sensorId: "sensor-001",
    timestamp: new Date(),
    metric: "temperature",
    unit: "C"
  });

  await assert.rejects(() => telemetry.validate());
});

// 6. Reject telemetry without unit
test("should reject telemetry without unit", async () => {
  const telemetry = new Telemetry({
    deviceId: "device-001",
    sensorId: "sensor-001",
    timestamp: new Date(),
    metric: "temperature",
    value: 25.5
  });

  await assert.rejects(() => telemetry.validate());
});

// 7. Reject invalid timestamp
test("should reject invalid timestamp", async () => {
  const telemetry = new Telemetry({
    deviceId: "device-001",
    sensorId: "sensor-001",
    timestamp: "invalid-date",
    metric: "temperature",
    value: 25.5,
    unit: "C"
  });

  await assert.rejects(() => telemetry.validate());
});

// 8. Reject empty metric
test("should reject empty metric", async () => {
  const telemetry = new Telemetry({
    deviceId: "device-001",
    sensorId: "sensor-001",
    timestamp: new Date(),
    metric: "   ",
    value: 25.5,
    unit: "C"
  });

  await assert.rejects(() => telemetry.validate());
});

// 9. Reject non-finite telemetry value
test("should reject non-finite telemetry value", async () => {
  const telemetry = new Telemetry({
    deviceId: "device-001",
    sensorId: "sensor-001",
    timestamp: new Date(),
    metric: "temperature",
    value: Infinity,
    unit: "C"
  });

  await assert.rejects(() => telemetry.validate());
});

// 10. Trim deviceId and sensorId
test("should trim deviceId and sensorId", async () => {
  const telemetry = new Telemetry({
    deviceId: " device-001 ",
    sensorId: " sensor-001 ",
    timestamp: new Date(),
    metric: "temperature",
    value: 25.5,
    unit: "C"
  });

  await telemetry.validate();

  assert.equal(telemetry.deviceId, "device-001");
  assert.equal(telemetry.sensorId, "sensor-001");
});
