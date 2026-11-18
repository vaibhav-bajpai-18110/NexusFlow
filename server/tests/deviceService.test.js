const test = require("node:test");
const assert = require("node:assert/strict");
const Device = require("../src/models/Device");
const service = require("../src/services/deviceService");
test("createDevice saves and returns a device", async () => {
  const original = Device.create;
  Device.create = async (data) => ({ ...data, _id: "test-id" });
  try {
    const result = await service.createDevice({
      deviceId: "device-101",
      deviceName: "Test Sensor",
      deviceType: "sensor"
    });
    assert.equal(result.deviceId, "device-101");
    assert.equal(result._id, "test-id");
  } finally {
    Device.create = original;
  }
});
test("createDevice handles duplicate device IDs", async () => {
  const original = Device.create;
  Device.create = async () => {
    const error = new Error("Duplicate key");
    error.code = 11000;
    throw error;
  };
  try {
    await assert.rejects(
      service.createDevice({
        deviceId: "device-101",
        deviceName: "Duplicate Sensor",
        deviceType: "sensor"
      }),
      (error) => error.message === "Device ID already exists" &&
        error.statusCode === 409
    );
  } finally {
    Device.create = original;
  }
});
test("getDeviceById retrieves a device", async () => {
  const original = Device.findOne;
  Device.findOne = async (query) => ({
    deviceId: query.deviceId,
    deviceName: "Found Sensor"
  });
  try {
    const result = await service.getDeviceById("device-101");
    assert.equal(result.deviceId, "device-101");
  } finally {
    Device.findOne = original;
  }
});
test("getAllDevices retrieves devices", async () => {
  const original = Device.find;
  Device.find = () => ({
    sort: async () => [{ deviceId: "device-101" }]
  });
  try {
    const result = await service.getAllDevices();
    assert.equal(result.length, 1);
    assert.equal(result[0].deviceId, "device-101");
  } finally {
    Device.find = original;
  }
});
test("findDevicesByType filters by device type", async () => {
  const original = Device.find;
  Device.find = async (query) => [{
    deviceId: "device-101",
    deviceType: query.deviceType
  }];
  try {
    const result = await service.findDevicesByType("sensor");
    assert.equal(result.length, 1);
    assert.equal(result[0].deviceId, "device-101");
  } finally {
    Device.find = original;
  }
});
