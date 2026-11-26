const Telemetry = require("../models/Telemetry");
// Save a new telemetry record.
// Mongoose validates the record before saving it.
const saveTelemetry = async (telemetryData) => {
  return Telemetry.create(telemetryData);
};
// Get telemetry records for a device, newest first.
const getTelemetryByDevice = async (deviceId) => {
  if (typeof deviceId !== "string" || !deviceId.trim()) {
    throw new Error("A valid deviceId is required");
  }
  return Telemetry.find({ deviceId: deviceId.trim() })
    .sort({ timestamp: -1 });
};
module.exports = {
  saveTelemetry,
  getTelemetryByDevice
};
