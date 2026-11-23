
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Device = require("../src/models/Device");

const validDevice = {
  deviceId: "device-001",
  name: "Temperature Sensor",
  deviceType: "Temperature",
  owner: new mongoose.Types.ObjectId()
};

test("should accept valid device data", async () => {
  const device = new Device(validDevice);

  await assert.doesNotReject(() => device.validate());
});

test("should reject device without deviceId", async () => {
  const device = new Device({
    name: "Temperature Sensor",
    owner: validDevice.owner
  });

  await assert.rejects(() => device.validate());
});

test("should reject device without name", async () => {
  const device = new Device({
    deviceId: "device-001",
    owner: validDevice.owner
  });

  await assert.rejects(() => device.validate());
});

test("should reject device without owner", async () => {
  const device = new Device({
    deviceId: "device-001",
    name: "Temperature Sensor"
  });

  await assert.rejects(() => device.validate());
});

test("should reject invalid device status", async () => {
  const device = new Device({
    ...validDevice,
    status: "active"
  });

  await assert.rejects(() => device.validate());
});

test("should reject latitude outside valid range", async () => {
  const device = new Device({
    ...validDevice,
    location: {
      latitude: 100,
      longitude: 75
    }
  });

  await assert.rejects(() => device.validate());
});

test("should reject longitude outside valid range", async () => {
  const device = new Device({
    ...validDevice,
    location: {
      latitude: 30,
      longitude: 200
    }
  });

  await assert.rejects(() => device.validate());
});

test("should default device status to unknown", () => {
  const device = new Device(validDevice);

  assert.equal(device.status, "unknown");
});

test("should trim device name", () => {
  const device = new Device({
    ...validDevice,
    name: "  Temperature Sensor  "
  });

  assert.equal(device.name, "Temperature Sensor");
});
