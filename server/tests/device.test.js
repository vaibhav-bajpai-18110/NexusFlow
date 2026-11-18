const test = require("node:test");
const assert = require("node:assert/strict");
const Device = require("../src/models/Device");
test("accepts valid device data", async () => {
  const device = new Device({
    deviceId: "device-001",
    deviceName: "Temperature Sensor",
    deviceType: "sensor"
  });
  await assert.doesNotReject(device.validate());
  assert.equal(device.status, "unknown");
  assert.ok(device.createdAt instanceof Date);
});
test("rejects device without deviceId", async () => {
  const device = new Device({
    deviceName: "Sensor",
    deviceType: "sensor"
  });
  await assert.rejects(device.validate(), /deviceId/);
});
test("rejects device without deviceName", async () => {
  const device = new Device({
    deviceId: "device-002",
    deviceType: "sensor"
  });
  await assert.rejects(device.validate(), /deviceName/);
});
test("rejects invalid device status", async () => {
  const device = new Device({
    deviceId: "device-003",
    deviceName: "Sensor",
    deviceType: "sensor",
    status: "broken"
  });
  await assert.rejects(device.validate(), /status/);
});
test("deviceId has a unique index", () => {
  const indexes = Device.schema.indexes();
  assert.ok(indexes.some(([fields, options]) =>
    fields.deviceId === 1 && options.unique === true
  ));
});
