const test = require("node:test");
const assert = require("node:assert/strict");
const Telemetry = require("../src/models/Telemetry");
const {
  saveTelemetry,
  getTelemetryByDevice
} = require("../src/services/telemetryService");
const validTelemetry = {
  deviceId: "device-001",
  sensorId: "sensor-001",
  timestamp: new Date(),
  metric: "temperature",
  value: 25.5,
  unit: "C"
};
test("should save valid telemetry data", async (t) => {
  const originalCreate = Telemetry.create;
  Telemetry.create = async (data) => {
    const telemetry = new Telemetry(data);
    await telemetry.validate();
    return telemetry;
  };
  t.after(() => {
    Telemetry.create = originalCreate;
  });
  const result = await saveTelemetry(validTelemetry);
  assert.equal(result.deviceId, "device-001");
  assert.equal(result.metric, "temperature");
});
test("should reject invalid telemetry data", async (t) => {
  const originalCreate = Telemetry.create;
  Telemetry.create = async (data) => {
    const telemetry = new Telemetry(data);
    await telemetry.validate();
    return telemetry;
  };
  t.after(() => {
    Telemetry.create = originalCreate;
  });
  await assert.rejects(
    saveTelemetry({ ...validTelemetry, deviceId: "" }),
    { name: "ValidationError" }
  );
});
test("should propagate database errors when saving telemetry", async (t) => {
  const originalCreate = Telemetry.create;
  const databaseError = new Error("Database unavailable");
  Telemetry.create = async () => {
    throw databaseError;
  };
  t.after(() => {
    Telemetry.create = originalCreate;
  });
  await assert.rejects(
    saveTelemetry(validTelemetry),
    (error) => error === databaseError
  );
});
test("should retrieve telemetry for a device in newest-first order", async (t) => {
  const originalFind = Telemetry.find;
  const records = [{ deviceId: "device-001" }];
  let receivedQuery;
  let receivedSort;
  Telemetry.find = (query) => {
    receivedQuery = query;
    return {
      sort: async (sortOrder) => {
        receivedSort = sortOrder;
        return records;
      }
    };
  };
  t.after(() => {
    Telemetry.find = originalFind;
  });
  const result = await getTelemetryByDevice("device-001");
  assert.deepEqual(receivedQuery, { deviceId: "device-001" });
  assert.deepEqual(receivedSort, { timestamp: -1 });
  assert.deepEqual(result, records);
});
test("should trim deviceId before retrieving telemetry", async (t) => {
  const originalFind = Telemetry.find;
  let receivedQuery;
  Telemetry.find = (query) => {
    receivedQuery = query;
    return {
      sort: async () => []
    };
  };
  t.after(() => {
    Telemetry.find = originalFind;
  });
  await getTelemetryByDevice("  device-001  ");
  assert.deepEqual(receivedQuery, { deviceId: "device-001" });
});
test("should reject missing, empty, whitespace, and non-string deviceIds", async () => {
  const invalidIds = [undefined, null, "", "   ", 123];
  for (const deviceId of invalidIds) {
    await assert.rejects(
      getTelemetryByDevice(deviceId),
      {
        message: "A valid deviceId is required"
      }
    );
  }
});
test("should propagate database errors when retrieving telemetry", async (t) => {
  const originalFind = Telemetry.find;
  const databaseError = new Error("Database query failed");
  Telemetry.find = () => ({
    sort: async () => {
      throw databaseError;
    }
  });
  t.after(() => {
    Telemetry.find = originalFind;
  });
  await assert.rejects(
    getTelemetryByDevice("device-001"),
    (error) => error === databaseError
  );
});
