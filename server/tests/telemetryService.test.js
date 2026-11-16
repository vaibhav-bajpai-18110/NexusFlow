
const test = require("node:test");
const assert = require("node:assert/strict");

const Telemetry = require("../src/models/Telemetry");
const {
  saveTelemetry,
  getTelemetryByDevice
} = require("../src/services/telemetryService");

test("should save valid telemetry through the service", async (t) => {
  const originalCreate = Telemetry.create;

  Telemetry.create = async (data) => {
    const record = new Telemetry(data);
    await record.validate();
    return record;
  };

  t.after(() => {
    Telemetry.create = originalCreate;
  });

  const result = await saveTelemetry({
    deviceId: "device-001",
    sensorId: "sensor-001",
    timestamp: new Date(),
    metric: "temperature",
    value: 25.5,
    unit: "C"
  });

  assert.equal(result.deviceId, "device-001");
  assert.equal(result.sensorId, "sensor-001");
});

test("should reject invalid telemetry through the service", async (t) => {
  const originalCreate = Telemetry.create;

  Telemetry.create = async (data) => {
    const record = new Telemetry(data);
    await record.validate();
    return record;
  };

  t.after(() => {
    Telemetry.create = originalCreate;
  });

  await assert.rejects(() =>
    saveTelemetry({
      deviceId: "device-001",
      timestamp: new Date(),
      metric: "temperature",
      value: 25.5,
      unit: "C"
    })
  );
});

test("should retrieve telemetry for a device", async (t) => {
  const originalFind = Telemetry.find;
  const sampleRecords = [{ deviceId: "device-001", value: 25.5 }];

  Telemetry.find = (filter) => {
    assert.deepEqual(filter, { deviceId: "device-001" });

    return {
      sort: (sortOrder) => {
        assert.deepEqual(sortOrder, { timestamp: -1 });
        return Promise.resolve(sampleRecords);
      }
    };
  };

  t.after(() => {
    Telemetry.find = originalFind;
  });

  const result = await getTelemetryByDevice("device-001");

  assert.deepEqual(result, sampleRecords);
});

test("should reject an invalid deviceId", async () => {
  await assert.rejects(
    () => getTelemetryByDevice(""),
    /valid deviceId is required/
  );
});
